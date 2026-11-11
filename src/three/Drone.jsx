import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { state } from '../store'

const ACCENT = '#c6ff3d'
const ARM_ANGLES = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
const ARM_LEN = 1.3

/**
 * Procedural quad-copter built from primitives.
 * Front of the drone points to +Z (camera gimbal side).
 */
export default function Drone({ beamRef }) {
  const props = useRef([])
  const discs = useRef([])
  const leds = useRef([])
  const scanRing = useRef()

  const mats = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({ color: '#cfd3d9', metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
      frame: new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.8, roughness: 0.35 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0b0c0e', metalness: 0.4, roughness: 0.6 }),
      blade: new THREE.MeshStandardMaterial({ color: '#d9dde3', metalness: 0.2, roughness: 0.4 }),
      accent: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.6, toneMapped: false }),
      red: new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff3b3b', emissiveIntensity: 2, toneMapped: false }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#0a0f14', metalness: 0, roughness: 0.05, transmission: 0.2, clearcoat: 1, reflectivity: 1 }),
      lens: new THREE.MeshStandardMaterial({ color: '#0d2b3a', emissive: '#29c6ff', emissiveIntensity: 0.6, metalness: 1, roughness: 0.1 }),
      disc: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }),
      beam: new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
      ring: new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
    }),
    []
  )

  useFrame((s, dt) => {
    // Propellers spin faster while scrolling
    const speed = 28 + Math.min(Math.abs(state.velocity) * 3, 40)
    props.current.forEach((p, i) => p && (p.rotation.y += (i % 2 ? -1 : 1) * speed * dt))
    discs.current.forEach((d) => d && (d.material.opacity = 0.04 + Math.min(Math.abs(state.velocity) * 0.01, 0.08)))

    // Blinking nav LEDs
    const t = s.clock.elapsedTime
    const blink = (Math.sin(t * 6) > 0.85 ? 3 : 1.2)
    leds.current.forEach((l) => l && (l.emissiveIntensity = blink))

    // Scan beam
    const b = beamRef.current
    mats.beam.opacity = b * 0.07
    mats.ring.opacity = b * 0.9
    if (scanRing.current) {
      const k = (t * 0.6) % 1
      scanRing.current.position.y = -0.4 - k * 2.9
      const r = 0.05 + k * 1.35
      scanRing.current.scale.set(r, r, r)
      mats.ring.opacity = b * (1 - k) * 0.9
    }
  })

  return (
    <group>
      {/* ---------- Main body ---------- */}
      <RoundedBox args={[0.95, 0.3, 1.45]} radius={0.12} smoothness={4} material={mats.shell} castShadow />
      {/* top canopy */}
      <mesh position={[0, 0.14, 0.05]} scale={[0.42, 0.16, 0.62]} material={mats.glass}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* battery pack */}
      <RoundedBox args={[0.6, 0.12, 0.7]} radius={0.04} position={[0, 0.2, -0.45]} material={mats.frame} />
      {/* accent stripes */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.48, 0.02, 0.1]} material={mats.accent}>
          <boxGeometry args={[0.012, 0.03, 0.9]} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.73]} material={mats.accent}>
        <boxGeometry args={[0.5, 0.025, 0.012]} />
      </mesh>
      {/* vents */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.27, -0.2 - i * 0.1]} material={mats.dark}>
          <boxGeometry args={[0.4, 0.01, 0.04]} />
        </mesh>
      ))}

      {/* ---------- Arms, motors, props ---------- */}
      {ARM_ANGLES.map((a, i) => {
        const dx = Math.sin(a)
        const dz = Math.cos(a)
        const front = dz > 0
        return (
          <group key={i}>
            <mesh position={[dx * ARM_LEN * 0.5, 0.02, dz * ARM_LEN * 0.5]} rotation={[0, a, 0]} material={mats.frame}>
              <boxGeometry args={[0.11, 0.08, ARM_LEN]} />
            </mesh>
            <group position={[dx * ARM_LEN, 0.02, dz * ARM_LEN]}>
              {/* motor */}
              <mesh material={mats.shell}>
                <cylinderGeometry args={[0.13, 0.15, 0.2, 28]} />
              </mesh>
              <mesh position={[0, 0.11, 0]} material={mats.frame}>
                <cylinderGeometry args={[0.1, 0.12, 0.05, 28]} />
              </mesh>
              {/* LED under motor */}
              <mesh position={[0, -0.12, 0]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshStandardMaterial
                  ref={(m) => (leds.current[i] = m)}
                  color={front ? ACCENT : '#ff3b3b'}
                  emissive={front ? ACCENT : '#ff3b3b'}
                  emissiveIntensity={1.5}
                  toneMapped={false}
                />
              </mesh>
              {/* prop guard */}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} material={mats.frame}>
                <torusGeometry args={[0.56, 0.018, 10, 64]} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} material={mats.accent}>
                <torusGeometry args={[0.56, 0.005, 6, 64]} />
              </mesh>
              {/* propeller */}
              <group ref={(g) => (props.current[i] = g)} position={[0, 0.18, 0]}>
                <mesh material={mats.dark}>
                  <cylinderGeometry args={[0.045, 0.045, 0.06, 16]} />
                </mesh>
                {[0, Math.PI].map((r) => (
                  <mesh key={r} rotation={[0.18, r, 0]} position={[Math.cos(r) * 0.25, 0, -Math.sin(r) * 0.25]} material={mats.blade}>
                    <boxGeometry args={[0.5, 0.012, 0.07]} />
                  </mesh>
                ))}
              </group>
              {/* motion blur disc */}
              <mesh ref={(d) => (discs.current[i] = d)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.185, 0]} material={mats.disc.clone()}>
                <circleGeometry args={[0.5, 48]} />
              </mesh>
            </group>
          </group>
        )
      })}

      {/* ---------- Landing gear ---------- */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.38, 0, 0]}>
          <mesh position={[0, -0.47, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.frame}>
            <cylinderGeometry args={[0.025, 0.025, 1.2, 12]} />
          </mesh>
          {[-0.35, 0.35].map((z) => (
            <mesh key={z} position={[side * -0.05, -0.3, z]} rotation={[0, 0, side * 0.3]} material={mats.frame}>
              <cylinderGeometry args={[0.02, 0.02, 0.36, 10]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ---------- Camera gimbal ---------- */}
      <group position={[0, -0.24, 0.5]}>
        <mesh material={mats.frame}>
          <boxGeometry args={[0.08, 0.14, 0.08]} />
        </mesh>
        <mesh position={[0, -0.13, 0]} material={mats.shell}>
          <sphereGeometry args={[0.13, 32, 32]} />
        </mesh>
        <mesh position={[0, -0.13, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={mats.lens}>
          <cylinderGeometry args={[0.07, 0.08, 0.08, 32]} />
        </mesh>
        <mesh position={[0, -0.13, 0.145]} rotation={[Math.PI / 2, 0, 0]} material={mats.accent}>
          <torusGeometry args={[0.072, 0.006, 8, 32]} />
        </mesh>
      </group>

      {/* ---------- Scan beam (LiDAR style) ---------- */}
      <mesh position={[0, -0.4 - 1.5, 0.2]} material={mats.beam}>
        <coneGeometry args={[1.45, 3, 48, 1, true]} />
      </mesh>
      <mesh ref={scanRing} position={[0, -1, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.ring}>
        <torusGeometry args={[1, 0.012, 6, 96]} />
      </mesh>
    </group>
  )
}
