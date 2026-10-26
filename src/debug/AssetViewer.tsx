import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { manifest, preloadGroup } from '@/assets/loader'
import { loadHdri, loadModel, loadPbr, type PbrMaps } from '@/presenters/desktop/assets'

/**
 * Asset QA bench (dev and test builds, `?assetview=1`): every model at real scale on a
 * parquet floor and every surface as a 1 m swatch, lit like the flat (warm bulb, faint
 * night environment). Used to check the pipeline output with our own eyes (F2).
 * `&view=models|surfaces` picks the layout; `&cam=x,y,z&target=x,y,z` moves the camera.
 */
export default function AssetViewer() {
  const [ready, setReady] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') ?? 'models'
  // Optional close-up camera: &cam=x,y,z&target=x,y,z
  const vec = (key: string) => {
    const parts = params.get(key)?.split(',').map(Number)
    return parts?.length === 3 && parts.every(Number.isFinite)
      ? (parts as [number, number, number])
      : null
  }
  const cam = vec('cam')
  const target = vec('target')
  useEffect(() => {
    void Promise.all([
      preloadGroup('flat47'),
      preloadGroup('stairwell'),
      preloadGroup('flat48'),
    ]).then(() => setReady(true))
  }, [])
  if (!ready) return <p className="subtitle">…</p>
  return (
    <div style={{ position: 'fixed', inset: 0 }} data-assetview={view}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: cam ?? (view === 'models' ? [0, 3.2, 7.5] : [0, 1.6, 3.4]),
          fov: 50,
        }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, antialias: true }}
      >
        <Bench view={view} />
        <OrbitControls target={target ?? (view === 'models' ? [0, 0.6, 0] : [0, 1.1, 0])} />
      </Canvas>
    </div>
  )
}

const MODELS = manifest.assets.filter((a) => a.kind === 'model')
const SURFACES = manifest.assets.filter((a) => a.kind === 'texture')

function Bench({ view }: { view: string }) {
  const scene = useThree((s) => s.scene)
  const [floor, setFloor] = useState<PbrMaps | null>(null)
  const [loaded, setLoaded] = useState<THREE.Object3D[]>([])
  const [swatches, setSwatches] = useState<PbrMaps[]>([])

  useEffect(() => {
    void loadHdri('dikhololo_night').then((env) => {
      scene.environment = env
      scene.environmentIntensity = 0.35
    })
    void loadPbr('WoodFloor014', [12, 12]).then(setFloor)
    void Promise.all(SURFACES.map((s) => loadPbr(s.id))).then(setSwatches)
    void Promise.all(MODELS.map((m) => loadModel(m.id))).then((gltfs) =>
      setLoaded(
        gltfs.map((g) => {
          const root = g.scene.clone(true)
          root.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
          })
          return root
        }),
      ),
    )
  }, [scene])

  // Two rows of models, spaced by their real footprint.
  const placed = useMemo(() => {
    const x = [0, 0]
    return loaded.map((root, i) => {
      // Recentre on the footprint and stand the model on the floor.
      const box = new THREE.Box3().setFromObject(root)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      root.position.set(-center.x, -box.min.y, -center.z)
      const row = i % 2
      const at = x[row]! + size.x / 2
      x[row] = x[row]! + size.x + 0.25
      return { root, row, at, id: MODELS[i]!.id, height: size.y }
    })
  }, [loaded])
  const widths = useMemo(() => {
    const w = [0, 0]
    for (const p of placed) w[p.row] = Math.max(w[p.row]!, p.at)
    return w
  }, [placed])

  return (
    <>
      <color attach="background" args={['#050607']} />
      <hemisphereLight args={['#9fb0c8', '#1a1612', 0.25]} />
      <pointLight
        position={[0, 3, 2.5]}
        color="#ffcf8a"
        intensity={9}
        distance={12}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 4, 3]} intensity={0.6} color="#c8d4ff" />

      {floor && (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial {...floor} />
        </mesh>
      )}

      {view === 'models' &&
        placed.map((p) => (
          <group key={p.id} position={[p.at - widths[p.row]! / 2, 0, p.row === 0 ? -1.2 : 0.9]}>
            <primitive object={p.root} />
            <Html position={[0, p.height + 0.08, 0]} center>
              <span style={{ font: '11px Inter', color: '#ddd', whiteSpace: 'nowrap' }}>
                {p.id}
              </span>
            </Html>
          </group>
        ))}

      {view === 'surfaces' &&
        swatches.map((maps, i) => {
          const col = i % 5
          const row = Math.floor(i / 5)
          return (
            <group key={SURFACES[i]!.id} position={[(col - 2) * 1.1, 1.75 - row * 1.15, 0]}>
              <mesh>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial {...maps} />
              </mesh>
              <Html position={[0, -0.56, 0]} center>
                <span style={{ font: '11px Inter', color: '#ddd', whiteSpace: 'nowrap' }}>
                  {SURFACES[i]!.id}
                </span>
              </Html>
            </group>
          )
        })}
    </>
  )
}
