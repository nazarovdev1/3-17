import { Effect } from 'postprocessing'
import { Uniform } from 'three'

/** Fisheye coordinates plus a circular aperture, all inside the rendered game. */
export class PeepholeEffect extends Effect {
  constructor(aspect: number) {
    super(
      'Peephole',
      `
      uniform float apertureAspect;
      void mainUv(inout vec2 uv) {
        vec2 q=uv-0.5; uv=0.5+q*(1.0+dot(q,q)*0.85);
      }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 q=(uv-0.5)*vec2(apertureAspect,1.0);
        float mask=1.0-smoothstep(0.42,0.48,length(q));
        outputColor=vec4(inputColor.rgb*mask,1.0);
      }`,
      { uniforms: new Map([['apertureAspect', new Uniform(aspect)]]) },
    )
  }
}
