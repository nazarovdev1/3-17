import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { WORLD, PARTY_X, mirrorX, inRect } from '@/content/world/layout'
import { desktopRuntime } from '@/platform/device/desktopRuntime'
import { shiftZ } from './stretch'
import { softwareLight } from './softwareMaterial'

/**
 * Light from the plan (FIX_PROMPT §2): weak warm bulbs on four switch circuits until the
 * power goes at 3:17, cold moonlight and an orange sodium lamp through the windows, a
 * timer bulb on the landing. One point light carries shadows and follows the fixture of the
 * room the player is in, so the shader set never changes at runtime.
 */
const BULB = '#ffe2bd'
/** A heavily dimmed incandescent; warm pools leave the corners to the cold window fill. */
const BULB_CD = 3.5

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
  const fill = useRef<THREE.HemisphereLight>(null)
  const flatWindowFill = useRef<THREE.PointLight>(null)
  const stairWindowFill = useRef<THREE.PointLight>(null)
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
    const stairFill =
      Math.min(1, Math.max(0, pz! - 5.8)) * Math.min(1, Math.max(0, (px! + 0.1) / 0.4))
    // Limit bounced fill to the occupied volume instead of leaking through party walls.
    if (flatWindowFill.current)
      flatWindowFill.current.intensity = px! < PARTY_X && pz! < 4.69 ? 18 : 0
    if (stairWindowFill.current) stairWindowFill.current.intensity = stairFill * 16
    if (fill.current)
      fill.current.intensity =
        px! < PARTY_X && pz! < 4.69 ? 2.5 : outage ? 1.2 : 0.14 + stairFill * 0.9
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
      if (light) light.intensity = lit && i !== current ? BULB_CD : 0
      const glow = glows.current[i]
      if (glow) glow.visible = lit
    })
    const s = shadowLight.current
    const active = pz! > 4.78 ? landing : ceilings[current]!
    softwareLight.position.value.set(
      active.position[0],
      active.position[1],
      shiftZ(active.position[0], active.position[2], extension),
    )
    softwareLight.power.value = on(active.circuit) ? BULB_CD : 0
    if (s) {
      const l = ceilings[current]!
      s.position.set(l.position[0], l.position[1], shiftZ(l.position[0], l.position[2], extension))
      s.intensity = on(l.circuit) ? BULB_CD : 0
    }
  })

  return (
    <group name="lighting">
      {/* Readable darkness: a faint cold fill so shapes never go fully black. */}
      <hemisphereLight ref={fill} args={['#5d6b80', '#1a1612', 0.14]} />
      {/* Diffuse moonlight bounced off the window reveals in the unpowered flat. */}
      {shadows && (
        <>
          <pointLight
            ref={flatWindowFill}
            position={[mirrorX(0.3), 1.8, -2.7]}
            color="#9cafc8"
            intensity={18}
            distance={6}
            decay={2}
          />
          <pointLight
            ref={stairWindowFill}
            position={[1.6, 1.3, 9.55]}
            color="#9cafc8"
            intensity={16}
            distance={6}
            decay={2}
          />
        </>
      )}
      {ceilings.map((l, i) => (
        <group
          key={l.id}
          position={[l.position[0], l.position[1], shiftZ(l.position[0], l.position[2], extension)]}
        >
          {shadows && (
            <pointLight
              ref={(light) => {
                lights.current[i] = light
              }}
              color={BULB}
              intensity={BULB_CD}
              distance={7}
              decay={2}
            />
          )}
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
      <pointLight
        ref={shadowLight}
        color={BULB}
        distance={7}
        decay={2}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.002}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />
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
