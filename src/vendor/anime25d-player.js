// Anime2.5DRig player for the game (MIT, Copyright (c) 2026 hakoniwa; see anime25d-player.LICENSE).
// Plays a rig baked by scripts/assets/bake-rig.mjs (<name>.json + <name>.png) on a <canvas>.
// The mesh deformation, hair springs, blink and idle motion are carried over from the tool's
// lib/app.js, lib/renderer.js and lib/runtime.js (v2.0.0, commit 7ddbd99). Only the parts the game needs are kept:
// no PSD parsing, editor, camera, microphone or recording.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function meshSize(w, h, cell) {
  let nx = Math.max(2, Math.round(w / cell)), ny = Math.max(2, Math.round(h / cell));
  while ((nx + 1) * (ny + 1) > 65000) { if (nx >= ny) nx = Math.max(2, Math.floor(nx * 0.9)); else ny = Math.max(2, Math.floor(ny * 0.9)); }
  return { nx, ny };
}
// Semi-implicit Euler with fixed 120 Hz sub-steps.
function spring(s, target, k, damping, dt) {
  const count = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / count;
  for (let i = 0; i < count; i++) { s.v += (-k * (s.x - target) - damping * s.v) * h; s.x += s.v * h; }
}
const baseName = n => (n === 'eye_close2' ? n : n.replace(/_\d+$/, ''));

// Parameters and their ranges (the tool's sliders).
const RANGES = {
  angleX: [-1, 1], angleY: [-1, 1], angleZ: [-1, 1], eyeOpenL: [0, 1], eyeOpenR: [0, 1], eyeX: [-1, 1], eyeY: [-1, 1],
  brow: [-1, 1], mouthOpen: [0, 1], mouthForm: [-1, 1], mouthCY: [-1, 1], body: [-1, 1], physAmp: [0, 3], soft: [0, 3],
  browAngL: [-1, 1], browAngR: [-1, 1], browAngSym: [-1, 1], bangL: [-1, 1], bangC: [-1, 1], bangR: [-1, 1],
  armY: [-1, 1], armPos: [-1, 1], bust: [0, 4], bustY: [-3, 3], irisScale: [0.5, 1.3], mouthEase: [0, 1], eyeEase: [0, 1],
  fhAmp: [0, 3], fhSoft: [0, 2], eyeCY: [-1, 1], eyeCAng: [-1, 1], mouthCAng: [-1, 1], eyeScaleL: [0.5, 1.5],
  eyeScaleR: [0.5, 1.5], mouthScale: [0.5, 1.5], accAmp: [0, 3]
};
export const DEFAULT_PARAMS = Object.freeze({
  angleX: 0, angleY: 0, angleZ: 0, eyeOpenL: 1, eyeOpenR: 1, eyeX: 0, eyeY: 0, brow: 0,
  mouthOpen: 0, mouthForm: 0, mouthCY: 0, body: 0, physAmp: 2, soft: 2,
  browAngL: 0, browAngR: 0, browAngSym: 0, bangL: 0, bangC: 0, bangR: 0,
  armY: 0, armPos: 0, bust: 2.5, bustY: 1, irisScale: 1, mouthEase: 0.72, eyeEase: 0.3,
  fhAmp: 2, fhSoft: 0.4, eyeCY: 0, eyeCAng: 0, mouthCAng: 0, eyeScaleL: 1, eyeScaleR: 1, mouthScale: 1, accAmp: 1
});

// ---------- WebGL renderer (lib/renderer.js, plus a view offset and one shared texture) ----------
const VS = 'attribute vec2 aPos;attribute vec2 aUV;uniform vec2 uRes;uniform vec2 uOff;varying vec2 vUV;' +
  'void main(){vUV=aUV;vec2 c=(aPos-uOff)/uRes*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.0,1.0);}';
const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
  'varying vec2 vUV;uniform sampler2D uTex;uniform sampler2D uMask;uniform vec2 uRes;uniform float uAlpha;' +
  'uniform vec2 uMaskCh;uniform float uUseMask;uniform float uMaskOut;' +
  'void main(){vec4 c=texture2D(uTex,vUV);' +
  'if(uMaskOut>0.5){gl_FragColor=vec4(c.a);return;}' +
  'float m=1.0;if(uUseMask>0.5){m=dot(texture2D(uMask,gl_FragCoord.xy/uRes).rg,uMaskCh);}' +
  'gl_FragColor=c*(uAlpha*m);}';

function createRenderer(gl) {
  const shader = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const loc = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUV') };
  for (const u of ['uRes', 'uOff', 'uAlpha', 'uTex', 'uMask', 'uMaskCh', 'uUseMask', 'uMaskOut']) loc[u] = gl.getUniformLocation(prog, u);
  gl.enableVertexAttribArray(loc.pos); gl.enableVertexAttribArray(loc.uv);
  gl.uniform1i(loc.uTex, 0); gl.uniform1i(loc.uMask, 1);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  let maskTex = null, maskFbo = null, maskW = 0, maskH = 0, atlas = null;

  function texture(image) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function ensureMask(w, h) {
    if (maskTex && maskW === w && maskH === h) return;
    if (maskTex) gl.deleteTexture(maskTex); if (maskFbo) gl.deleteFramebuffer(maskFbo);
    maskTex = texture(null);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    maskFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, maskFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, maskTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    maskW = w; maskH = h;
  }
  function upload(L, mesh) {
    L.vboPos = gl.createBuffer(); L.vboUV = gl.createBuffer(); L.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, L.vboPos); gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, L.vboUV); gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, L.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    L.nIdx = mesh.indices.length;
  }
  function positions(L, data) { gl.bindBuffer(gl.ARRAY_BUFFER, L.vboPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); }
  function bind(L) {
    gl.bindBuffer(gl.ARRAY_BUFFER, L.vboPos); gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, L.vboUV); gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, L.ibo);
  }
  function draw(frame) {
    const W = frame.width, H = frame.height;
    gl.useProgram(prog); gl.uniform2f(loc.uRes, W, H); gl.uniform2f(loc.uOff, frame.offsetX, frame.offsetY); gl.uniform1f(loc.uUseMask, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas);
    const hasMask = { L: false, R: false };
    if (frame.masks.length && frame.items.some(i => i.clip)) {
      ensureMask(W, H);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.bindFramebuffer(gl.FRAMEBUFFER, maskFbo); gl.viewport(0, 0, W, H);
      gl.colorMask(true, true, true, true); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(loc.uMaskOut, 1); gl.uniform1f(loc.uAlpha, 1);
      for (const m of frame.masks) {
        gl.colorMask(m.side === 'L', m.side === 'R', false, false); hasMask[m.side] = true;
        bind(m.L); gl.drawElements(gl.TRIANGLES, m.L.nIdx, gl.UNSIGNED_SHORT, 0);
      }
      gl.colorMask(true, true, true, true); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.uniform1f(loc.uMaskOut, 0);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.activeTexture(gl.TEXTURE0);
    let masked = false;
    for (const it of frame.items) {
      bind(it.L); gl.uniform1f(loc.uAlpha, it.alpha);
      const clip = it.clip && hasMask[it.clip];
      if (clip) { gl.uniform1f(loc.uUseMask, 1); gl.uniform2f(loc.uMaskCh, it.clip === 'L' ? 1 : 0, it.clip === 'R' ? 1 : 0); masked = true; }
      else if (masked) { gl.uniform1f(loc.uUseMask, 0); masked = false; }
      gl.drawElements(gl.TRIANGLES, it.L.nIdx, gl.UNSIGNED_SHORT, 0);
    }
    gl.uniform1f(loc.uUseMask, 0);
  }
  return { upload, positions, draw, setAtlas(image) { atlas = texture(image); } };
}

// ---------- loading ----------
export async function loadRig(jsonUrl, pngUrl) {
  const [data, image] = await Promise.all([
    fetch(jsonUrl).then(r => { if (!r.ok) throw new Error(`rig ${r.status}`); return r.json(); }),
    new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = pngUrl; })
  ]);
  if (data.format !== 'anime25d-baked') throw new Error('not a baked rig');
  return { data, image };
}

// ---------- player ----------
const FRONTISH = { 'front hair': 1, 'side hair': 1, 'ahoge': 1 };

export class RigPlayer {
  // canvas: a <canvas>; rig: from loadRig(). The canvas is sized to the rig's view (the portrait area).
  constructor(canvas, rig) {
    const { data, image } = rig;
    this.canvas = canvas;
    this.view = data.view;
    canvas.width = data.view.w; canvas.height = data.view.h;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    this.renderer = createRenderer(gl);
    this.renderer.setAtlas(image);
    this.layers = this.prepare(data, image);
    this.setAnchors(data.anchors);
    this.T = { ...DEFAULT_PARAMS };       // targets the game sets
    this.cur = { ...DEFAULT_PARAMS };     // smoothed values
    this.bounce = { x: 0, v: 0, dy: 0 };
    this.hasEyeClose2 = this.layers.some(L => L.bn === 'eye_close2');
    this.blinkT = -1; this.blinkVariant = 1; this.blinkBounceStarted = false; this.irisBounceT = -1;
    this.time = 0; this.nextBlink = 1.8;
    this.mouthTarget = 0; this.mouthV = 0;
    this.idle = true; this.blink = true; this.phys = true;
    this.paused = true; this.raf = 0; this.last = 0;
    this.frame = this.frame.bind(this);
    this.step(1 / 60); this.draw();
  }

  prepare(data, image) {
    const W = data.canvas.w, aw = image.width, ah = image.height, out = [];
    for (const src of data.layers) {
      const L = { ...src, visible: true };
      const cell = (L.phys ? 30 : 42) * Math.max(0.6, W / 768);
      const { nx, ny } = meshSize(L.w, L.h, cell), nv = (nx + 1) * (ny + 1);
      const base = new Float32Array(nv * 2), uv = new Float32Array(nv * 2);
      let k = 0;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        base[k] = L.x + L.w * i / nx; base[k + 1] = L.y + L.h * j / ny;
        uv[k] = (L.ax + L.w * i / nx) / aw; uv[k + 1] = (L.ay + L.h * j / ny) / ah; k += 2;
      }
      const idx = new Uint16Array(nx * ny * 6); let q = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;
      }
      L.base = base; L.cur = new Float32Array(base);
      L.bn = baseName(L.name.replace(/_(l|r)$/, ''));
      if (L.strands && L.strands.length) {
        const S = L.strands, nS = S.length;
        let spacing = 120;
        if (nS > 1) { const ds = []; for (let s = 1; s < nS; s++) ds.push(S[s].x - S[s - 1].x); ds.sort((a, b) => a - b); spacing = ds[ds.length >> 1]; }
        const sig = Math.max(1, spacing * 0.6);
        L.sw = new Float32Array(nv * nS); L.su = new Float32Array(nv);
        L.spr = S.map((s, i) => ({ stiff: { x: 0, v: 0, dx: 0 }, soft: { x: 0, v: 0, dx: 0 }, phase: i * 1.37 + L.z }));
        for (let v = 0; v < nv; v++) {
          const x = base[v * 2], y = base[v * 2 + 1]; let tot = 0;
          for (let s = 0; s < nS; s++) { const w = Math.exp(-Math.pow((x - S[s].x) / sig, 2)); L.sw[v * nS + s] = w; tot += w; }
          let rY = 0, tY = 0;
          if (tot > 1e-6) { for (let s = 0; s < nS; s++) { L.sw[v * nS + s] /= tot; rY += L.sw[v * nS + s] * S[s].rootY; tY += L.sw[v * nS + s] * S[s].tipY; } }
          else { L.sw[v * nS] = 1; rY = S[0].rootY; tY = S[0].tipY; }
          L.su[v] = clamp((y - rY) / Math.max(1, tY - rY), 0, 1);
        }
      }
      this.renderer.upload(L, { positions: L.cur, uvs: uv, indices: idx });
      out.push(L);
    }
    return out;
  }

  setAnchors(anchors) {
    const A = this.A = JSON.parse(JSON.stringify(anchors));
    this.FS = A.faceScale; this.NP = A.neckPivot; this.BP = A.bodyPivot; this.FC = { x: A.face.cx, y: A.face.cy };
    const fh = A.face.y1 - A.face.y0;
    this.CHEST = { cx: this.NP.cx, cy: A.neckBottom + fh * 0.60, rx: Math.max(1, (A.face.x1 - A.face.x0) * 0.60), ry: Math.max(1, fh * 0.45) };
    for (const L of this.layers) {
      if (L.bn !== 'front hair' || !L.su) { L.bw = null; continue; }
      const fw = A.face.x1 - A.face.x0, fcx = A.face.cx, f = 36, b1 = fcx - fw * 0.22, b2 = fcx + fw * 0.22, nv = L.base.length / 2;
      L.bw = new Float32Array(nv * 3);
      for (let v = 0; v < nv; v++) { const x = L.base[v * 2], s1 = smooth((x - b1) / f + 0.5), s2 = smooth((x - b2) / f + 0.5); L.bw[v * 3] = 1 - s1; L.bw[v * 3 + 1] = s1 * (1 - s2); L.bw[v * 3 + 2] = s2; }
    }
  }

  // Target values for any of DEFAULT_PARAMS' keys; missing keys go back to their defaults.
  setParams(values = {}) { this.T = { ...DEFAULT_PARAMS, ...values }; }
  // 0..1, smoothed like the tool's auto talk.
  setMouth(level) { this.mouthTarget = clamp(level, 0, 1); }

  start() {
    if (!this.paused) return;
    this.paused = false; this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() { this.paused = true; cancelAnimationFrame(this.raf); }

  frame(now) {
    if (this.paused) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now;
    this.step(dt); this.draw();
  }

  step(dt) {
    this.time += dt;
    const t = this.time, tgt = { ...this.T };
    if (this.idle) {
      tgt.angleX += 0.13 * Math.sin(t * 0.42) + 0.05 * Math.sin(t * 1.13);
      tgt.angleY += 0.08 * Math.sin(t * 0.31 + 1.7);
      tgt.angleZ += 0.07 * Math.sin(t * 0.23 + 0.5);
      tgt.body += 0.10 * Math.sin(t * 0.19 + 2.1);
    }
    this.mouthV += (this.mouthTarget - this.mouthV) * Math.min(1, dt * 22);
    tgt.mouthOpen = Math.max(tgt.mouthOpen, this.mouthV);
    if (this.blink) {
      if (this.blinkT < 0 && t > this.nextBlink) {
        this.blinkT = 0; this.blinkBounceStarted = false;
        this.blinkVariant = this.hasEyeClose2 && Math.random() < 0.2 ? 2 : 1;
        this.nextBlink = t + 1.6 + Math.random() * 3.8; if (Math.random() < 0.18) this.nextBlink = t + 0.28;
      }
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        const d = this.blinkT, hold = this.blinkVariant === 2 ? 3.4 : 0.34; let v;
        if (d < 0.08) v = 1 - d / 0.08; else if (d < 0.08 + hold) v = 0; else if (d < 0.24 + hold) {
          v = (d - 0.08 - hold) / 0.16;
          if (!this.blinkBounceStarted && v > 0.12) { this.blinkBounceStarted = true; this.irisBounceT = 0; }
        } else { v = 1; this.blinkT = -1; }
        tgt.eyeOpenL = Math.min(tgt.eyeOpenL, v); tgt.eyeOpenR = Math.min(tgt.eyeOpenR, v);
      }
    }
    if (this.irisBounceT >= 0) { this.irisBounceT += dt; if (this.irisBounceT > 0.52) this.irisBounceT = -1; }
    const kSmooth = 1 - Math.exp(-dt * 14), cur = this.cur;
    for (const k in cur) { tgt[k] = clamp(tgt[k], ...RANGES[k]); cur[k] += (tgt[k] - cur[k]) * kSmooth; }
    const e = { ...cur };
    e.irisBounceX = 1; e.irisBounceY = 1;
    if (this.irisBounceT >= 0) {
      const p = this.irisBounceT / 0.52, damp = Math.exp(-2.2 * p);
      const scale = 1 + 0.18 * Math.sin(p * Math.PI * 4.0) * damp, squash = 0.10 * Math.sin(p * Math.PI * 4.0 + Math.PI / 2) * damp;
      e.irisBounceX = scale * (1 + squash); e.irisBounceY = scale * (1 - squash);
    }
    e.breath = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 3.4);
    e.breathHead = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 3.4 - 0.6);
    this.updateSprings(e, t, dt, this.idle);
    this.e = e;
  }

  updateSprings(e, t, dt, wind) {
    const { FS, NP, FC, BP } = this;
    const headDX = (e.angleX * 14 + e.angleZ * 0.07 * (NP.cy - FC.y)) * FS;
    const bodyDX = e.body * 0.028 * (BP.cy - NP.cy) * 0.35 + e.angleX * 14 * 0.16 * FS;
    for (const L of this.layers) {
      if (!L.spr) continue;
      const base = L.group === 'head' ? headDX : bodyDX, windScale = L.phys === 'sway' && L.group !== 'head' ? 2.5 : 1;
      for (const sp of L.spr) {
        const w = wind ? (1.8 * Math.sin(t * 0.8 + sp.phase) + 1.0 * Math.sin(t * 1.9 + sp.phase * 2.3)) * windScale : 0;
        const txv = base + w * FS;
        spring(sp.stiff, txv, 70, 9, dt); sp.stiff.dx = -(sp.stiff.x - txv) * 2.2;
        spring(sp.soft, txv, 16, 1.3, dt); sp.soft.dx = -(sp.soft.x - txv) * 3.0;
      }
    }
    const bustTgt = (e.breath * 3.0 - e.angleY * 6.0 + e.body * 4.0) * FS;
    spring(this.bounce, bustTgt, 140, 4.2, dt); this.bounce.dy = -(this.bounce.x - bustTgt) * 3.0;
  }

  fadeAlpha(L, e, alt) {
    if (!L.fade) return 1;
    if (L.fade === 'eyeOpen') { const v = L.side === 'L' ? e.eyeOpenL : e.eyeOpenR; return smooth((v - (0.10 + e.eyeEase * 0.45)) / 0.15); }
    if (L.fade === 'eyeClose' || L.fade === 'eyeClose2') {
      const alternate = this.blinkVariant === 2 && alt[L.side];
      if ((L.fade === 'eyeClose2') !== alternate) return 0;
      const v = L.side === 'L' ? e.eyeOpenL : e.eyeOpenR; return 1 - smooth((v - (0.10 + e.eyeEase * 0.45)) / 0.15);
    }
    if (L.fade === 'mouthOpen') return smooth((e.mouthOpen - (0.05 + e.mouthEase * 0.35)) / 0.12);
    if (L.fade === 'mouthClose') return 1 - smooth((e.mouthOpen - (0.05 + e.mouthEase * 0.35)) / 0.12);
    return 1;
  }

  deform(L, e) {
    const { A, FS, NP, BP, FC, CHEST, bounce } = this;
    const b = L.base, o = L.cur, n = b.length;
    const isHead = L.group === 'head';
    const az = e.angleZ * 0.07, cz = Math.cos(az), sz = Math.sin(az);
    const ab = e.body * 0.028, cb = Math.cos(ab), sb = Math.sin(ab);
    const bn = L.bn, eyeSide = L.side, EA = eyeSide === 'L' ? A.eyeL : (eyeSide === 'R' ? A.eyeR : null);
    const vOpen = eyeSide === 'L' ? e.eyeOpenL : e.eyeOpenR;
    const mo = e.mouthOpen, mHalfW = (A.mouth.x1 - A.mouth.x0) / 2;
    const nS = L.strands ? L.strands.length : 0;
    const bcx = L.x + L.w / 2, bcy = L.y + L.h / 2;
    const kind = L.phys === 'sway' ? 'acc' : FRONTISH[bn] ? 'fh' : 'bh';
    const physOn = nS && this.phys && L.su;
    const ampK = kind === 'acc' ? e.accAmp * 1.4 : kind === 'fh' ? e.fhAmp : e.physAmp;
    const softK = kind === 'acc' ? 0.8 : kind === 'fh' ? e.fhSoft : e.soft;
    const powA = kind === 'acc' ? 1.2 : kind === 'fh' ? 1.8 : 2.1;
    for (let k = 0; k < n; k += 2) {
      let x = b[k], y = b[k + 1];
      const vi = k >> 1;
      if (EA && (bn === 'eye_close' || bn === 'eye_close2')) {
        const sE = eyeSide === 'L' ? e.eyeScaleL : e.eyeScaleR;
        if (sE !== 1) { const cxE = (EA.x0 + EA.x1) / 2, cyE = (EA.y0 + EA.y1) / 2; x = cxE + (x - cxE) * sE; y = cyE + (y - cyE) * sE; }
      }
      if (bn === 'mouth_open' || bn === 'mouth_close') {
        const sM = e.mouthScale;
        if (sM !== 1) { x = A.mouth.cx + (x - A.mouth.cx) * sM; y = A.mouth.cy + (y - A.mouth.cy) * sM; }
      }
      if (L.fade === 'eyeOpen' && EA) {
        if (bn === 'irides') {
          const isc = e.irisScale, ibx = e.irisBounceX || 1, iby = e.irisBounceY || 1;
          x = EA.icx + (x - EA.icx) * isc * ibx; y = EA.icy + (y - EA.icy) * isc * iby;
          x += e.eyeX * 11 * FS; y += e.eyeY * 6 * FS;
          const tl = smooth((0.32 - vOpen) / 0.32);
          y = EA.closeY + (y - EA.closeY) * (1 - 0.80 * tl);
        } else {
          y = EA.closeY + (y - EA.closeY) * (1 - 0.85 * (1 - vOpen));
        }
      }
      if ((L.fade === 'eyeClose' || L.fade === 'eyeClose2') && EA) {
        y -= vOpen * 3; y += e.eyeCY * 14 * FS;
        const thE = e.eyeCAng * 0.3 * (eyeSide === 'L' ? 1 : -1);
        if (thE) { const ct = Math.cos(thE), st = Math.sin(thE), rx = x - bcx, ry = y - bcy; x = bcx + rx * ct - ry * st; y = bcy + rx * st + ry * ct; }
      }
      if (bn === 'eyebrow') {
        y += (-e.brow * 9 + (1 - vOpen) * 3.5) * FS;
        const th = (eyeSide === 'L' ? (e.browAngL + e.browAngSym) : (e.browAngR - e.browAngSym)) * 0.30;
        if (th) { const ct = Math.cos(th), st = Math.sin(th), rx = x - bcx, ry = y - bcy; x = bcx + rx * ct - ry * st; y = bcy + rx * st + ry * ct; }
      }
      if (L.fade === 'mouthOpen') {
        y = A.mouth.y0 + (y - A.mouth.y0) * (0.5 + 0.5 * mo);
        const q = Math.pow(Math.abs(x - A.mouth.cx) / (mHalfW + 4), 1.5);
        y -= e.mouthForm * 6 * FS * (q - 0.35);
      }
      if (L.fade === 'mouthClose') {
        y += e.mouthCY * 14 * FS;
        const thM = e.mouthCAng * 0.35;
        if (thM) { const ct = Math.cos(thM), st = Math.sin(thM), rx = x - A.mouth.cx, ry = y - A.mouth.cy; x = A.mouth.cx + rx * ct - ry * st; y = A.mouth.cy + rx * st + ry * ct; }
      }
      if (bn === 'face' && y > A.mouth.cy) y += mo * 6 * FS * smooth((y - A.mouth.cy) / Math.max(1, A.face.y1 - A.mouth.cy));
      let hw = isHead ? 1 : (L.group === 'body' ? 0.16 : 0);
      if (bn === 'neck') hw = 0.55 * smooth((A.neckBottom - y) / Math.max(1, A.neckBottom - A.neckTop));
      if (hw > 0) {
        const rx = x - NP.cx, ry = y - NP.cy, rx2 = rx * cz - ry * sz, ry2 = rx * sz + ry * cz;
        x += (rx2 - rx) * hw; y += (ry2 - ry) * hw;
        const dd = L.depth;
        x += hw * FS * (e.angleX * (14 + 40 * (dd - 1)) + e.angleX * (NP.cy - y) * 0.028);
        y += hw * FS * (-e.angleY * (9 + 30 * (dd - 1)) - e.angleY * (dd - 1) * (y - FC.y) * 0.05);
      }
      y -= (L.group === 'body' ? e.breath * 2.0 : e.breathHead * 1.6) * FS;
      if (bn === 'topwear' && y < CHEST.cy) y -= e.breath * 2.2 * FS * smooth((CHEST.cy - y) / (CHEST.ry * 2));
      if (bn === 'topwear') x = NP.cx + (x - NP.cx) * (1 + e.breath * 0.003);
      if (bn === 'topwear') {
        const gx = (x - CHEST.cx) / CHEST.rx, gy = (y - (CHEST.cy + e.bustY * 70 * FS)) / CHEST.ry;
        y += bounce.dy * e.bust * Math.exp(-gx * gx - gy * gy);
      }
      if (bn === 'handwear') {
        const w = smooth((y - L.y) / L.h * 1.15);
        y -= e.armY * 30 * FS * w; y += e.armPos * 40 * FS; x += e.armY * 6 * FS * w * (x < NP.cx ? 1 : -1);
      }
      if (L.bw) { const m = Math.pow(L.su[vi], 1.4) * 22 * FS; x += (e.bangL * L.bw[vi * 3] + e.bangC * L.bw[vi * 3 + 1] + e.bangR * L.bw[vi * 3 + 2]) * m; }
      if (physOn) {
        const u = kind === 'fh' ? Math.min(1, L.su[vi] * 1.6) : L.su[vi];
        const amp = Math.pow(u, powA) * ampK, softMix = Math.min(1, Math.pow(u, 1.2) * softK);
        let dx = 0;
        for (let s = 0; s < nS; s++) { const w = L.sw[vi * nS + s]; if (w < 0.001) continue; const sp = L.spr[s]; dx += w * (sp.stiff.dx * (1 - softMix) + sp.soft.dx * softMix); }
        x += dx * amp; y += Math.abs(dx) * amp * 0.12;
      }
      o[k] = x; o[k + 1] = y;
    }
    if (Math.abs(ab) > 1e-4) {
      for (let k = 0; k < n; k += 2) { const rx = o[k] - BP.cx, ry = o[k + 1] - BP.cy; o[k] = BP.cx + rx * cb - ry * sb; o[k + 1] = BP.cy + rx * sb + ry * cb; }
    }
  }

  draw() {
    const e = this.e, alt = { L: false, R: false };
    for (const L of this.layers) if (L.fade === 'eyeClose2' && L.side && L.visible && L.opacity > 0) alt[L.side] = true;
    const items = [], masks = [];
    for (const L of this.layers) {
      const isMask = L.bn === 'eyewhite' && !!L.side;
      const alpha = L.visible ? this.fadeAlpha(L, e, alt) * L.opacity : 0;
      if (alpha < 0.004 && !isMask) continue;
      this.deform(L, e); this.renderer.positions(L, L.cur);
      if (isMask) masks.push({ L, side: L.side });
      if (alpha >= 0.004) items.push({ L, alpha, clip: L.bn === 'irides' && L.side ? L.side : null });
    }
    this.renderer.draw({ width: this.view.w, height: this.view.h, offsetX: this.view.x, offsetY: this.view.y, masks, items });
  }
}
