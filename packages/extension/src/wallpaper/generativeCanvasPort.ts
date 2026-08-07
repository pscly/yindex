/** Minimal 2d surface for generative paint (testable without full DOM Canvas). */
export type GenerativeCanvas2D = {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, w: number, h: number): void
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): {
    addColorStop(offset: number, color: string): void
  }
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): {
    addColorStop(offset: number, color: string): void
  }
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
}

/** Minimal GL surface for generative paint (testable without full DOM WebGL). */
export type GenerativeGLContext = {
  readonly VERTEX_SHADER: number
  readonly FRAGMENT_SHADER: number
  readonly COMPILE_STATUS: number
  readonly LINK_STATUS: number
  readonly ARRAY_BUFFER: number
  readonly STATIC_DRAW: number
  readonly TRIANGLES: number
  readonly FLOAT: number
  createShader(type: number): object | null
  shaderSource(shader: object, source: string): void
  compileShader(shader: object): void
  getShaderParameter(shader: object, pname: number): unknown
  deleteShader(shader: object): void
  createProgram(): object | null
  attachShader(program: object, shader: object): void
  linkProgram(program: object): void
  getProgramParameter(program: object, pname: number): unknown
  deleteProgram(program: object): void
  createBuffer(): object | null
  bindBuffer(target: number, buffer: object | null): void
  bufferData(target: number, data: ArrayBufferView, usage: number): void
  deleteBuffer(buffer: object): void
  getAttribLocation(program: object, name: string): number
  getUniformLocation(program: object, name: string): object | null
  useProgram(program: object): void
  enableVertexAttribArray(index: number): void
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void
  uniform1f(location: object | null, x: number): void
  uniform2f(location: object | null, x: number, y: number): void
  uniform3f(location: object | null, x: number, y: number, z: number): void
  viewport(x: number, y: number, width: number, height: number): void
  drawArrays(mode: number, first: number, count: number): void
}

/** Visible canvas port: 2d and webgl2 bind directly on stacked visible surfaces. */
export type GenerativeCanvasPort = {
  width: number
  height: number
  getContext(contextId: "2d", options?: unknown): GenerativeCanvas2D | null
  getContext(contextId: "webgl2", options?: unknown): GenerativeGLContext | null
  getContext(
    contextId: string,
    options?: unknown,
  ): GenerativeCanvas2D | GenerativeGLContext | null
}

export function asCanvas2D(
  ctx: GenerativeCanvas2D | WebGL2RenderingContext | null,
): GenerativeCanvas2D | null {
  if (!ctx) return null
  if ("fillRect" in ctx && typeof ctx.fillRect === "function") {
    return ctx
  }
  return null
}
