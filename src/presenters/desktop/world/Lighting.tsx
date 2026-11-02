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
/** The stairwell window's fill above, and where it moves downstairs (stairwell.ts). */
const STAIR_WINDOW: [number, number, number] = [1.6, 1.3, 9.55]
const HALF_WINDOW: [number, number, number] = [1.4, -0.6, 9.6]
const LANDING3_BULB: [number, number, number] = [0.3, -0.7, 6.2]
/** A heavily dimmed incandescent; warm pools leave the corners to the cold window fill. */
const BULB_CD = 3.5

export function Lighting({
  outage,
  daylight = false,
  lightsOff,
  extension,
  shadows,
  landingDark = false,
  landingDead = false,
  daylightMs = 0,
}: {
  /** How long the last change of daylight takes (ending A's dusk is ten seconds). */
  daylightMs?: number
  /** The landing's timer bulb is off (the figure stands out there). */
  landingDark?: boolean
  /** The landing's bulb is dead (night 1's arrival): only a phone lights the way. */
  landingDead?: boolean
  outage: boolean
  /** Grey winter morning through the windows (each night's dawn, the day of night 2). */
  daylight?: boolean
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

  const day = useRef(daylight ? 1 : 0)
  const landingLight = useRef<THREE.PointLight>(null)
  const landingAt: [number, number, number] = [
    landing.position[0],
    landing.position[1],
    shiftZ(landing.position[0], landing.position[2], extension),
  ]
  const current = useRef(outage ? 0 : 1)
  const moonLight = useRef<THREE.DirectionalLight>(null)
  useFrame((_, delta) => {
    const target = daylight ? 1 : 0
    const step = daylightMs > 0 ? Math.min(0.05, delta) / (daylightMs / 1000) : 1
    day.current += Math.sign(target - day.current) * Math.min(Math.abs(target - day.current), step)
    const d = day.current
    softwareLight.daylight.value = d
    // Power cuts at once, and comes back slowly: the filaments warm up over two seconds.
    current.current = outage ? 0 : Math.min(1, current.current + Math.min(0.05, delta) * 0.5)
    const warm = current.current * current.current
    if (moonLight.current) {
      moonLight.current.intensity = 0.22 + (1.6 - 0.22) * d
      moonLight.current.color.set(d > 0.5 ? '#c7d0dc' : '#8fa6c8')
    }
    if (sodium.current) sodium.current.intensity = 160 * (1 - d)
    const [px, , pz] = desktopRuntime.position
    softwareLight.flat48Fill.value = px! < PARTY_X && pz! < 4.69 ? 1 : 0
    const stairFill =
      Math.min(1, Math.max(0, pz! - 5.8)) * Math.min(1, Math.max(0, (px! + 0.1) / 0.4))
    // Limit bounced fill to the occupied volume instead of leaking through party walls.
    if (flatWindowFill.current)
      flatWindowFill.current.intensity = px! < PARTY_X && pz! < 4.69 ? 18 : 0
    const below = desktopRuntime.feet < -0.3
    if (stairWindowFill.current) {
      // Downstairs the same fill is the grey light of the half-landing window.
      stairWindowFill.current.position.set(...(below ? HALF_WINDOW : STAIR_WINDOW))
      stairWindowFill.current.intensity = below ? 0.4 + 9 * d : stairFill * (landingDead ? 2 : 16)
    }
    if (landingLight.current) {
      // And the timer bulb's light is the 3rd floor's, under it.
      const [lx, ly, lz] = below ? LANDING3_BULB : landingAt
      landingLight.current.position.set(lx, ly, lz)
      // Below, the 3rd floor's own timer bulb burns at night too: the treads and the landing
      // floor must read as concrete, not as a flat patch of fill light.
      landingLight.current.intensity = below
        ? outage
          ? 0.25
          : landingDark
            ? 0.7
            : 5.5 + 3.5 * d
        : outage || landingDead
          ? 0
          : landingDark
            ? 0.9
            : 9
    }
    if (fill.current)
      fill.current.intensity =
        3.2 * d +
        (1 - d) *
          (px! < PARTY_X && pz! < 4.69
            ? 2.5
            : outage
              ? 2.0
              : landingDead && pz! > 4.69
                ? 0.05 + stairFill * 0.15
                : 0.14 + stairFill * 0.9)
    const on = (circuit: number | null) => !outage && (circuit === null || !lightsOff.has(circuit))
    // The fixture of the room the player stands in casts the shadows.
    let room = 0
    ceilings.forEach((l, i) => {
      const plan = WORLD.rooms.find((r) => r.id === l.room)!
      if (plan.rects.some((r) => inRect(r, px!, pz! - (pz! >= 3 ? extension : 0)))) room = i
    })
    ceilings.forEach((l, i) => {
      const light = lights.current[i]
      const lit = on(l.circuit)
      if (light) light.intensity = lit && i !== room ? BULB_CD * warm : 0
      const glow = glows.current[i]
      if (glow) glow.visible = lit
    })
    const s = shadowLight.current
    const active = pz! > 4.78 ? landing : ceilings[room]!
    softwareLight.position.value.set(
      active.position[0],
      active.position[1],
      shiftZ(active.position[0], active.position[2], extension),
    )
    softwareLight.power.value =
      on(active.circuit) && !(landingDead && active === landing) ? BULB_CD * warm : 0
    // Outside (ending B) the one software light is the bus, or the streetlamp.
    if (desktopRuntime.feet < -5) {
      const inBus = pz! < -17
      softwareLight.position.value.set(inBus ? 0.5 : 4.5, inBus ? -6.0 : -2.6, inBus ? -18.3 : -16)
      softwareLight.power.value = inBus ? 5 : 8
    } else if (desktopRuntime.feet < -0.3) {
      // Downstairs the one software light is the grey day from the half-landing window, and
      // at night the 3rd floor's timer bulb (the floors there must not go flat blue).
      if (daylight) softwareLight.position.value.set(0.9, -0.6, 7.4)
      else softwareLight.position.value.set(...LANDING3_BULB)
      softwareLight.power.value = daylight ? 6 : outage ? 0.5 : landingDark ? 0.8 : 2.4
    }
    if (s) {
      const l = ceilings[room]!
      s.position.set(l.position[0], l.position[1], shiftZ(l.position[0], l.position[2], extension))
      s.intensity = on(l.circuit) ? BULB_CD * warm : 0
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
            position={STAIR_WINDOW}
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
        ref={landingLight}
        position={landingAt}
        color="#ffd9a0"
        // The timer bulb clicked off: only a glow from the stairwell window is left.
        intensity={outage || landingDead ? 0 : landingDark ? 0.9 : 9}
        distance={8}
        decay={2}
      />
      {/* Moonlight from high over the block opposite. */}
      <directionalLight
        ref={moonLight}
        position={moon.position}
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
        distance={40}
        decay={2}
        angle={0.55}
        penumbra={0.8}
      />
    </group>
  )
}
