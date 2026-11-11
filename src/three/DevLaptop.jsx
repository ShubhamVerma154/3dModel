import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { state } from '../store'
import { ACCENT, drawCode, drawSite, drawChart, CARDS } from './screens'

const { damp } = THREE.MathUtils

function useCanvasTexture(w, h, paint) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (paint) paint(g, w, h)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { tex, g, c }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/* Floating UI card that always faces the camera */
function FloatingCard({ kind, base, size = [1, 0.62], phase = 0, rig }) {
  const ref = useRef()
  const { tex } = useCanvasTexture(512, Math.round(512 * (size[1] / size[0])), CARDS[kind])
  // repaint once fonts are ready so canvas text uses the web fonts
  useMemo(() => {
    document.fonts?.ready.then(() => {
      const c = tex.image
      CARDS[kind](c.getContext('2d'), c.width, c.height)
      tex.needsUpdate = true
    })
  }, [tex, kind])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const sp = rig.current.spread
    const g = ref.current
    if (!g) return
    g.position.x = damp(g.position.x, base[0] * sp, 4, dt)
    g.position.y = damp(g.position.y, base[1] * sp + Math.sin(t * 1.2 + phase) * 0.08, 4, dt)
    g.position.z = damp(g.position.z, base[2] * sp, 4, dt)
    const vis = THREE.MathUtils.clamp((sp - 0.25) * 2, 0, 1)
    g.scale.setScalar(damp(g.scale.x, 0.001 + vis, 5, dt))
  })

  return (
    <group ref={ref} scale={0.001}>
      <Billboard scale={1.25}>
        <mesh>
          <planeGeometry args={size} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  )
}

/* Phone showing the responsive version of the site */
function Phone({ base, rig }) {
  const ref = useRef()
  const scr = useCanvasTexture(300, 620)
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const sp = rig.current.spread
    const g = ref.current
    if (!g) return
    g.position.set(base[0] * sp, base[1] * sp + Math.sin(t * 1.4 + 2) * 0.09, base[2] * sp)
    g.rotation.y = Math.sin(t * 0.6) * 0.25 + 0.35
    g.rotation.z = -0.12
    const vis = THREE.MathUtils.clamp((sp - 0.25) * 2, 0, 1)
    g.scale.setScalar(damp(g.scale.x, 0.001 + vis, 5, dt))
    if (s.clock.elapsedTime % 0.1 < dt) {
      drawSite(scr.g, 300, 620, (t * 0.5) % 4, true)
      scr.tex.needsUpdate = true
    }
  })
  return (
    <group ref={ref} scale={0.001}>
      <RoundedBox args={[0.44, 0.88, 0.04]} radius={0.05} smoothness={4}>
        <meshPhysicalMaterial color="#15181d" metalness={0.7} roughness={0.25} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[0.39, 0.8]} />
        <meshBasicMaterial map={scr.tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Procedural developer laptop with a live screen + floating marketing UI.
 * Screen faces +Z when open. Hinge at the back edge of the base.
 */
export default function DevLaptop({ rig }) {
  const lid = useRef()
  const glow = useRef()
  const screen = useCanvasTexture(1024, 640)
  const mode = useRef({ name: '', start: 0 })

  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: '#2a2e35', metalness: 0.9, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      bodyLight: new THREE.MeshPhysicalMaterial({ color: '#3a3f47', metalness: 0.9, roughness: 0.28, clearcoat: 0.8 }),
      key: new THREE.MeshStandardMaterial({ color: '#111317', roughness: 0.7, metalness: 0.1 }),
      bezel: new THREE.MeshStandardMaterial({ color: '#07080a', roughness: 0.4, metalness: 0.2 }),
      pad: new THREE.MeshPhysicalMaterial({ color: '#30353d', metalness: 0.6, roughness: 0.2, clearcoat: 1 }),
      accent: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.8, toneMapped: false }),
      logo: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.9, toneMapped: false }),
    }),
    []
  )

  // keyboard: instanced keys
  const keys = useMemo(() => {
    const arr = []
    const cols = 14
    const rows = 5
    const kw = 0.13
    const gap = 0.022
    const totalW = cols * kw + (cols - 1) * gap
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        // space bar row
        if (r === rows - 1 && c > 3 && c < 10) {
          if (c === 4) arr.push({ x: -totalW / 2 + 4 * (kw + gap) + (6 * (kw + gap) - gap) / 2, z: -0.7 + r * (kw + gap), w: 6 * (kw + gap) - gap })
          continue
        }
        arr.push({ x: -totalW / 2 + c * (kw + gap) + kw / 2, z: -0.7 + r * (kw + gap), w: kw })
      }
    return arr
  }, [])
  const keyRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const r = rig.current

    // Lid hinge: closed = +PI/2 (flat on the keyboard), open = -0.24 (tilted back)
    if (lid.current) lid.current.rotation.x = damp(lid.current.rotation.x, THREE.MathUtils.lerp(Math.PI / 2, -0.24, r.open), 3.2, dt)

    // Keys: idle "typing" ripple, faster with scroll velocity
    if (keyRef.current) {
      const typing = 6 + Math.min(Math.abs(state.velocity) * 0.5, 20)
      keys.forEach((k, i) => {
        const press = Math.max(0, Math.sin(t * typing + i * 2.399) - 0.92) * 0.012 / 0.08
        dummy.position.set(k.x, 0.052 - press, k.z)
        dummy.scale.set(k.w, 1, 0.13)
        dummy.updateMatrix()
        keyRef.current.setMatrixAt(i, dummy.matrix)
      })
      keyRef.current.instanceMatrix.needsUpdate = true
    }

    // Screen content follows the section; restart its animation on change
    if (mode.current.name !== r.screen) mode.current = { name: r.screen, start: t }
    if (Math.floor(t * 30) !== Math.floor((t - dt) * 30)) {
      const lt = t - mode.current.start
      const W = 1024
      const H = 640
      if (r.screen === 'site') drawSite(screen.g, W, H, lt)
      else if (r.screen === 'chart') drawChart(screen.g, W, H, lt)
      else drawCode(screen.g, W, H, lt)
      screen.tex.needsUpdate = true
    }

    if (glow.current) glow.current.intensity = 2.2 * r.open
  })

  return (
    <group position={[0, -0.35, 0.1]}>
      {/* ---------- Base ---------- */}
      <RoundedBox args={[2.5, 0.08, 1.7]} radius={0.035} smoothness={4} material={mats.body} />
      {/* keyboard well */}
      <mesh position={[0, 0.041, -0.4]} rotation={[-Math.PI / 2, 0, 0]} material={mats.bezel}>
        <planeGeometry args={[2.28, 0.8]} />
      </mesh>
      <instancedMesh ref={keyRef} args={[null, null, keys.length]} material={mats.key}>
        <boxGeometry args={[1, 0.02, 1]} />
      </instancedMesh>
      {/* trackpad */}
      <RoundedBox args={[0.9, 0.006, 0.52]} radius={0.003} position={[0, 0.042, 0.42]} material={mats.pad} />
      {/* front lip accent + status LED */}
      <mesh position={[0, 0.0, 0.851]} material={mats.accent}>
        <boxGeometry args={[0.5, 0.008, 0.004]} />
      </mesh>
      {/* ports */}
      {[-0.2, 0, 0.2].map((z) => (
        <mesh key={z} position={[-1.251, 0, z]} material={mats.bezel}>
          <boxGeometry args={[0.004, 0.025, 0.1]} />
        </mesh>
      ))}

      {/* ---------- Lid (hinged at back edge) ---------- */}
      <group ref={lid} position={[0, 0.04, -0.84]} rotation={[Math.PI / 2, 0, 0]}>
        <RoundedBox args={[2.5, 1.6, 0.05]} radius={0.035} smoothness={4} position={[0, 0.8, -0.01]} material={mats.bodyLight} />
        {/* bezel + screen */}
        <mesh position={[0, 0.8, 0.0165]} material={mats.bezel}>
          <planeGeometry args={[2.42, 1.52]} />
        </mesh>
        <mesh position={[0, 0.82, 0.018]}>
          <planeGeometry args={[2.3, 1.4375]} />
          <meshBasicMaterial map={screen.tex} toneMapped={false} />
        </mesh>
        {/* webcam */}
        <mesh position={[0, 1.565, 0.018]} material={mats.accent}>
          <circleGeometry args={[0.012, 16]} />
        </mesh>
        {/* back-of-lid logo ring */}
        <mesh position={[0, 0.8, -0.037]} material={mats.logo}>
          <torusGeometry args={[0.14, 0.012, 12, 48]} />
        </mesh>
        <mesh position={[0, 0.8, -0.037]} rotation={[0, Math.PI, 0]} material={mats.logo}>
          <circleGeometry args={[0.035, 24]} />
        </mesh>
        {/* screen light spill */}
        <pointLight ref={glow} color="#cfe9ff" intensity={2} distance={3} position={[0, 0.8, 0.6]} />
      </group>

      {/* ---------- Floating marketing / dev UI ---------- */}
      <FloatingCard rig={rig} kind="code" base={[-1.75, 1.45, 0.2]} size={[0.8, 0.5]} phase={0} />
      <FloatingCard rig={rig} kind="seo" base={[1.75, 1.55, 0]} size={[1.0, 0.45]} phase={1.3} />
      <FloatingCard rig={rig} kind="speed" base={[1.95, 0.35, 0.5]} size={[0.6, 0.6]} phase={2.1} />
      <FloatingCard rig={rig} kind="ads" base={[-1.9, 0.2, 0.7]} size={[0.9, 0.42]} phase={3.4} />
      <FloatingCard rig={rig} kind="growth" base={[0.2, 2.25, -0.4]} size={[0.85, 0.45]} phase={4.2} />
      <Phone rig={rig} base={[1.45, -0.2, 1.05]} />
    </group>
  )
}
