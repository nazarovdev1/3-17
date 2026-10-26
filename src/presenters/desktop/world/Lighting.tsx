import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { WORLD, inRect } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { shiftZ } from './stretch'

/**
 * Light from the plan (FIX_PROMPT §2): weak warm bulbs on four switch circuits until the
 * power goes at 3:17, cold moonlight and an orange sodium lamp through the windows, a
 * timer bulb on the landing. One point light carries shadows and follows the fixture of the
 * room the player is in, so the shader set never changes at runtime.
 */
const BULB = '#ffc98a'
/** ~60 W incandescent: about 800 lm → ~64 cd; dimmed a little for an old, dusty bulb. */
const BULB_CD = 9

export function Lighting({
  outage,
  lightsOff,
  extension,
  shadows,
}: {
  outage: boolean
  lightsOff: Set<number>
  extension: number
  shadows: boolean
}) {
  const ceilings = WORLD.lights.filter((l) => l.kind === 'ceiling')
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const glows = useRef<(THREE.Mesh | null)[]>([])
  const shadowLight = useRef<THREE.PointLight>(null)
  const landing = WORLD.lights.find((l) => l.kind === 'landing')!
  const street = WORLD.lights.find((l) => l.kind === 'street')!
  const moon = WORLD.lights.find((l) => l.kind === 'moon')!
  const sodium = useRef<THREE.SpotLight>(null)
  useLayoutEffect(() => {
    // A spotlight's target is not in the scene graph; place it once by hand.
    const light = sodium.current
    if (!light) return
    light.target.position.set(0.5, 1.2, -2.0)
    light.target.updateMatrixWorld()
  }, [])

  useFrame(() => {
    const [px, , pz] = desktopRuntime.position
    const on = (circuit: number | null) => !outage && (circuit === null || !lightsOff.has(circuit))
    // The fixture of the room the player stands in casts the shadows.
    let current = 0
    ceilings.forEach((l, i) => {
      const room = WORLD.rooms.find((r) => r.id === l.room)!
      if (room.rects.some((r) => inRect(r, px!, pz! - (pz! >= 3 ? extension : 0)))) current = i
    })
    ceilings.forEach((l, i) => {
      const light = lights.current[i]
      const lit = on(l.circuit)
      if (light) light.intensity = lit && (!shadows || i !== current) ? BULB_CD : 0
      const glow = glows.current[i]
      if (glow) glow.visible = lit
    })
    const s = shadowLight.current
    if (s) {
      const l = ceilings[current]!
      s.position.set(l.position[0], l.position[1], shiftZ(l.position[0], l.position[2], extension))
      s.intensity = shadows && on(l.circuit) ? BULB_CD : 0
    }
  })

  return (
    <group name="lighting">
      {/* Readable darkness: a faint cold fill so shapes never go fully black. */}
      <hemisphereLight args={['#5d6b80', '#1a1612', 0.035]} />
      {ceilings.map((l, i) => (
        <group
          key={l.id}
          position={[l.position[0], l.position[1], shiftZ(l.position[0], l.position[2], extension)]}
        >
          <pointLight
            ref={(light) => {
              lights.current[i] = light
            }}
            color={BULB}
            intensity={BULB_CD}
            distance={7}
            decay={2}
          />
          <mesh
            ref={(mesh) => {
              glows.current[i] = mesh
            }}
          >
            <sphereGeometry args={[0.035, 16, 12]} />
            <meshBasicMaterial color="#fff2d6" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {shadows && (
        <pointLight
          ref={shadowLight}
          color={BULB}
          distance={7}
          decay={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.002}
          shadow-normalBias={0.03}
          shadow-radius={4}
        />
      )}
      <pointLight
        position={[
          landing.position[0],
          landing.position[1],
          shiftZ(landing.position[0], landing.position[2], extension),
        ]}
        color="#ffd9a0"
        intensity={outage ? 0 : 9}
        distance={8}
        decay={2}
      />
      {/* Moonlight from high over the block opposite. */}
      <directionalLight
        position={moon.position}
        color="#8fa6c8"
        intensity={0.22}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      {/* Sodium streetlamp below the window, aimed up at the façade. */}
      <spotLight
        ref={sodium}
        position={street.position}
        color="#ff9a3d"
        intensity={160}
        distance={40}
        decay={2}
        angle={0.55}
        penumbra={0.8}
      />
    </group>
  )
}
