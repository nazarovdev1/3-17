// Figure bench (dev only): /audit/figure.html?glb=<url>&view=<front|side|back|three|head>
// Neutral studio light to judge anatomy, not mood. Sets window.__ready when drawn.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const params = new URLSearchParams(location.search)
const view = params.get('view') ?? 'front'
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.AgXToneMapping
document.body.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.background = new THREE.Color('#9a9a9a')
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 50)
scene.add(new THREE.HemisphereLight('#ffffff', '#555555', 1.6))
const key = new THREE.DirectionalLight('#ffffff', 2.4)
key.position.set(2, 3, 3)
scene.add(key)
const rim = new THREE.DirectionalLight('#ffffff', 1.4)
rim.position.set(-2, 2, -3)
scene.add(rim)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshStandardMaterial({ color: '#777' }),
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)
// A 1.80 m reference pole beside the figure.
const pole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, 1.8),
  new THREE.MeshStandardMaterial({ color: '#c33' }),
)
pole.position.set(0.55, 0.9, 0)
scene.add(pole)

const poses: Record<string, [THREE.Vector3Tuple, THREE.Vector3Tuple]> = {
  front: [
    [0, 1.05, 5.2],
    [0, 1.02, 0],
  ],
  side: [
    [5.2, 1.05, 0],
    [0, 1.02, 0],
  ],
  back: [
    [0.6, 1.2, -5.0],
    [0, 1.05, 0],
  ],
  three: [
    [2.6, 1.5, 3.6],
    [0, 1.05, 0],
  ],
  head: [
    [0.35, 1.86, 0.75],
    [0, 1.83, 0],
  ],
  hand: [
    [0.9, 0.85, 0.5],
    [0.24, 0.84, 0.03],
  ],
}
const [eye, target] = poses[view] ?? poses.front!
camera.position.set(...eye)
camera.lookAt(...target)

new GLTFLoader()
  .setMeshoptDecoder(MeshoptDecoder)
  .load(params.get('glb') ?? '/audit/screenshots/f4/figure.glb', (gltf) => {
    scene.add(gltf.scene)
    const turn = Number(params.get('turn') ?? 0)
    const head = gltf.scene.getObjectByName('figure_head')
    if (head) head.rotation.y = turn
    renderer.render(scene, camera)
    ;(window as unknown as { __ready: boolean }).__ready = true
  })
