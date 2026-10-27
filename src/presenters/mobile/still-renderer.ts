export interface StillMotion {
  x: number
  y: number
}
export interface StillOptions {
  motion: StillMotion
  elapsed: number
  reduced: boolean
  tense: boolean
  snow: boolean
  breath: boolean
  reflection?: { motion: StillMotion; center: StillMotion }
}
/** Cover projection is shared by the shader, Canvas fallback and hotspot layout. */
export function coverPoint(x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / 1080, height / 1920)
  return { x: (x - 0.5) * 1080 * scale + width / 2, y: (y - 0.5) * 1920 * scale + height / 2 }
}
const vertex = `#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`
const fragment = `#version 300 es
precision highp float;
uniform sampler2D picture;uniform sampler2D depthMap;uniform vec2 crop;uniform vec2 movement;
uniform vec2 reflectionMovement;uniform vec2 reflectionCenter;
uniform float time;uniform float motion;uniform float tense;uniform float snow;uniform float breath;
in vec2 uv;out vec4 result;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 base=(vec2(uv.x,1.-uv.y)-.5)*crop+.5;
 float depth=texture(depthMap,base).r;
 float push=1.+motion*tense*.018*min(time/12.,1.);
 vec2 region=abs(base-reflectionCenter)/vec2(.13,.15);
 float mirror=1.-smoothstep(.9,1.,max(region.x,region.y));
 vec2 displacement=mix(movement,reflectionMovement,mirror);
 vec2 at=(base-.5)/push+.5+displacement*(.25+depth*.75);
 vec3 color=texture(picture,clamp(at,vec2(.001),vec2(.999))).rgb;
 float flicker=1.-motion*tense*.012*(sin(time*5.1)*sin(time*13.7)+1.);
 color*=flicker;
 vec2 dust=vec2(uv.x,uv.y-time*.006);vec2 cell=floor(dust*vec2(80.,120.));
 float mote=step(.997,hash(cell))*max(0.,1.-length(fract(dust*vec2(80.,120.))-.5)*7.);
 color+=mote*.025*motion;
 vec2 flakes=vec2(uv.x+sin(time*.4)*.02,uv.y+time*.035);
 float flake=step(.986,hash(floor(flakes*vec2(35.,55.))))*max(0.,1.-length(fract(flakes*vec2(35.,55.))-.5)*6.);
 color+=flake*.18*snow*motion;
 float fog=exp(-length((uv-vec2(.5,.15+fract(time/4.)*.1))*vec2(4.,7.)))*max(0.,sin(time*1.4))*.045;
 color+=fog*breath*motion;
 result=vec4(color,1.);
}`

export function createStillRenderer(
  canvas: HTMLCanvasElement,
  image: ImageBitmap,
  depth: ImageBitmap,
  forceCanvas = false,
) {
  const gl = forceCanvas
    ? null
    : canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power',
      })
  if (!gl) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return {
      kind: 'canvas' as const,
      draw(options: StillOptions) {
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
        const push = options.reduced
          ? 1
          : 1 + Math.min(options.elapsed / 12, 1) * (options.tense ? 0.018 : 0)
        const w = image.width * scale * push,
          h = image.height * scale * push
        ctx.drawImage(
          image,
          (canvas.width - w) / 2 - options.motion.x * 0.45,
          (canvas.height - h) / 2 - options.motion.y * 0.45,
          w,
          h,
        )
      },
      dispose() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      },
    }
  }
  const shader = (type: number, source: string) => {
    const item = gl.createShader(type)!
    gl.shaderSource(item, source)
    gl.compileShader(item)
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      gl.deleteShader(item)
      throw new Error('Still shader compilation failed')
    }
    return item
  }
  const vs = shader(gl.VERTEX_SHADER, vertex),
    fs = shader(gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Still shader link failed')
  gl.useProgram(program)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  )
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const textures = [image, depth].map((bitmap, unit) => {
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    gl.uniform1i(gl.getUniformLocation(program, unit ? 'depthMap' : 'picture'), unit)
    return texture
  })
  const uniform = (name: string) => gl.getUniformLocation(program, name)
  const u = Object.fromEntries(
    [
      'crop',
      'movement',
      'reflectionMovement',
      'reflectionCenter',
      'time',
      'motion',
      'tense',
      'snow',
      'breath',
    ].map((name) => [name, uniform(name)]),
  )
  return {
    kind: 'webgl2' as const,
    draw(options: StillOptions) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
      gl.uniform2f(
        u.crop!,
        canvas.width / (image.width * scale),
        canvas.height / (image.height * scale),
      )
      gl.uniform2f(
        u.movement!,
        options.reduced ? 0 : options.motion.x * 0.00065,
        options.reduced ? 0 : options.motion.y * 0.00065,
      )
      gl.uniform1f(u.time!, options.elapsed)
      gl.uniform2f(
        u.reflectionMovement!,
        options.reduced ? 0 : (options.reflection?.motion.x ?? options.motion.x) * 0.00065,
        options.reduced ? 0 : (options.reflection?.motion.y ?? options.motion.y) * 0.00065,
      )
      gl.uniform2f(
        u.reflectionCenter!,
        options.reflection?.center.x ?? -4,
        options.reflection?.center.y ?? -4,
      )
      gl.uniform1f(u.motion!, options.reduced ? 0 : 1)
      gl.uniform1f(u.tense!, Number(options.tense))
      gl.uniform1f(u.snow!, Number(options.snow))
      gl.uniform1f(u.breath!, Number(options.breath))
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
    dispose() {
      textures.forEach((texture) => gl.deleteTexture(texture))
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
