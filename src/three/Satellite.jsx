import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { state } from '../store'

const ACCENT = '#c6ff3d'

/** Solar-cell texture drawn on a canvas: dark cells, thin grid lines, faint sheen. */
function useCellTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 384
    const g = c.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 256, 384)
    grad.addColorStop(0, '#13213a')
    grad.addColorStop(0.5, '#0a1222')
    grad.addColorStop(1, '#16284a')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 384)
    g.strokeStyle = 'rgba(160,190,230,0.35)'
    g.lineWidth = 2
    for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke() }
    for (let y = 0; y <= 384; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke() }
    g.strokeStyle = 'rgba(198,255,61,0.55)'
    g.lineWidth = 4
    g.strokeRect(2, 2, 252, 380)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])
}

/** Parabolic dish profile for LatheGeometry (opens toward -Y). */
function dishGeometry(radius = 0.5, depth = 0.16) {
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const r = (i / 24) * radius
    pts.push(new THREE.Vector2(r, (r * r) / (radius * radius) * -depth * -1))
  }
  const geo = new THREE.LatheGeometry(pts, 64)
  geo.rotateX(Math.PI) // concave side faces down
  return geo
}

/**
 * Procedural communications satellite: "your brand's signal".
 * Nadir (dish + beam) points to -Y, front sensor to +Z.
 */
export default function Satellite({ beamRef }) {
  const wings = useRef([])
  const orbit = useRef()
  const beads = useRef()
  const waves = useRef([])
  const tip = useRef()
  const cellTex = useCellTexture()
  const dish = useMemo(() => dishGeometry(0.55, 0.18), [])

  const mats = useMemo(
    () => ({
      foil: new THREE.MeshPhysicalMaterial({ color: '#c98a2e', metalness: 1, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      panel: new THREE.MeshPhysicalMaterial({ color: '#e4e7eb', metalness: 0.3, roughness: 0.35, clearcoat: 1 }),
      frame: new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.85, roughness: 0.3 }),
      silver: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.2 }),
      dish: new THREE.MeshPhysicalMaterial({ color: '#f1f3f5', metalness: 0.2, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide }),
      cells: new THREE.MeshPhysicalMaterial({ map: cellTex, metalness: 0.6, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.8, toneMapped: false }),
      lens: new THREE.MeshStandardMaterial({ color: '#0d2b3a', emissive: '#29c6ff', emissiveIntensity: 0.8, metalness: 1, roughness: 0.1 }),
      ring: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false }),
      beam: new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    }),
    [cellTex]
  )
  const waveMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide })),
    []
  )

  // 24 data "beads" orbiting the bus — they speed up with scroll
  const beadData = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ a: (i / 24) * Math.PI * 2, r: 1.05 + (i % 3) * 0.06, y: ((i % 5) - 2) * 0.015 })), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const v = Math.abs(state.velocity)

    // Solar wings slowly track the "sun" and flex with scroll speed
    wings.current.forEach((w, i) => {
      if (!w) return
      const target = Math.sin(t * 0.35 + i) * 0.25 + Math.min(v * 0.004, 0.35) * (i ? -1 : 1)
      w.rotation.x = THREE.MathUtils.damp(w.rotation.x, target, 3, dt)
    })

    // Orbit ring + beads
    const speed = 0.6 + Math.min(v * 0.08, 4)
    if (orbit.current) orbit.current.rotation.y += dt * speed
    if (beads.current) {
      beadData.forEach((b, i) => {
        dummy.position.set(Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r)
        const sc = 0.6 + 0.4 * Math.sin(t * 3 + i)
        dummy.scale.setScalar(sc)
        dummy.updateMatrix()
        beads.current.setMatrixAt(i, dummy.matrix)
      })
      beads.current.instanceMatrix.needsUpdate = true
    }

    // Antenna tip blink
    if (tip.current) tip.current.emissiveIntensity = Math.sin(t * 5) > 0.7 ? 4 : 1

    // Broadcast: beam cone + expanding signal waves from the dish
    const b = beamRef.current
    mats.beam.opacity = b * 0.07
    waves.current.forEach((w, i) => {
      if (!w) return
      const k = (t * 0.45 + i / 3) % 1
      w.position.y = -0.75 - k * 2.8
      const r = 0.25 + k * 1.4
      w.scale.set(r, r, 1)
      waveMats[i].opacity = (0.12 + b * 0.8) * (1 - k)
    })
  })

  return (
    <group>
      {/* ---------- Bus ---------- */}
      {/* gold-foil octagonal lower bus */}
      <mesh position={[0, -0.15, 0]} material={mats.foil}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 8]} />
      </mesh>
      {/* white equipment module */}
      <RoundedBox args={[0.8, 0.5, 0.8]} radius={0.05} smoothness={3} position={[0, 0.38, 0]} material={mats.panel} />
      {/* radiator fins */}
      {[-0.1, 0, 0.1].map((y) => (
        <mesh key={y} position={[0, 0.38 + y, 0.41]} material={mats.frame}>
          <boxGeometry args={[0.6, 0.02, 0.02]} />
        </mesh>
      ))}
      {/* accent bands */}
      <mesh position={[0, 0.14, 0]} material={mats.accent}>
        <cylinderGeometry args={[0.505, 0.505, 0.015, 8, 1, true]} />
      </mesh>
      <mesh position={[0, -0.46, 0]} material={mats.frame}>
        <cylinderGeometry args={[0.42, 0.5, 0.06, 8]} />
      </mesh>

      {/* front star-tracker sensor (+Z) */}
      <group position={[0.18, 0.4, 0.42]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.frame}>
          <cylinderGeometry args={[0.08, 0.1, 0.16, 24]} />
        </mesh>
        <mesh position={[0, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]} material={mats.lens}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 24]} />
        </mesh>
      </group>
      <mesh position={[-0.2, 0.42, 0.42]} material={mats.accent}>
        <boxGeometry args={[0.18, 0.04, 0.01]} />
      </mesh>

      {/* top antenna mast */}
      <mesh position={[0, 0.85, 0]} material={mats.silver}>
        <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial ref={tip} color={ACCENT} emissive={ACCENT} emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {/* small helix / omni antennas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.28, 0.72, -0.25]} material={mats.silver}>
          <cylinderGeometry args={[0.03, 0.03, 0.18, 12]} />
        </mesh>
      ))}

      {/* thrusters */}
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.3, -0.5, z * 0.3]} material={mats.frame}>
          <coneGeometry args={[0.05, 0.1, 12, 1, true]} />
        </mesh>
      ))}

      {/* ---------- Solar wings ---------- */}
      {[-1, 1].map((side, i) => (
        <group key={side} position={[side * 0.42, 0.38, 0]}>
          {/* boom */}
          <mesh position={[side * 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.silver}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 10]} />
          </mesh>
          <mesh position={[side * 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.frame}>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          </mesh>
          <group ref={(g) => (wings.current[i] = g)} position={[side * 0.4, 0, 0]}>
            {[0, 1, 2].map((k) => (
              <group key={k} position={[side * (0.33 + k * 0.62), 0, 0]}>
                <mesh material={mats.frame}>
                  <boxGeometry args={[0.6, 0.82, 0.03]} />
                </mesh>
                <mesh position={[0, 0, 0.017]} material={mats.cells}>
                  <planeGeometry args={[0.57, 0.79]} />
                </mesh>
                <mesh position={[0, 0, -0.017]} rotation={[0, Math.PI, 0]} material={mats.cells}>
                  <planeGeometry args={[0.57, 0.79]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      ))}

      {/* ---------- Nadir dish (points down) ---------- */}
      <group position={[0, -0.55, 0]}>
        <mesh geometry={dish} material={mats.dish} position={[0, -0.02, 0]} />
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.accent}>
          <torusGeometry args={[0.55, 0.006, 6, 64]} />
        </mesh>
        {/* feed struts + horn */}
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2
          return (
            <mesh key={k} position={[Math.cos(a) * 0.22, -0.2, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]} material={mats.silver}>
              <cylinderGeometry args={[0.008, 0.008, 0.48, 6]} />
            </mesh>
          )
        })}
        <mesh position={[0, -0.4, 0]} material={mats.frame}>
          <cylinderGeometry args={[0.035, 0.06, 0.1, 16]} />
        </mesh>
        <mesh position={[0, -0.46, 0]} material={mats.accent}>
          <sphereGeometry args={[0.025, 12, 12]} />
        </mesh>
      </group>

      {/* ---------- Orbit ring with data beads ---------- */}
      <group ref={orbit} rotation={[0.25, 0, 0.15]} position={[0, 0.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.ring}>
          <torusGeometry args={[1.1, 0.004, 6, 128]} />
        </mesh>
        <instancedMesh ref={beads} args={[null, null, beadData.length]} material={mats.accent}>
          <sphereGeometry args={[0.018, 8, 8]} />
        </instancedMesh>
      </group>

      {/* ---------- Broadcast beam + signal waves ---------- */}
      <mesh position={[0, -1.0 - 1.5, 0]} material={mats.beam}>
        <coneGeometry args={[1.5, 3, 48, 1, true]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(w) => (waves.current[i] = w)} rotation={[Math.PI / 2, 0, 0]} material={waveMats[i]}>
          <ringGeometry args={[0.97, 1, 96]} />
        </mesh>
      ))}
    </group>
  )
}
