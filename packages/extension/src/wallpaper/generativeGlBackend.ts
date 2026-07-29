import type {
  GenerativeCanvasPort,
  GenerativeGLContext,
} from "./generativeCanvasPort"
import type { DirectGLSurface } from "./generativeCanvasSurface"
import type { Rgb01 } from "./generativePresets"
import type {
  ContextLifecycle,
  FrameBackend,
  FrameDrawInput,
} from "./generativeRendererTypes"
import { GenerativeRendererError } from "./generativeRendererTypes"

// allow: SIZE_OK — GLSL pure data (not logic density)
const VERT =
  "#version 300 es\nin vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}"
const FRAG =
  "#version 300 es\nprecision mediump float;uniform vec2 u_res;uniform float u_time,u_speed,u_noise,u_aurora;uniform vec3 u_c0,u_c1,u_c2,u_c3,u_a0,u_a1;out vec4 o;float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.1;a*=.5;}return v;}void main(){vec2 uv=gl_FragCoord.xy/u_res;float t=u_time*u_speed;vec2 p=uv*u_noise+vec2(t*.05,t*.03);float f=fbm(p);float g=fbm(p+vec2(1.7,9.2)+t*.08);vec3 col=mix(u_c0,u_c1,smoothstep(.2,.8,f));col=mix(col,u_c2,smoothstep(.3,.9,g)*.65);col=mix(col,u_c3,.25*(.5+.5*sin(t*.4+uv.x*3.)));if(u_aurora>.5){col=mix(col,u_a0,smoothstep(.35,.55,fbm(uv*vec2(1.2,3.)+t*.12))*.45);col=mix(col,u_a1,smoothstep(.4,.7,fbm(uv.yx*vec2(2.,1.)-t*.1))*.35);}o=vec4(col,1.);}"

type GlResources = {
  readonly gl: GenerativeGLContext
  readonly glCanvas: GenerativeCanvasPort
  readonly vs: object
  readonly fs: object
  readonly prog: object
  readonly buf: object
  readonly loc: number
  readonly uniforms: {
    readonly res: object | null
    readonly time: object | null
    readonly speed: object | null
    readonly noise: object | null
    readonly c0: object | null
    readonly c1: object | null
    readonly c2: object | null
    readonly c3: object | null
    readonly a0: object | null
    readonly a1: object | null
    readonly aurora: object | null
  }
}

function deleteGlPartial(
  gl: GenerativeGLContext,
  parts: {
    readonly vs?: object | null
    readonly fs?: object | null
    readonly prog?: object | null
    readonly buf?: object | null
  },
): void {
  if (parts.buf) gl.deleteBuffer(parts.buf)
  if (parts.prog) gl.deleteProgram(parts.prog)
  if (parts.vs) gl.deleteShader(parts.vs)
  if (parts.fs) gl.deleteShader(parts.fs)
}

function compileShader(
  gl: GenerativeGLContext,
  type: number,
  src: string,
): object {
  const sh = gl.createShader(type)
  if (!sh) throw new GenerativeRendererError("shader_failed", "alloc")
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    throw new GenerativeRendererError("shader_failed", "compile")
  }
  return sh
}

function buildGlResources(glCanvas: GenerativeCanvasPort): GlResources {
  const gl = glCanvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  })
  if (!gl) throw new GenerativeRendererError("webgl2_unavailable", "no webgl2")

  let vs: object | null = null
  let fs: object | null = null
  let prog: object | null = null
  let buf: object | null = null
  try {
    vs = compileShader(gl, gl.VERTEX_SHADER, VERT)
    fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    prog = gl.createProgram()
    if (!prog) throw new GenerativeRendererError("shader_failed", "program")
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new GenerativeRendererError("shader_failed", "link")
    }
    buf = gl.createBuffer()
    if (!buf) throw new GenerativeRendererError("shader_failed", "buffer")
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const program: object = prog
    const loc = gl.getAttribLocation(program, "a_pos")
    const U = (n: string) => gl.getUniformLocation(program, n)
    return {
      gl,
      glCanvas,
      vs,
      fs,
      prog: program,
      buf,
      loc,
      uniforms: {
        res: U("u_res"),
        time: U("u_time"),
        speed: U("u_speed"),
        noise: U("u_noise"),
        c0: U("u_c0"),
        c1: U("u_c1"),
        c2: U("u_c2"),
        c3: U("u_c3"),
        a0: U("u_a0"),
        a1: U("u_a1"),
        aurora: U("u_aurora"),
      },
    }
  } catch (e) {
    deleteGlPartial(gl, { vs, fs, prog, buf })
    throw e
  }
}

/**
 * WebGL2 bound directly on the component-owned visible GL canvas.
 * No detached surface, no per-frame GL-to-2D readback; the Canvas2D fallback
 * lives on its own stacked canvas, so this context is never force-lost on
 * dispose (React Strict Mode remounts reuse the same canvas element).
 */
export function createWebGL2Backend(surface: DirectGLSurface): FrameBackend {
  const glCanvas = surface.canvas
  let resources = buildGlResources(glCanvas)
  let lost = false
  let lifecycle: ContextLifecycle | undefined
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    lifecycle?.lost()
  }
  const onRestored = () => {
    resources = buildGlResources(glCanvas)
    lost = false
    lifecycle?.restored()
  }
  const stopListening = surface.listenForContextChange(onLost, onRestored)

  return {
    kind: "webgl2",
    resize(w, h) {
      if (glCanvas.width !== w) glCanvas.width = w
      if (glCanvas.height !== h) glCanvas.height = h
      resources.gl.viewport(0, 0, w, h)
    },
    draw(input: FrameDrawInput) {
      if (lost) throw new GenerativeRendererError("webgl2_unavailable", "lost")
      const { gl, prog, buf, loc, uniforms: u } = resources
      const set3 = (location: object | null, color: Rgb01) =>
        gl.uniform3f(location, color[0], color[1], color[2])
      const d = input.descriptor
      const c0 = d.colors[0] ?? ([0, 0, 0] as const)
      const c1 = d.colors[1] ?? c0
      const c2 = d.colors[2] ?? c1
      const c3 = d.colors[3] ?? c2
      const a0 = d.auroraColors[0] ?? ([0, 0, 0] as const)
      const a1 = d.auroraColors[1] ?? a0
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(u.res, glCanvas.width, glCanvas.height)
      gl.uniform1f(u.time, input.timeSeconds)
      gl.uniform1f(u.speed, d.speed)
      gl.uniform1f(u.noise, d.noiseScale)
      set3(u.c0, c0)
      set3(u.c1, c1)
      set3(u.c2, c2)
      set3(u.c3, c3)
      set3(u.a0, a0)
      set3(u.a1, a1)
      gl.uniform1f(u.aurora, d.auroraColors.length > 0 ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
    setContextLifecycle(listeners) {
      lifecycle = listeners
      return () => {
        if (lifecycle === listeners) lifecycle = undefined
      }
    },
    dispose() {
      stopListening()
      const { gl, vs, fs, prog, buf } = resources
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    },
  }
}
