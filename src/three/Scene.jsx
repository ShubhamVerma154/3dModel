import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import DevLaptop from './DevLaptop'
import { state, hud, KEYFRAMES } from '../store'

const { damp, lerp, clamp } = THREE.MathUtils
const smooth = (t) => t * t * (3 - 2 * t)

/* ------------------------------------------------------------------ */
/*  Scroll anchors: every section's centre maps to a drone keyframe.   */
/* ------------------------------------------------------------------ */
function useAnchors() {
  const anchors = useRef([])
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight
      anchors.current = [...document.querySelectorAll('[data-drone]')].map((el) => {
        const r = el.getBoundingClientRect()
        const top = r.top + window.scrollY
        // Drone arrives at its pose once the section's top is 25% down the
        // viewport, so it's in place while the section is being read.
        return { y: Math.max(0, top - vh * 0.25), kf: KEYFRAMES[el.dataset.drone] }
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return anchors
}

function sample(anchors, y) {
  const a = anchors
  if (!a.length) return { ...KEYFRAMES.hero, t: 0, i: 0 }
  if (y <= a[0].y) return a[0].kf
  if (y >= a[a.length - 1].y) return a[a.length - 1].kf
  let i = 0
  while (i < a.length - 1 && y > a[i + 1].y) i++
  const A = a[i].kf
  const B = a[i + 1].kf
  // Hold each pose a little at the anchor, then travel
  const raw = (y - a[i].y) / (a[i + 1].y - a[i].y)
  const t = smooth(clamp((raw - 0.35) / 0.65, 0, 1))
  return {
    pos: A.pos.map((v, k) => lerp(v, B.pos[k], t)),
    rot: A.rot.map((v, k) => lerp(v, B.rot[k], t)),
    s: lerp(A.s, B.s, t),
    beam: lerp(A.beam, B.beam, t),
    open: lerp(A.open, B.open, t),
    spread: lerp(A.spread, B.spread, t),
    screen: t < 0.5 ? A.screen : B.screen,
  }
}

/* ------------------------------------------------------------------ */
/*  The rig: scroll pose + mouse follow + velocity banking + hover bob */
/* ------------------------------------------------------------------ */
function DroneRig() {
  const outer = useRef() // position + yaw
  const inner = useRef() // pitch + roll
  const beamRef = useRef(0)
  const rig = useRef({ open: 0, spread: 0, screen: 'code' })
  const anchors = useAnchors()
  const { size } = useThree()

  useFrame((s, dt) => {
    const o = outer.current
    const n = inner.current
    if (!o) return
    dt = Math.min(dt, 0.05)
    const mobile = size.width < 768
    const t = s.clock.elapsedTime
    const m = state.mouse

    let target = sample(anchors.current, state.scrollY)
    if (!state.ready) target = { pos: [0, 4.5, -3], rot: [0.9, -2.5, 0], s: 0.6, beam: 0, open: 0, spread: 0, screen: 'code' }

    const xMul = mobile ? 0.08 : 1
    const sMul = mobile ? 0.55 : 1
    const yOff = mobile && target.pos[0] !== 0 ? 0.9 : 0

    // Position — follows the cursor slightly
    const tx = target.pos[0] * xMul + m.x * 0.35
    const ty = target.pos[1] + yOff + m.y * 0.2 + Math.sin(t * 1.6) * 0.07
    const tz = target.pos[2]
    o.position.x = damp(o.position.x, tx, 3, dt)
    o.position.y = damp(o.position.y, ty, 3, dt)
    o.position.z = damp(o.position.z, tz, 3, dt)

    // Yaw — scroll pose + look toward cursor
    o.rotation.y = damp(o.rotation.y, target.rot[1] + m.x * 0.55, 3.5, dt)

    // Pitch / roll — pose + cursor + scroll-velocity banking + idle wobble
    const v = clamp(state.velocity * 0.012, -0.4, 0.4)
    const pitch = target.rot[0] - m.y * 0.35 + v + Math.sin(t * 1.1) * 0.03
    const roll = target.rot[2] - m.x * 0.25 + Math.cos(t * 0.9) * 0.03
    n.rotation.x = damp(n.rotation.x, pitch, 4, dt)
    n.rotation.z = damp(n.rotation.z, roll, 4, dt)

    const sc = damp(o.scale.x, target.s * sMul, 3, dt)
    o.scale.setScalar(sc)

    beamRef.current = damp(beamRef.current, target.beam, 4, dt)
    state.beam = beamRef.current
    rig.current.open = damp(rig.current.open, target.open, 2.2, dt)
    rig.current.spread = damp(rig.current.spread, target.spread * (mobile ? 0.7 : 1), 2.5, dt)
    rig.current.screen = target.screen
    state.dronePos.x = o.position.x
    state.dronePos.y = o.position.y
    state.dronePos.z = o.position.z

    // Write telemetry to the HUD without React renders
    if (hud.x) {
      hud.x.textContent = o.position.x.toFixed(2)
      hud.y.textContent = (o.position.y + 3).toFixed(2)
      hud.z.textContent = o.position.z.toFixed(2)
      hud.hdg.textContent = String(Math.round((((-o.rotation.y * 180) / Math.PI) % 360 + 360) % 360)).padStart(3, '0')
      hud.spd.textContent = Math.abs(state.velocity).toFixed(1)
    }
  })

  return (
    <group ref={outer} position={[0, 4.5, -3]} scale={0.6}>
      <group ref={inner} scale={0.8}>
        <DevLaptop rig={rig} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Ground point-grid that lights up under the scan beam               */
/* ------------------------------------------------------------------ */
function ScanGrid() {
  const mat = useRef()
  const geo = useMemo(() => {
    const pts = []
    const N = 90
    const step = 0.16
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = (i - N / 2) * step
        const z = (j - N / 2) * step
        // gentle "terrain" so the scan reads as a surface
        const y = Math.sin(x * 0.8) * 0.12 + Math.cos(z * 0.6) * 0.12 + Math.sin(x * z * 0.15) * 0.08
        pts.push(x, y, z)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  const uniforms = useMemo(
    () => ({
      uCenter: { value: new THREE.Vector2() },
      uBeam: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#c6ff3d') },
    }),
    []
  )

  useFrame((s) => {
    uniforms.uCenter.value.set(state.dronePos.x, state.dronePos.z + 0.2)
    uniforms.uBeam.value = state.beam
    uniforms.uTime.value = s.clock.elapsedTime
  })

  return (
    <points geometry={geo} position={[0, -2.6, -1]}>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform vec2 uCenter; uniform float uBeam; uniform float uTime;
          varying float vGlow; varying float vFade;
          void main() {
            vec3 p = position;
            float d = distance(p.xz, uCenter);
            float wave = sin(d * 6.0 - uTime * 4.0) * 0.5 + 0.5;
            vGlow = smoothstep(1.6, 0.0, d) * uBeam * (0.55 + wave * 0.45);
            vFade = smoothstep(7.0, 1.0, length(p.xz));
            p.y += vGlow * 0.12;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.4 + vGlow * 4.0) * (6.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor; varying float vGlow; varying float vFade;
          void main() {
            float c = 1.0 - length(gl_PointCoord - 0.5) * 2.0;
            if (c < 0.0) discard;
            vec3 col = mix(vec3(0.35), uColor, clamp(vGlow * 1.5, 0.0, 1.0));
            gl_FragColor = vec4(col, c * vFade * (0.12 + vGlow));
          }`}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  Floating dust particles with scroll parallax                       */
/* ------------------------------------------------------------------ */
function Dust() {
  const ref = useRef()
  const geo = useMemo(() => {
    const n = 1400
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((s, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * 0.015
    ref.current.position.y = damp(ref.current.position.y, (state.scrollY * 0.0012) % 10, 4, dt)
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.018} color="#9aa3ad" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  )
}

/* Camera drifts with the mouse for depth */
function CameraRig() {
  useFrame(({ camera }, dt) => {
    camera.position.x = damp(camera.position.x, state.mouse.x * 0.3, 2, dt)
    camera.position.y = damp(camera.position.y, state.mouse.y * 0.2, 2, dt)
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function Scene() {
  return (
    <div className="canvas-wrap" aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 7], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <fog attach="fog" args={['#07080a', 7, 18]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} />
        <directionalLight position={[-4, -1, -3]} intensity={3} color="#c6ff3d" />
        <pointLight position={[0, -2, 3]} intensity={6} distance={8} color="#5fd4ff" />
        <Environment resolution={256}>
          <Lightformer intensity={4} position={[0, 5, -2]} scale={[10, 1, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={2} position={[-5, 1, 1]} scale={[1, 6, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={2} position={[5, 1, 1]} scale={[1, 6, 1]} rotation-y={-Math.PI / 2} color="#c6ff3d" />
          <Lightformer intensity={1} position={[0, 0, 6]} scale={[6, 2, 1]} />
        </Environment>
        <CameraRig />
        <Dust />
        <ScanGrid />
        <DroneRig />
        <ContactShadows position={[0, -2.7, 0]} opacity={0.35} scale={12} blur={2.6} far={4} />
      </Canvas>
    </div>
  )
}
