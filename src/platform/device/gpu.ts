/**
 * Quick GPU check (spec 2/10): renderer string sanity + a short FPS sample on
 * a small offscreen scene. Must stay fast and never throw.
 */
export async function checkGpu(sampleMs = 800): Promise<boolean> {
  let probe: WebGLRenderingContext | WebGL2RenderingContext | null = null
  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    probe = gl
    if (!gl) return false

    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
    // llvmpipe / generic software rasterizers fail the check. SwiftShader is
    // allowed through to the FPS sample: it is the sanctioned headless test
    // backend (spec 12) and fast enough for the tiny probe scene.
    if (/llvmpipe|software|basic render/i.test(renderer) && !/swiftshader/i.test(renderer)) {
      return false
    }

    // Simple animated draw to sample FPS.
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'
    const fs = 'void main(){gl_FragColor=vec4(0.1,0.1,0.1,1.0);}'
    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!
      shaders.push(shader)
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(program)
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const start = performance.now()
    let frames = 0
    await new Promise<void>((resolve) => {
      const loop = () => {
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        frames++
        if (performance.now() - start < sampleMs) requestAnimationFrame(loop)
        else resolve()
      }
      requestAnimationFrame(loop)
    })
    const fps = (frames * 1000) / (performance.now() - start)
    return fps >= 30
  } catch {
    return false
  } finally {
    if (probe) {
      for (const shader of shaders) probe.deleteShader(shader)
      probe.deleteBuffer(buffer)
      probe.deleteProgram(program)
      probe.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
}
