import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CLOCK_SHIFTED, OBJECTS } from './layout'
import { useGame } from '@/ui/gameStore'
import { STILL_CAMERAS } from '../mobile/still-scenes'

export interface StillApi {
  settle: () => Promise<void>
  color: () => string
  depth: () => string
  anchors: () => Record<string, { x: number; y: number }>
}
declare global {
  interface Window {
    __still?: StillApi
  }
}

/** Dev/test export bridge. Production never mounts this component. */
export function StillCapture() {
  const { gl, scene, camera, invalidate } = useThree()
  const pending = useRef<{ frames: number; done: () => void } | null>(null)
  useFrame(() => {
    const pose = STILL_CAMERAS[new URLSearchParams(window.location.search).get('cam') ?? '']
    if (!pose) return
    camera.position.set(...pose.position)
    camera.quaternion.setFromEuler(new THREE.Euler(pose.pitch, pose.yaw, 0, 'YXZ'))
    const lens = camera as THREE.PerspectiveCamera
    if (lens.fov !== pose.fov) {
      // eslint-disable-next-line react-hooks/immutability -- Three.js camera is an imperative render handle.
      lens.fov = pose.fov
      lens.updateProjectionMatrix()
    }
  }, -0.5)
  useFrame(() => {
    if (pending.current) {
      if (--pending.current.frames > 0) invalidate()
      else {
        const done = pending.current.done
        pending.current = null
        queueMicrotask(done)
      }
    }
    if (new URLSearchParams(window.location.search).get('cam') !== 'ending_c') return
    // Ending C's render is the earned outcome after winding, rather than the stopped clock.
    scene.traverse((node) => {
      if (node.name === 'clock-hand-0') node.rotation.z = -((3 + 18 / 60) / 12) * Math.PI * 2
      if (node.name === 'clock-hand-1') node.rotation.z = -(18 / 60) * Math.PI * 2
    })
  })
  useEffect(() => {
    const api: StillApi = {
      settle: () =>
        new Promise<void>((done) => {
          pending.current = { frames: 4, done }
          invalidate()
        }),
      color: () => gl.domElement.toDataURL('image/png'),
      anchors: () => {
        camera.updateMatrixWorld()
        const points = {
          ...OBJECTS,
          ...(useGame.getState().run?.flags['clock_shifted'] ? { clock: CLOCK_SHIFTED } : {}),
        }
        return Object.fromEntries(
          Object.entries(points).flatMap(([id, p]) => {
            const v = new THREE.Vector3(...p).project(camera)
            return v.z > -1 && v.z < 1 && Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.94
              ? [[id, { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }]]
              : []
          }),
        )
      },
      depth: () => {
        const width = gl.domElement.width,
          height = gl.domElement.height
        const target = new THREE.WebGLRenderTarget(width, height)
        const material = new THREE.ShaderMaterial({
          vertexShader:
            'varying float distanceToEye; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);distanceToEye=-p.z;gl_Position=projectionMatrix*p;}',
          fragmentShader:
            'varying float distanceToEye; void main(){float d=clamp(1.0-distanceToEye/14.0,0.0,1.0);gl_FragColor=vec4(vec3(d),1.0);}',
        })
        const previous = gl.getRenderTarget(),
          override = scene.overrideMaterial,
          background = scene.background
        const pixels = new Uint8Array(width * height * 4)
        try {
          scene.overrideMaterial = material
          scene.background = new THREE.Color(0)
          gl.setRenderTarget(target)
          gl.render(scene, camera)
          gl.readRenderTargetPixels(target, 0, 0, width, height, pixels)
        } finally {
          gl.setRenderTarget(previous)
          scene.overrideMaterial = override
          scene.background = background
          target.dispose()
          material.dispose()
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!,
          data = ctx.createImageData(width, height)
        for (let y = 0; y < height; y++)
          data.data.set(
            pixels.subarray((height - y - 1) * width * 4, (height - y) * width * 4),
            y * width * 4,
          )
        ctx.putImageData(data, 0, 0)
        return canvas.toDataURL('image/png')
      },
    }
    window.__still = api
    return () => {
      pending.current?.done()
      pending.current = null
      if (window.__still === api) delete window.__still
    }
  }, [gl, scene, camera, invalidate])
  return new URLSearchParams(window.location.search).get('cam') === 'ending_b' ? (
    <>
      <hemisphereLight args={['#6f8299', '#20252d', 1.8]} />
      <pointLight
        position={[4.5, -2.4, -16]}
        color="#d99a61"
        intensity={90}
        distance={28}
        decay={2}
      />
    </>
  ) : null
}
