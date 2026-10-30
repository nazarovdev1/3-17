import * as THREE from 'three'

/** Shared uniforms for the CPU rasterizer's vertex-lit, textured fallback. */
export const softwareLight = {
  position: { value: new THREE.Vector3() },
  power: { value: 3.5 },
  daylight: { value: 0 },
  torchPosition: { value: new THREE.Vector3() },
  torchDirection: { value: new THREE.Vector3(0, 0, -1) },
  torch: { value: 0 },
}

const textureCache = new WeakMap<THREE.Texture, THREE.Texture>()
function softwareTexture(source: THREE.Texture): THREE.Texture {
  const cached = textureCache.get(source)
  if (cached) return cached
  const image = source.image as ImageBitmap
  const ratio = Math.min(1, 512 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * ratio))
  canvas.height = Math.max(1, Math.round(image.height * ratio))
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  // Decode sRGB once on the CPU instead of at every software texture sample.
  if (source.colorSpace === THREE.SRGBColorSpace) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    const linear = Uint8Array.from({ length: 256 }, (_, n) => {
      const value = n / 255
      return Math.round((value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * 255)
    })
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = linear[pixels.data[i]!]!
      pixels.data[i + 1] = linear[pixels.data[i + 1]!]!
      pixels.data[i + 2] = linear[pixels.data[i + 2]!]!
    }
    context.putImageData(pixels, 0, 0)
  }
  const map = source.clone()
  // Texture.clone shares its Source; replace that too so the native PBR cache stays intact.
  map.source = new THREE.Source(canvas)
  map.colorSpace = THREE.LinearSRGBColorSpace
  map.anisotropy = 1
  map.minFilter = THREE.LinearMipmapNearestFilter
  map.needsUpdate = true
  textureCache.set(source, map)
  return map
}

export function softwareMaterial(source: THREE.MeshStandardMaterial): THREE.MeshBasicMaterial {
  const map = source.map ? softwareTexture(source.map) : null
  const glass = source instanceof THREE.MeshPhysicalMaterial && source.transmission > 0
  const material = new THREE.MeshBasicMaterial({
    map,
    color: source.color,
    transparent: glass || source.transparent,
    opacity: glass ? 0.08 : source.opacity,
    depthWrite: !glass && source.depthWrite,
    alphaTest: source.alphaTest,
    side: source.side,
    forceSinglePass: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.softPosition = softwareLight.position
    shader.uniforms.softPower = softwareLight.power
    shader.uniforms.softDaylight = softwareLight.daylight
    shader.uniforms.softTorchPosition = softwareLight.torchPosition
    shader.uniforms.softTorchDirection = softwareLight.torchDirection
    shader.uniforms.softTorch = softwareLight.torch
    shader.vertexShader =
      `
      varying vec3 vSoftwareLight;
      uniform vec3 softPosition, softTorchPosition, softTorchDirection;
      uniform float softPower, softTorch, softDaylight;
    ` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec3 worldP = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec3 worldN = normalize(mat3(modelMatrix) * normal);
      vec3 bulb = softPosition - worldP;
      float distance2 = max(dot(bulb, bulb), 0.1);
      float direct = max(dot(worldN, normalize(bulb)), 0.0) * softPower / (distance2 + 0.4);
      float beam = 0.0;
      if (softTorch > 0.5) {
        vec3 torchRay = worldP - softTorchPosition;
        float cone = smoothstep(0.90, 0.98, dot(normalize(torchRay), softTorchDirection));
        beam = cone * softTorch * max(dot(worldN, -normalize(torchRay)), 0.0) / (dot(torchRay, torchRay) + 0.8);
      }
      vSoftwareLight = vec3(0.09, 0.11, 0.15) + vec3(0.28, 0.30, 0.32) * softDaylight + vec3(1.0, 0.8, 0.59) * direct + vec3(0.9, 0.94, 1.0) * beam;
    `,
    )
    shader.fragmentShader = 'varying vec3 vSoftwareLight;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb *= vSoftwareLight;',
    )
  }
  material.customProgramCacheKey = () => 'software-vertex-light'
  return material
}
