// Крошечный раннер фрагментных шейдеров: фуллскрин-треугольник + u_time/u_res.

const HEADER = `precision highp float;
uniform vec2 u_res;
uniform float u_time;
`;

const VERT = `attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

export class ShaderView {
  constructor(canvas, { dpr, fixed } = {}) {
    this.canvas = canvas;
    this.fixed = !!fixed;
    this.dpr = dpr || Math.min(window.devicePixelRatio || 1, 2);
    this.gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.ok = !!this.gl;
    this.program = null;
    this.raf = 0;
    this.playing = false;
    this.timeOffset = Math.random() * 90;
    if (this.ok) this._initQuad();
  }

  _initQuad() {
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this._buf = buf;
  }

  compile(fragSource) {
    if (!this.ok) return { ok: false, log: 'WebGL недоступен' };
    const gl = this.gl;
    const make = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(log || 'неизвестная ошибка компиляции');
      }
      return sh;
    };
    try {
      const vs = make(gl.VERTEX_SHADER, VERT);
      const fs = make(gl.FRAGMENT_SHADER, HEADER + fragSource);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        return { ok: false, log: log || 'ошибка линковки' };
      }
      if (this.program) gl.deleteProgram(this.program);
      this.program = prog;
      this.uRes = gl.getUniformLocation(prog, 'u_res');
      this.uTime = gl.getUniformLocation(prog, 'u_time');
      return { ok: true, log: '' };
    } catch (e) {
      return { ok: false, log: String(e.message || e) };
    }
  }

  resize() {
    const c = this.canvas;
    const w = Math.max(1, Math.round(c.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(c.clientHeight * this.dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  frame(tSeconds) {
    if (!this.ok || !this.program) return;
    const gl = this.gl;
    if (!this.fixed) this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTime, tSeconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  renderOnce(t) { this.frame(t == null ? this.timeOffset : t); }

  play() {
    if (this.playing || !this.ok) return;
    this.playing = true;
    const t0 = performance.now();
    const loop = (now) => {
      if (!this.playing) return;
      this.frame(this.timeOffset + (now - t0) / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.pause();
    if (!this.ok) return;
    const ext = this.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    this.ok = false;
  }
}

// ── Лимит одновременно живых артефактов (механика ленты) ────────
const MAX_LIVE = 4;
const live = new Set();

export function requestPlay(view) {
  if (live.has(view)) return;
  if (live.size >= MAX_LIVE) {
    const oldest = live.values().next().value;
    oldest.pause();
    live.delete(oldest);
  }
  live.add(view);
  view.play();
}

export function releasePlay(view) {
  live.delete(view);
  view.pause();
}

// ── Генерация статичных постеров через общий offscreen-раннер ───
let posterRunner = null;
const posterCache = new Map();

export function posterDataURL(key, fragSource, w = 420, h = 300, t = 4) {
  if (posterCache.has(key)) return posterCache.get(key);
  if (!posterRunner) {
    posterRunner = new ShaderView(document.createElement('canvas'), { dpr: 1, fixed: true });
  }
  const c = posterRunner.canvas;
  c.width = w; c.height = h;
  const res = posterRunner.compile(fragSource);
  let url = null;
  if (res.ok && posterRunner.ok) {
    posterRunner.frame(t);
    try { url = c.toDataURL('image/png'); } catch (e) { url = null; }
  }
  posterCache.set(key, url);
  return url;
}
