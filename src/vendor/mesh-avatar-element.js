/*! fflate
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const ee = (a, e, t) => {
  (typeof a != "number" || !Number.isFinite(a)) && t.push(`${e}: expected a finite number`);
}, Ae = (a, e, t) => {
  ee(a, e, t), typeof a == "number" && a <= 0 && t.push(`${e}: must be positive`);
}, ye = (a, e, t) => {
  Ae(a, e, t), typeof a == "number" && !Number.isInteger(a) && t.push(`${e}: expected an integer`);
}, Se = (a, e, t) => {
  ee(a, e, t), typeof a == "number" && !Number.isInteger(a) && t.push(`${e}: expected an integer`);
}, ct = (a, e, t) => {
  (typeof a != "string" || !a.trim()) && t.push(`${e}: expected a non-empty string`);
}, fe = (a, e = 0, t = 1 / 0) => (r, i, s) => {
  if (!Array.isArray(r)) {
    s.push(`${i}: expected an array`);
    return;
  }
  (r.length < e || r.length > t) && s.push(`${i}: expected ${e}..${t} items`), r.forEach((p, w) => a(p, `${i}[${w}]`, s));
}, me = fe(ee, 2, 2), se = (a, e, t) => {
  me(a, e, t), Array.isArray(a) && a.length === 2 && a[0] >= a[1] && t.push(`${e}: start must be less than end`);
}, ne = (a, e = []) => (t, r, i) => {
  if (!t || typeof t != "object" || Array.isArray(t)) {
    i.push(`${r}: expected an object`);
    return;
  }
  const s = t;
  for (const [p, w] of Object.entries(a))
    s[p] === void 0 && e.includes(p) || w(s[p], `${r}.${p}`, i);
}, Le = { cx: ee, cy: ee, rx: Ae, ry: Ae }, pe = ne(Le), Pe = fe(me, 3), ft = fe(me, 2), Ie = (a, e, t) => {
  ee(a, e, t), typeof a == "number" && (a < 0 || a > 1) && t.push(`${e}: must be between 0 and 1`);
}, Nt = (a) => ne({
  version: (e, t, r) => {
    e !== 1 && r.push(`${t}: only version 1 is supported`);
  },
  image: ne({ width: ye, height: ye }),
  head: ne({
    ...Le,
    shiftX: ee,
    shiftY: ee,
    pivotX: ee,
    pivotY: ee,
    maxRoll: ee,
    weightBand: se,
    turnBand: se
  }),
  body: ne({
    pivotX: ee,
    pivotY: ee,
    maxRoll: ee,
    breathBand: se,
    rollBand: se,
    chest: pe,
    shoulders: fe(pe)
  }),
  face: ne({
    nose: pe,
    mouth: pe,
    eyeA: pe,
    eyeB: pe,
    earL: pe,
    earR: pe,
    brow: ne({ ...Le, band: se }),
    jaw: ne({ ...Le, band: se })
  }),
  buns: ne({ bunL: pe, bunR: pe }, ["bunL", "bunR"]),
  eyes: fe(ne({
    opening: Pe,
    roi: Pe,
    x0: ee,
    x1: ee,
    top: fe(ee, 24, 24),
    bot: fe(ee, 24, 24)
  }, a ? ["x0", "x1", "top", "bot"] : []), 2, 2),
  mouth: ne({
    cx: ee,
    cy: ee,
    angle: ee,
    halfLen: Ae,
    bow: ee,
    area: ne({ ...Le, angle: ee })
  }),
  cheeks: fe(me, 2, 2),
  strands: fe(ne({ name: ct, nodes: ft, sigma: Ae, k: Ae, max: Ae })),
  accessories: fe(ne({
    name: ct,
    pivot: me,
    tip: me,
    split: Ie,
    box: fe(Se, 4, 4),
    color: ne({ redness: Ie, minRed: ee })
  })),
  hand: ne({
    outline: Pe,
    jaw: ft,
    jawRange: se,
    background: Pe,
    elbow: me,
    wrist: me,
    knuckle: me,
    contact: me,
    forearmShare: Ie,
    armBand: se,
    wristBand: se,
    handBand: se,
    fingerXBand: se,
    fingerYBand: se,
    pinBand: se
  }),
  mesh: ne({
    baseCell: ye,
    fine: ne({
      x0: Se,
      x1: Se,
      y0: Se,
      y1: Se,
      cell: ye
    }),
    handCell: ye,
    tasselCell: ye,
    eyeBallCell: ye,
    eyeCell: ye,
    spriteCell: ye
  }),
  view: ne({ padTop: ee, padSide: ee, gazeCenter: me }, ["gazeCenter"])
}, ["buns", "strands", "accessories", "hand"]);
function Rt(a, e = {}) {
  const t = [];
  if (Nt(e.draft ?? !1)(a, "rig", t), t.length) return t;
  const r = a;
  r.eyes.forEach((i, s) => {
    const p = ["x0", "x1", "top", "bot"];
    if (!(e.draft && p.every((w) => i[w] === void 0))) {
      if (p.some((w) => i[w] === void 0)) {
        t.push(`rig.eyes[${s}]: supply all x0/x1/top/bot fields or omit all in a draft`);
        return;
      }
      i.x0 >= i.x1 && t.push(`rig.eyes[${s}].x1: must exceed x0`), i.top.some((w, E) => w > i.bot[E]) && t.push(`rig.eyes[${s}].top: must not exceed bottom curve`);
    }
  }), (r.mesh.fine.x0 >= r.mesh.fine.x1 || r.mesh.fine.y0 >= r.mesh.fine.y1) && t.push("rig.mesh.fine: rectangle must have positive area"), (r.view.padTop <= -1 || r.view.padTop >= 1 || r.view.padSide <= -0.5) && t.push("rig.view: margins must leave a positive viewport");
  for (const [i, s] of (r.strands ?? []).entries())
    s.nodes.some((p, w) => w > 0 && p[0] === s.nodes[w - 1][0] && p[1] === s.nodes[w - 1][1]) && t.push(`rig.strands[${i}].nodes: consecutive nodes must differ`);
  for (const [i, s] of (r.accessories ?? []).entries())
    (s.box[0] < 0 || s.box[1] < 0 || s.box[2] > r.image.width || s.box[3] > r.image.height) && t.push(`rig.accessories[${i}].box: rectangle must stay inside the image`), (s.split <= 0 || s.split >= 1) && t.push(`rig.accessories[${i}].split: must be strictly between 0 and 1`), s.pivot.every((p, w) => p === s.tip[w]) && t.push(`rig.accessories[${i}].tip: must differ from pivot`), (s.box[0] >= s.box[2] || s.box[1] >= s.box[3]) && t.push(`rig.accessories[${i}].box: rectangle must have positive area`);
  return t;
}
function at(a) {
  const e = Rt(a);
  if (e.length) throw new Error(`Invalid rig:
${e.join(`
`)}`);
  return structuredClone(a);
}
const Xe = [
  { id: "angleX", label: "Face angle X", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleY", label: "Face angle Y", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "angleZ", label: "Face roll", min: -30, max: 30, def: 0, group: "Head and body" },
  { id: "bodyAngleX", label: "Body angle X", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "bodyAngleZ", label: "Body roll", min: -10, max: 10, def: 0, group: "Head and body" },
  { id: "breath", label: "Breath", min: 0, max: 1, def: 0, group: "Head and body" },
  { id: "eyeLOpen", label: "Left eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeROpen", label: "Right eye open", min: 0, max: 1.25, def: 1, group: "Eyes and brows" },
  { id: "eyeSmile", label: "Eye smile", min: 0, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeX", label: "Gaze X", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "gazeY", label: "Gaze Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browY", label: "Brow Y", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "browAngle", label: "Brow angle", min: -1, max: 1, def: 0, group: "Eyes and brows" },
  { id: "mouthOpen", label: "Mouth open", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "mouthForm", label: "Mouth form (i to o)", min: -1, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "blush", label: "Blush", min: 0, max: 1, def: 0, group: "Mouth and cheeks" },
  { id: "armAngle", label: "Arm angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "handAngle", label: "Wrist angle", min: -10, max: 10, def: 0, group: "Hand" },
  { id: "fingerTap", label: "Finger tap", min: 0, max: 1, def: 0, group: "Hand" }
];
function It(a) {
  const e = { w: a.image.width, h: a.image.height }, t = (m, g, v) => v ? Math.exp(-(((m - v.cx) / v.rx) ** 2 + ((g - v.cy) / v.ry) ** 2)) : 0, r = 24, i = a.eyes;
  function s(m, g) {
    const v = Math.min(1, Math.max(0, g)) * (r - 1), L = Math.min(Math.floor(v), r - 2), B = v - L;
    return m[L] + (m[L + 1] - m[L]) * B;
  }
  function p(m, g, v, L) {
    g = Math.min(1, Math.max(0, g));
    const B = s(m.top, g), C = s(m.bot, g), R = 1 - v, d = 4 * g * (1 - g), M = s(m.bot, 0.5) - s(m.top, 0.5), I = m.top[0] + (m.top[r - 1] - m.top[0]) * g - 0.3 * M * d, Z = Math.max(B, C + 1 + (I - C - 1) * L);
    return [(Z - B) * Math.max(R, -0.07), R > 0 ? (Z - C) * R * L : 0];
  }
  const w = [[-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]], E = 5;
  function A(m, g, v, L) {
    let B = 0, C = 0;
    for (const [I, Z] of w) {
      const [Q, ae] = p(m, (g + I * E - m.x0) / (m.x1 - m.x0), v, L);
      B += Q * Z / 9, C += ae * Z / 9;
    }
    const R = Math.min(1, Math.max(0, (g - m.x0) / (m.x1 - m.x0))), d = s(m.top, R), M = s(m.bot, R);
    return { top: d, bot: M, b: 1 - v, lid: d + B, bc: M + C };
  }
  function T(m, g, v, L, B, C) {
    const R = A(m, v, B, C);
    return g === "lash" ? R.lid - (R.top - L) * (1 - 0.3 * Math.min(1, Math.max(0, R.b))) : g === "low" ? L + (R.bc - R.bot) : g === "crease" ? L + (R.lid - R.top) * 0.22 : L;
  }
  function l(m, g, v) {
    const L = Math.min(1, Math.max(0, 1 - g));
    return m === "low" ? 1 - Math.min(1, L * v * 1.2) : m === "crease" ? 1 - 0.45 * L : 1;
  }
  const x = a.mouth, F = a.cheeks, b = a.head, h = a.body, f = (m, g, v) => {
    const L = Math.min(1, Math.max(0, (v - m) / (g - m)));
    return L * L * (3 - 2 * L);
  };
  function c(m, g) {
    return 1 - f(...b.weightBand, g);
  }
  function n(m, g) {
    return 1 - f(...b.turnBand, g);
  }
  const o = a.strands ?? [];
  function O(m, g, v) {
    let L = 1 / 0, B = 0;
    const C = v.length - 1;
    for (let R = 0; R < C; R++) {
      const [d, M] = v[R], [I, Z] = v[R + 1], Q = I - d, ae = Z - M, re = Math.min(1, Math.max(0, ((m - d) * Q + (g - M) * ae) / (Q * Q + ae * ae))), ie = Math.hypot(m - d - Q * re, g - M - ae * re);
      ie < L && (L = ie, B = (R + re) / C);
    }
    return [L, B];
  }
  function u(m, g, v) {
    if (v < 0.02) return [];
    const L = [];
    let B = 0;
    o.forEach((R, d) => {
      const [M, I] = O(m, g, R.nodes), Z = Math.exp(-((M / R.sigma) ** 2));
      Z < 0.02 || (L.push([d, Z, I]), B += Z);
    });
    const C = Math.max(1, B);
    return L.map(([R, d, M]) => [R, v * d / C * f(0.04, 0.55, M), M]);
  }
  function y(m, g, v = 1) {
    return {
      head: c(m, g),
      turn: n(m, g),
      strands: u(m, g, v),
      bunL: t(m, g, a.buns?.bunL),
      bunR: t(m, g, a.buns?.bunR),
      brow: t(m, g, a.face.brow) * (1 - f(...a.face.brow.band, g)),
      // chin below the mouth line drops a little when the mouth opens
      jaw: t(m, g, a.face.jaw) * f(...a.face.jaw.band, g),
      // per-feature depth for head turns (nose sticks out most, ears sit at the back)
      nose: t(m, g, a.face.nose),
      mouth: t(m, g, a.face.mouth),
      eyeA: t(m, g, a.face.eyeA),
      eyeB: t(m, g, a.face.eyeB),
      earR: t(m, g, a.face.earR),
      earL: t(m, g, a.face.earL),
      chest: t(m, g, h.chest),
      breath: 1 - f(...h.breathBand, g),
      shoulder: h.shoulders.reduce((L, B) => L + t(m, g, B), 0)
    };
  }
  function Y(m, g, v, L) {
    const B = (m - b.cx) / b.rx, C = (g - b.cy) / b.ry, R = 1 - B * B - C * C;
    if (R <= 0) return [0, 0];
    const d = f(0, 0.84, R);
    return [v * b.shiftX * d, -L * b.shiftY * d];
  }
  function U(m, g, v, L) {
    const B = Math.cos(L), C = Math.sin(L), R = m[0] - g, d = m[1] - v;
    m[0] = g + R * B - d * C, m[1] = v + R * C + d * B;
  }
  function z(m, g, v, L = g) {
    const B = Y(m[0], m[1], v.angleX / 30, v.angleY / 30);
    m[0] += B[0] * L, m[1] += B[1] * L, !(g <= 0) && U(m, b.pivotX, b.pivotY, -v.angleZ / 30 * b.maxRoll * g);
  }
  function _(m, g, v, L = 0, B = 1, C = 0) {
    const R = v.breath;
    m[1] -= R * (5 * B + 4 * C), m[0] += (m[0] - h.chest.cx) * 0.012 * R * L, m[0] += v.bodyAngleX / 10 * (7 + 9 * L), U(m, h.pivotX, h.pivotY, -v.bodyAngleZ / 10 * h.maxRoll * (1 - f(...h.rollBand, g)));
  }
  function P(m, g, v, L, B, C) {
    const R = C;
    R[0] = m, R[1] = g;
    const d = B.gain;
    for (const [Z, Q, ae] of v.strands) {
      const re = B.strands?.[Z];
      if (!re) continue;
      const ie = ae * 3, de = Math.min(2, Math.floor(ie)), Be = ie - de;
      R[0] += (re[de][0] + (re[de + 1][0] - re[de][0]) * Be) * Q * d, R[1] += (re[de][1] + (re[de + 1][1] - re[de][1]) * Be) * Q * d;
    }
    if (R[0] += (B.bunL[0] * v.bunL + B.bunR[0] * v.bunR) * d, R[1] += (B.bunL[1] * v.bunL + B.bunR[1] * v.bunR) * d, R[1] -= L.browY * 7 * v.brow, v.brow > 0.01) {
      const Z = L.browAngle * 0.12 * v.brow;
      R[1] += (m - a.face.brow.cx) * Math.sin(Z);
    }
    R[1] += L.mouthOpen * 3.5 * v.jaw;
    const M = L.angleX / 30, I = L.angleY / 30;
    return R[0] += M * (8 * v.nose + 5 * v.mouth) + (m - a.face.eyeA.cx) * 0.12 * M * v.eyeA - (m - a.face.eyeB.cx) * 0.12 * M * v.eyeB - M * 9 * v.earR + M * 4 * v.earL - M * 10 * (v.bunL + v.bunR), R[1] -= I * (6 * v.nose + 3 * v.mouth), R[1] += (g - a.face.eyeA.cy) * -0.06 * Math.abs(I) * v.eyeA + (g - a.face.eyeB.cy) * -0.06 * Math.abs(I) * v.eyeB, z(R, v.head, L, v.turn), _(R, g, L, v.chest, v.breath, v.shoulder), R;
  }
  const S = a.hand, X = S?.elbow ?? [0, 0], N = S?.wrist ?? [0, 0], J = S?.knuckle ?? [0, 0], j = S?.contact ?? [0, 0], H = S?.forearmShare ?? 0;
  function W(m, g) {
    return S ? {
      arm: 1 - f(...S.armBand, g),
      wrist: 1 - f(...S.wristBand, g),
      hand: 1 - f(...S.handBand, g),
      finger: f(...S.fingerXBand, m) * (1 - f(...S.fingerYBand, g)),
      pinBottom: f(...S.pinBand, g)
    } : { arm: 0, wrist: 0, hand: 0, finger: 0, pinBottom: 0 };
  }
  const k = (m, g, v, L) => {
    const B = m[0] - g[0], C = m[1] - g[1];
    return [g[0] + B * v - C * L, g[1] + B * L + C * v];
  }, $ = (m) => Math.atan2(m[1], m[0]);
  function D(m) {
    const g = [...j];
    z(g, c(...j), m, n(...j)), _(g, j[1], m, 0, 1, 0);
    const v = [...X];
    _(v, X[1], m, 0, 0, 0);
    const L = ($([g[0] - v[0], g[1] - v[1]]) - $([j[0] - X[0], j[1] - X[1]])) * H, B = Math.cos(L), C = Math.sin(L), R = (Q) => {
      const ae = k(Q, X, B, C);
      return [ae[0] + v[0] - X[0], ae[1] + v[1] - X[1]];
    }, d = R(N), M = R(j), I = $([g[0] - d[0], g[1] - d[1]]) - $([M[0] - d[0], M[1] - d[1]]), Z = Math.min(1.03, Math.max(0.97, Math.hypot(g[0] - d[0], g[1] - d[1]) / Math.hypot(M[0] - d[0], M[1] - d[1])));
    return { tr: R, w: d, b: I, k: Z };
  }
  function V(m, g, v, L, B, C) {
    let R = [m, g];
    R = k(R, J, Math.cos(L.fingerTap * 0.07 * v.finger), Math.sin(L.fingerTap * 0.07 * v.finger));
    const d = -L.handAngle / 10 * 0.045 * v.wrist, M = -L.armAngle / 10 * 0.015 * v.arm;
    R = k(R, N, Math.cos(d), Math.sin(d)), R = k(R, X, Math.cos(M), Math.sin(M)), R = B.tr(R);
    const I = B.b * v.hand, Z = 1 + (B.k - 1) * v.hand;
    return R = k(R, B.w, Math.cos(I) * Z, Math.sin(I) * Z), R[1] += (g - R[1]) * v.pinBottom, C[0] = R[0], C[1] = R[1], C;
  }
  const K = a.accessories ?? [];
  function q(m, g, v, L) {
    const B = y(m.pivot[0], m.pivot[1]);
    return P(m.pivot[0], m.pivot[1], B, g, v, L);
  }
  return { IMG: e, EYES: i, MOUTH: x, CHEEKS: F, STRANDS: o, TASSELS: K, headWeight: c, turnWeight: n, baseWeights: y, deformBase: P, applyHead: z, applyBody: _, handWeights: W, handFrame: D, deformHand: V, eyePartY: T, eyePartAlpha: l, tasselAnchor: q };
}
function Dt(a, e, t, r = !1) {
  const i = r ? Math.max(e, t) * 2 : 1, s = new Float32Array(a.length), p = Math.SQRT2;
  for (let w = 0; w < t; w++) for (let E = 0; E < e; E++) {
    const A = w * e + E;
    a[A] <= 3 || (s[A] = Math.min(
      E ? s[A - 1] + 1 : i,
      w ? s[A - e] + 1 : i,
      E && w ? s[A - e - 1] + p : i,
      w && E + 1 < e ? s[A - e + 1] + p : i
    ));
  }
  for (let w = t - 1; w >= 0; w--) for (let E = e - 1; E >= 0; E--) {
    const A = w * e + E;
    !a[A] || a[A] <= 3 || (s[A] = Math.min(
      s[A],
      E + 1 < e ? s[A + 1] + 1 : i,
      w + 1 < t ? s[A + e] + 1 : i,
      E && w + 1 < t ? s[A + e - 1] + p : i,
      E + 1 < e && w + 1 < t ? s[A + e + 1] + p : i
    ));
  }
  return s;
}
function De(a, e, t) {
  return Math.exp(-(((a - t.cx) / t.rx) ** 2 + ((e - t.cy) / t.ry) ** 2));
}
function Zt(a, e, t) {
  const r = ((a - t.head.cx) / t.head.rx) ** 2 + ((e - t.head.cy) / t.head.ry) ** 2;
  let i = t.head.rx * 0.8 * Math.sqrt(Math.max(0, 1 - r)) + t.body.chest.rx * 0.23 * De(a, e, t.body.chest);
  i += t.face.nose.rx * 0.2 * De(a, e, t.face.nose);
  for (const [s, p] of t.cheeks) i += t.head.rx * 0.012 * De(a, e, { cx: s, cy: p, rx: t.head.rx * 0.3, ry: t.head.ry * 0.16 });
  return i;
}
function ze(a, e, t, r) {
  const i = new Float32Array(a.length), s = new Float32Array(a.length), p = (w, E, A, T, l, x) => {
    for (let F = 0; F < T; F++) {
      const b = F * x;
      let h = 0, f = 0;
      for (let c = 0; c < Math.min(r, A - 1) + 1; c++)
        h += w[b + c * l], f++;
      for (let c = 0; c < A; c++) {
        E[b + c * l] = h / f;
        const n = c + r + 1, o = c - r;
        n < A && (h += w[b + n * l], f++), o >= 0 && (h -= w[b + o * l], f--);
      }
    }
  };
  return p(a, i, e, t, 1, e), p(i, s, t, e, e, 1), s;
}
function Wt(a, e, t, r) {
  const i = ze(a, t, r, 1), s = ze(a, t, r, 6), p = new Float32Array(a.length);
  for (let A = 0; A < p.length; A++) p[A] = e[A] > 128 ? i[A] - s[A] : 0;
  const w = new Float32Array(a.length * 2), E = (A, T) => p[Math.max(0, Math.min(r - 1, T)) * t + Math.max(0, Math.min(t - 1, A))];
  for (let A = 0; A < r; A++) for (let T = 0; T < t; T++) {
    const l = A * t + T;
    e[l] <= 128 || (w[2 * l] = Math.max(-1, Math.min(1, -(E(T + 1, A) - E(T - 1, A)) * 4)), w[2 * l + 1] = Math.max(-1, Math.min(1, -(E(T, A + 1) - E(T, A - 1)) * 4)));
  }
  return w;
}
function Ht(a, e, t, r, i, s = !0, p) {
  const w = !!i && r[0] === 0 && r[1] === 0 && r[2] === i.image.width && r[3] === i.image.height, E = Dt(a, e, t, w), A = new Float32Array(a.length), T = r[2] / e, l = r[3] / t, x = Math.min(T, l), F = Math.min(r[2], r[3]) * 0.08;
  for (let n = 0; n < t; n++) for (let o = 0; o < e; o++) {
    const O = n * e + o;
    A[O] = (s ? Math.sqrt(E[O] * x * F) * 0.55 : 0) + (i ? Zt(r[0] + (o + 0.5) * T, r[1] + (n + 0.5) * l, i) : 0);
  }
  const b = Math.max(1, Math.round(Math.min(e, t) * 0.02));
  A.set(ze(ze(A, e, t, b), e, t, b));
  const h = p ? Wt(p, a, e, t) : null, f = new Uint8Array(e * t * 4), c = (n, o) => A[Math.max(0, Math.min(t - 1, o)) * e + Math.max(0, Math.min(e - 1, n))];
  for (let n = 0; n < t; n++) for (let o = 0; o < e; o++) {
    const O = -(c(o + 2, n) - c(o - 2, n)) / (4 * T), u = -(c(o, n + 2) - c(o, n - 2)) / (4 * l), y = Math.hypot(O, u, 1), Y = (n * e + o) * 4, U = n * e + o;
    f[Y] = Math.round((O / y * 0.5 + 0.5) * 255), f[Y + 1] = Math.round((u / y * 0.5 + 0.5) * 255), f[Y + 2] = Math.round(((h?.[2 * U] ?? 0) * 0.5 + 0.5) * 255), f[Y + 3] = Math.round(((h?.[2 * U + 1] ?? 0) * 0.5 + 0.5) * 255);
  }
  return f;
}
const mt = /* @__PURE__ */ new WeakMap();
function Vt(a, e, t, r) {
  const i = JSON.stringify([e, t.head, t.body.chest, t.face.nose, t.cheeks, r]), s = mt.get(a);
  if (s?.key === i) return { ...s, computed: !1, ms: 0 };
  const p = performance.now(), w = Math.min(1, 512 / Math.max(a.width, a.height)), E = Math.max(1, Math.round(a.width * w)), A = Math.max(1, Math.round(a.height * w)), T = document.createElement("canvas");
  T.width = E, T.height = A;
  const l = T.getContext("2d", { willReadFrequently: !0 });
  l.drawImage(a, 0, 0, E, A);
  const x = l.getImageData(0, 0, E, A).data, F = new Uint8Array(E * A), b = new Float32Array(E * A);
  for (let f = 0; f < F.length; f++)
    F[f] = x[4 * f + 3], b[f] = (0.2126 * x[4 * f] + 0.7152 * x[4 * f + 1] + 0.0722 * x[4 * f + 2]) / 255;
  const h = { key: i, data: Ht(F, E, A, e, t, r, r ? b : void 0), width: E, height: A };
  return mt.set(a, h), { ...h, computed: !0, ms: performance.now() - p };
}
const Ee = Object.freeze({
  enabled: !1,
  x: 0.2,
  y: 0.2,
  z: 0.45,
  color: 16777215,
  strength: 0.8,
  intensity: 0.8,
  ambient: 0.4,
  mode: "soft",
  shadow: !1,
  reach: 1.2,
  ambientColor: 15659256,
  softness: 0.45,
  specular: 0.12,
  rim: 0.3,
  detail: 0.4
}), dt = {
  x: [0, 1],
  y: [0, 1],
  z: [0.1, 2],
  color: [0, 16777215],
  strength: [0, 1],
  intensity: [0, 2],
  ambient: [0, 1],
  reach: [0.2, 3],
  ambientColor: [0, 16777215],
  softness: [0, 1],
  specular: [0, 1],
  rim: [0, 1],
  detail: [0, 1]
}, Gt = /* @__PURE__ */ new Set(["color", "ambientColor"]);
function qt(a) {
  if (!a || typeof a != "object" || Array.isArray(a)) return null;
  const e = a;
  if (Object.keys(e).length !== Object.keys(Ee).length || Object.keys(e).some((r) => !(r in Ee)) || ![!0, !1].includes(e.enabled) || ![!0, !1].includes(e.shadow) || !["soft", "cel"].includes(e.mode)) return null;
  const t = { ...Ee, enabled: e.enabled, shadow: e.shadow, mode: e.mode };
  for (const r of Object.keys(dt)) {
    const i = e[r], [s, p] = dt[r];
    if (typeof i != "number" || !Number.isFinite(i) || Gt.has(r) && !Number.isInteger(i)) return null;
    t[r] = Math.max(s, Math.min(p, i));
  }
  return t;
}
const je = -0.1, Jt = 0.9, Kt = 1, Qt = 1.06;
function ea(a, e) {
  return [(0.5 - a) * 0.12, (0.5 - e) * 0.12];
}
function ta(a, e, t, r) {
  const i = a * Math.PI / 180, s = e * Math.PI / 180, p = -t / 30 * r, w = Math.cos(i), E = Math.sin(i), A = Math.cos(s), T = Math.sin(s), l = Math.cos(p), x = Math.sin(p);
  return [
    l * w,
    x * w,
    -E,
    l * E * T - x * A,
    x * E * T + l * A,
    w * T,
    l * E * A + x * T,
    x * E * A - l * T,
    w * A
  ];
}
class aa {
  constructor(e, t) {
    this.gl = e, this.program = t(e, `#version 300 es
      out vec2 vUv;
      void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D uTex; uniform vec2 uStep; uniform vec2 uShift; uniform int uPass;
      float alphaAt(vec2 p) { if (any(lessThan(p, vec2(0))) || any(greaterThan(p, vec2(1)))) return 0.0; return texture(uTex, p).a; }
      void main() {
        if (uPass == 2) { o = texture(uTex, vUv); return; }
        vec2 p = vUv - uShift;
        float a = alphaAt(p) * 0.227027;
        a += (alphaAt(p + uStep * 1.384615) + alphaAt(p - uStep * 1.384615)) * 0.316216;
        a += (alphaAt(p + uStep * 3.230769) + alphaAt(p - uStep * 3.230769)) * 0.070270;
        o = uPass == 0 ? vec4(0, 0, 0, a) : vec4(vec3(0.035, 0.045, 0.065) * a * 0.28, a * 0.28);
      }`), this.vao = e.createVertexArray(), this.targets = [];
  }
  target(e, t) {
    const r = this.gl, i = r.createTexture(), s = r.createFramebuffer();
    if (r.bindTexture(r.TEXTURE_2D, i), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, e, t, 0, r.RGBA, r.UNSIGNED_BYTE, null), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE), r.bindFramebuffer(r.FRAMEBUFFER, s), r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0, r.TEXTURE_2D, i, 0), r.checkFramebufferStatus(r.FRAMEBUFFER) !== r.FRAMEBUFFER_COMPLETE) throw new Error("Shadow framebuffer unavailable");
    return { texture: i, framebuffer: s };
  }
  begin(e, t) {
    const r = this.gl;
    (this.width !== e || this.height !== t) && (this.clearTargets(), this.width = e, this.height = t, this.targets = [this.target(e, t), this.target(Math.ceil(e / 2), Math.ceil(t / 2))]), r.bindFramebuffer(r.FRAMEBUFFER, this.targets[0].framebuffer), r.viewport(0, 0, e, t), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT);
  }
  composite(e) {
    const t = this.gl, { prog: r, u: i } = this.program, s = this.width, p = this.height;
    t.useProgram(r), t.bindVertexArray(this.vao), t.activeTexture(t.TEXTURE0), t.uniform1i(i.uTex, 0), t.disable(t.BLEND), t.bindFramebuffer(t.FRAMEBUFFER, this.targets[1].framebuffer), t.viewport(0, 0, Math.ceil(s / 2), Math.ceil(p / 2)), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(i.uPass, 0), t.uniform2f(i.uShift, 0, 0), t.uniform2f(i.uStep, 3 / s, 0), t.drawArrays(t.TRIANGLES, 0, 3), t.bindFramebuffer(t.FRAMEBUFFER, null), t.viewport(0, 0, s, p), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT), t.enable(t.BLEND), t.bindTexture(t.TEXTURE_2D, this.targets[1].texture);
    const w = ea(e.x, e.y);
    t.uniform1i(i.uPass, 1), t.uniform2f(i.uShift, w[0], -w[1]), t.uniform2f(i.uStep, 0, 3 / p), t.drawArrays(t.TRIANGLES, 0, 3), t.bindTexture(t.TEXTURE_2D, this.targets[0].texture), t.uniform1i(i.uPass, 2), t.drawArrays(t.TRIANGLES, 0, 3), t.bindVertexArray(null);
  }
  clearTargets() {
    for (const e of this.targets)
      this.gl.deleteTexture(e.texture), this.gl.deleteFramebuffer(e.framebuffer);
    this.targets = [];
  }
  destroy() {
    this.clearTargets(), this.gl.deleteProgram(this.program.prog), this.gl.deleteVertexArray(this.vao);
  }
}
function ra(a, e) {
  const { IMG: t, EYES: r, MOUTH: i, CHEEKS: s } = a, p = `#version 300 es
  in vec2 aPos; in vec2 aUv;
  uniform vec2 uScale; uniform vec2 uOffset;
  out vec2 vUv;
  void main() { vUv = aUv; gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); }`, w = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 outColor;
  uniform sampler2D uTex;
  uniform vec4 uRect;        // layer rect in source px
  uniform int uFace;
  uniform float uAlpha;
  uniform vec4 uEyeBox[2];   // x0, x1, -, -
  uniform float uEyeTop[48]; // 2 eyes x EYE_N samples
  uniform float uEyeBot[48];
  uniform vec4 uEyeState[2]; // open, smile, ballX(px), ballY(px)
  uniform vec4 uMouth;       // cx, cy, angle, halfLen
  uniform vec4 uMouthState;  // open, form, bow, -
  uniform vec4 uCheeks;      // x0, y0, x1, y1
  uniform float uCheek;

  const int EYE_N = 24;
  float crv(int e, bool top, float u) {
    float f = clamp(u, 0.0, 1.0) * float(EYE_N - 1);
    int i = min(int(floor(f)), EYE_N - 2);
    float t = f - float(i);
    int k = e * EYE_N + i;
    return top ? mix(uEyeTop[k], uEyeTop[k + 1], t) : mix(uEyeBot[k], uEyeBot[k + 1], t);
  }

  // Upper lid line and lower lid line of eye e at column u, for the current open/smile state.
  // Must match eyeLids() in rig.js, which moves the lash meshes to the same lines.
  // Must match eyeLidsRaw() / eyeLids() in rig.js.
  vec2 eyeLidsRaw(int e, float u) {
    u = clamp(u, 0.0, 1.0);
    vec4 st = uEyeState[e];
    float top = crv(e, true, u), bot = crv(e, false, u);
    float b = 1.0 - st.x, smile = st.y, hump = 4.0 * u * (1.0 - u);
    float H = crv(e, false, 0.5) - crv(e, true, 0.5);
    float arc = mix(uEyeTop[e * EYE_N], uEyeTop[e * EYE_N + EYE_N - 1], u) - 0.3 * H * hump;
    float closed = max(top, bot + 1.0 + (arc - bot - 1.0) * smile);
    return vec2((closed - top) * max(b, -0.07), b > 0.0 ? (closed - bot) * b * smile : 0.0);
  }

  vec2 eyeLids(int e, float u, float top, float bot) {
    vec4 box = uEyeBox[e];
    float du = 5.0 / (box.y - box.x);
    vec2 raw = eyeLidsRaw(e, u);
    vec2 d = (eyeLidsRaw(e, u - 2.0 * du) + 2.0 * eyeLidsRaw(e, u - du) + 3.0 * raw
            + 2.0 * eyeLidsRaw(e, u + du) + eyeLidsRaw(e, u + 2.0 * du)) / 9.0;
    // for hiding the ball take whichever closes more: the smoothed lash can sit a little
    // above the raw lid near the corners, and the gap must show lid skin, not eye white
    return vec2(top + max(d.x, raw.x), bot + min(d.y, raw.y));
  }

  vec4 texAt(vec2 p) { return texture(uTex, (p - uRect.xy) / uRect.zw); }

  // Eye white + iris layer: shown only between the lids (the lids cover it, it never squashes);
  // the iris slides inside the opening for the gaze.
  vec4 eyeBall(int e, vec2 p) {
    vec4 box = uEyeBox[e]; vec4 st = uEyeState[e];
    float u = clamp((p.x - box.x) / (box.y - box.x), 0.0, 1.0);
    float top = crv(e, true, u), bot = crv(e, false, u);
    vec2 lids = eyeLids(e, u, top, bot);
    float v = clamp((p.y - top) / max(bot - top, 1.0), 0.0, 1.0);
    float w = sqrt(4.0 * u * (1.0 - u)) * sqrt(4.0 * v * (1.0 - v));
    vec4 c = texAt(p - vec2(st.z, st.w) * w);
      // the lash covers ~2px of the ball's upper edge, so the cut can sit under it (no seam)
    return c * smoothstep(lids.x - 1.0, lids.x + 0.5, p.y) * (1.0 - smoothstep(lids.y - 0.9, lids.y + 0.6, p.y));
  }

  vec4 mouth(vec2 p, vec4 base) {
    float open = uMouthState.x;
    if (open < 0.01) return base;
    vec2 d = vec2(cos(uMouth.z), sin(uMouth.z)), n = vec2(-d.y, d.x);
    vec2 r = p - uMouth.xy;
    float s = dot(r, d) / uMouth.w, t = dot(r, n);
    float form = uMouthState.y;                       // -1 wide "i" .. +1 round "o"
    float wf = mix(0.78, 0.46, clamp(form * 0.5 + 0.5, 0.0, 1.0));
    float k = 1.0 - (s / wf) * (s / wf);
    if (k <= 0.0) return base;
    float line = uMouthState.z * (1.0 - s * s);
    float hk = pow(k, mix(0.55, 0.85, clamp(form, 0.0, 1.0)));
    float H = mix(20.0, 26.0, clamp(form, 0.0, 1.0));
    float up = line - 0.6 - open * 2.5 * hk;
    float lo = line + open * H * hk;
    float cov = smoothstep(-0.7, 0.7, t - up) * smoothstep(-0.7, 0.7, lo - t);
    if (cov <= 0.0) return base;
    float tv = clamp((t - up) / max(lo - up, 1.0), 0.0, 1.0);
    vec3 col = mix(vec3(0.24, 0.05, 0.08), vec3(0.48, 0.15, 0.19), tv);
    float tongue = smoothstep(0.5, 0.78, tv) * (1.0 - smoothstep(0.45, 0.8, abs(s) / wf));
    col = mix(col, vec3(0.86, 0.44, 0.47), tongue * 0.9);
    float teeth = (1.0 - smoothstep(0.12, 0.22, tv)) * smoothstep(0.25, 0.45, open) * (1.0 - smoothstep(0.55, 0.85, abs(s) / wf));
    col = mix(col, vec3(0.99, 0.96, 0.94), teeth);
    float rim = 1.0 - smoothstep(0.6, 1.8, lo - t);
    col = mix(col, vec3(0.36, 0.09, 0.11), rim * 0.85);
    return vec4(mix(base.rgb, col, cov), 1.0);
  }

  void main() {
    vec2 p = uRect.xy + vUv * uRect.zw;
    vec4 c;
    if (uFace == 1) {
      c = mouth(p, texAt(p));
      float blush = exp(-dot((p - uCheeks.xy) / vec2(48.0, 22.0), (p - uCheeks.xy) / vec2(48.0, 22.0)))
                  + exp(-dot((p - uCheeks.zw) / vec2(40.0, 20.0), (p - uCheeks.zw) / vec2(40.0, 20.0)));
      c.rgb = mix(c.rgb, c.rgb * vec3(1.0, 0.62, 0.64) , clamp(blush * uCheek * 0.55, 0.0, 1.0) * c.a);
    } else if (uFace >= 2) {
      c = eyeBall(uFace - 2, p);
    } else {
      c = texAt(p);
    }
    outColor = c * uAlpha;
  }`, E = p.replace("out vec2 vUv;", "in float aHeadWeight; out float vHeadWeight; out vec2 vScreen; out vec2 vUv;").replace("vUv = aUv;", "vHeadWeight = aHeadWeight; vScreen = vec2((aPos.x * uScale.x + uOffset.x + 1.0) * 0.5, (1.0 - aPos.y * uScale.y - uOffset.y) * 0.5); vUv = aUv;"), A = w.replace("uniform sampler2D uTex;", `uniform sampler2D uTex;
    uniform sampler2D uNormal; in float vHeadWeight; in vec2 vScreen;
    uniform mat3 uHeadRotation; uniform vec3 uLight; uniform vec3 uLightColor; uniform vec3 uAmbientColor;
    uniform vec4 uLighting; uniform vec4 uSurface; uniform float uAspect; uniform int uCel;`).replace("outColor = c * uAlpha;", `
      // RG hold the smooth surface normal, BA the painting's relief (see lighting/normals.ts).
      vec4 encoded = texture(uNormal, vUv);
      vec2 base = encoded.rg * 2.0 - 1.0;
      vec3 n = vec3(base, sqrt(max(0.0, 1.0 - dot(base, base))));
      n = normalize(n + vec3((encoded.ba * 2.0 - 1.0) * uSurface.w * ${Jt.toFixed(3)}, 0.0));
      n = normalize(mix(n, uHeadRotation * n, vHeadWeight));
      vec2 toLight = (uLight.xy - vScreen) * vec2(uAspect, 1.0);
      vec3 light = normalize(vec3(toLight, uLight.z));
      float ndl = dot(n, light);
      float diffuse;
      if (uCel == 1) {
        float w = 0.01 + uSurface.x * 0.08;
        diffuse = 0.2 + 0.45 * smoothstep(${je.toFixed(3)} - w, ${je.toFixed(3)} + w, ndl) + 0.35 * smoothstep(0.55 - w, 0.55 + w, ndl);
      } else {
        float s = 0.05 + uSurface.x * 0.5;
        diffuse = smoothstep(${je.toFixed(3)} - s, ${je.toFixed(3)} + s, ndl) * (0.35 + 0.65 * max(0.0, ndl));
      }
      float reach = dot(toLight, toLight) / (uLighting.w * uLighting.w);
      float attenuation = 1.0 / (1.0 + reach);
      vec3 radiance = uLightColor * uLighting.y * attenuation;
      // A light close to the surface may brighten a little, but must not bleach painted colours.
      vec3 irradiance = min(uAmbientColor * uLighting.z + radiance * diffuse, vec3(${Qt.toFixed(3)}));
      // Painted shadows are deeper versions of the base colour, not grey: multiply by the colour
      // itself as the surface turns away from the light.
      vec3 albedo = c.rgb / max(c.a, 1e-4);
      float dark = 1.0 - clamp(dot(irradiance, vec3(0.3333)), 0.0, 1.0);
      vec3 shaded = c.rgb * mix(vec3(1.0), albedo, dark * ${Kt.toFixed(3)}) * irradiance;
      float specular = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 60.0) * uSurface.y;
      if (uCel == 1) specular = smoothstep(0.3, 0.35, specular) * uSurface.y;
      vec2 side = length(n.xy) > 0.001 ? normalize(n.xy) : vec2(0.0);
      float rim = pow(1.0 - max(n.z, 0.0), 4.0) * smoothstep(-0.2, 0.7, dot(side, normalize(toLight + vec2(1e-4)))) * uSurface.z;
      shaded += radiance * (specular * max(0.0, ndl) + rim) * c.a;
      // Strength blends between the original painting and the relit result; alpha is unchanged.
      c.rgb = clamp(mix(c.rgb, shaded, uLighting.x), vec3(0.0), vec3(c.a));
      outColor = c * uAlpha;`), T = `#version 300 es
  in vec2 aPos; uniform vec2 uScale; uniform vec2 uOffset;
  void main() { gl_Position = vec4(aPos * uScale + uOffset, 0.0, 1.0); gl_PointSize = 7.0; }`, l = `#version 300 es
  precision mediump float; uniform vec4 uColor; out vec4 o; void main() { o = uColor; }`;
  function x(f, c, n) {
    const o = f.createProgram();
    for (const [y, Y] of [[f.VERTEX_SHADER, c], [f.FRAGMENT_SHADER, n]]) {
      const U = f.createShader(y);
      if (f.shaderSource(U, Y), f.compileShader(U), !f.getShaderParameter(U, f.COMPILE_STATUS)) throw new Error(f.getShaderInfoLog(U));
      f.attachShader(o, U), f.deleteShader(U);
    }
    if (f.bindAttribLocation(o, 0, "aPos"), f.bindAttribLocation(o, 1, "aUv"), f.bindAttribLocation(o, 2, "aHeadWeight"), f.linkProgram(o), !f.getProgramParameter(o, f.LINK_STATUS)) throw new Error(f.getProgramInfoLog(o));
    const O = {}, u = f.getProgramParameter(o, f.ACTIVE_UNIFORMS);
    for (let y = 0; y < u; y++) {
      const Y = f.getActiveUniform(o, y).name.replace("[0]", "");
      O[Y] = f.getUniformLocation(o, Y);
    }
    return { prog: o, u: O };
  }
  function F(f, c, n, o) {
    const O = [f];
    let u = f;
    for (; u < f + c - 0.5; ) {
      const y = o && u >= o.from && u < o.to ? o.cell : n;
      u = Math.min(f + c, u + y), O.push(u);
    }
    return O;
  }
  function b(f, c, n, o, O = null) {
    const [u, y, Y, U] = f, z = F(u, Y, c, O && { from: O.x0, to: O.x1, cell: O.cell }), _ = F(y, U, c, O && { from: O.y0, to: O.y1, cell: O.cell }), P = z.length - 1, S = _.length - 1, X = (P + 1) * (S + 1), N = new Float32Array(X * 2), J = new Float32Array(X * 2);
    for (let $ = 0; $ <= S; $++) for (let D = 0; D <= P; D++) {
      const V = $ * (P + 1) + D;
      N[V * 2] = z[D], N[V * 2 + 1] = _[$], J[V * 2] = (z[D] - u) / Y, J[V * 2 + 1] = (_[$] - y) / U;
    }
    const j = [], H = [], W = n.length / o, k = o === 1 ? 0 : 1;
    for (let $ = 0; $ < S; $++) for (let D = 0; D < P; D++) {
      const V = Math.floor(z[D] - u) * k - 2, K = Math.ceil(z[D + 1] - u) * k + 2, q = Math.floor(_[$] - y) * k - 2, m = Math.ceil(_[$ + 1] - y) * k + 2;
      let g = !1;
      for (let R = Math.max(0, q); R < Math.min(W, m) && !g; R += 1)
        for (let d = Math.max(0, V); d < Math.min(o, K); d += 1)
          if (n[R * o + d] > 3) {
            g = !0;
            break;
          }
      if (!g) continue;
      const v = $ * (P + 1) + D, L = v + 1, B = v + P + 1, C = B + 1;
      j.push(v, L, B, L, C, B), H.push(v, L, v, B, L, B), D === P - 1 && H.push(L, C), $ === S - 1 && H.push(B, C);
    }
    return { rect: f, cols: P, rows: S, rest: N, uv: J, pos: new Float32Array(N), tris: new Uint32Array(j), lines: new Uint32Array(H) };
  }
  class h {
    // padTop / padSide: margin around the image, as a share of its height / width. A negative
    // padTop pushes the top of the image above the canvas (hides a cut-off top edge).
    constructor(c, { padTop: n = 0, padSide: o = 0, fit: O = "contain" } = {}) {
      this.pad = { top: n, side: o }, this.fit = O;
      const u = c.getContext("webgl2", { premultipliedAlpha: !0, antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
      if (!u) throw new Error("WebGL2 is not available");
      this.gl = u, this.canvas = c, this.main = x(u, p, w), this.line = x(u, T, l), this.layers = [], this.lighting = Ee, this.lightingStats = { normalMs: 0, computedLayers: 0, cachedLayers: 0 }, u.enable(u.BLEND), u.blendFunc(u.ONE, u.ONE_MINUS_SRC_ALPHA);
    }
    texture(c) {
      const n = this.gl, o = n.createTexture();
      return n.bindTexture(n.TEXTURE_2D, o), n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), n.texImage2D(n.TEXTURE_2D, 0, n.RGBA, n.RGBA, n.UNSIGNED_BYTE, c), n.generateMipmap(n.TEXTURE_2D), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR_MIPMAP_LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), o;
    }
    addLayer(c, n, o, O = {}) {
      const u = this.gl, y = u.createVertexArray();
      u.bindVertexArray(y);
      const Y = u.createBuffer();
      u.bindBuffer(u.ARRAY_BUFFER, Y), u.bufferData(u.ARRAY_BUFFER, o.pos, u.DYNAMIC_DRAW);
      for (const X of [this.main, this.line]) {
        const N = u.getAttribLocation(X.prog, "aPos");
        u.enableVertexAttribArray(N), u.vertexAttribPointer(N, 2, u.FLOAT, !1, 0, 0);
      }
      const U = u.createBuffer();
      u.bindBuffer(u.ARRAY_BUFFER, U), u.bufferData(u.ARRAY_BUFFER, o.uv, u.STATIC_DRAW);
      const z = u.getAttribLocation(this.main.prog, "aUv");
      u.enableVertexAttribArray(z), u.vertexAttribPointer(z, 2, u.FLOAT, !1, 0, 0);
      const _ = u.createBuffer();
      u.bindBuffer(u.ELEMENT_ARRAY_BUFFER, _), u.bufferData(u.ELEMENT_ARRAY_BUFFER, o.tris, u.STATIC_DRAW), u.bindVertexArray(null);
      const P = u.createBuffer();
      u.bindBuffer(u.ELEMENT_ARRAY_BUFFER, P), u.bufferData(u.ELEMENT_ARRAY_BUFFER, o.lines, u.STATIC_DRAW);
      const S = { name: c, image: n, mesh: o, tex: this.texture(n), vao: y, posBuf: Y, uvBuf: U, triBuf: _, lineBuf: P, visible: !0, face: !!O.face, eyeBall: O.eyeBall, color: O.color || [1, 1, 1, 1] };
      return this.layers.push(S), S;
    }
    destroy() {
      const c = this.gl;
      for (const n of this.layers) {
        c.deleteTexture(n.tex), n.normal && c.deleteTexture(n.normal), n.headBuf && c.deleteBuffer(n.headBuf), c.deleteVertexArray(n.vao);
        for (const o of [n.posBuf, n.uvBuf, n.triBuf, n.lineBuf]) c.deleteBuffer(o);
      }
      c.deleteProgram(this.main.prog), c.deleteProgram(this.line.prog), this.lit && c.deleteProgram(this.lit.prog), this.shadow?.destroy(), this.layers.length = 0;
    }
    setLighting(c) {
      if (this.lighting = qt({ ...Ee, ...c }) ?? Ee, !this.lighting.enabled) return;
      const n = this.gl;
      this.lit || (this.lit = x(n, E, A));
      for (const o of this.layers) {
        if (o.normal || o.overlay) continue;
        const O = Vt(o.image, o.mesh.rect, e, !/^(eye|mouth)/.test(o.name));
        this.lightingStats.normalMs += O.ms, this.lightingStats[O.computed ? "computedLayers" : "cachedLayers"]++, o.normal = n.createTexture(), n.activeTexture(n.TEXTURE0), n.bindTexture(n.TEXTURE_2D, o.normal), n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), n.texImage2D(n.TEXTURE_2D, 0, n.RGBA, O.width, O.height, 0, n.RGBA, n.UNSIGNED_BYTE, O.data), n.generateMipmap(n.TEXTURE_2D), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR_MIPMAP_LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE);
        const u = new Float32Array(o.mesh.rest.length / 2);
        for (let y = 0; y < u.length; y++) u[y] = a.headWeight(o.mesh.rest[y * 2], o.mesh.rest[y * 2 + 1]);
        o.headBuf = n.createBuffer(), n.bindVertexArray(o.vao), n.bindBuffer(n.ARRAY_BUFFER, o.headBuf), n.bufferData(n.ARRAY_BUFFER, u, n.STATIC_DRAW), n.enableVertexAttribArray(2), n.vertexAttribPointer(2, 1, n.FLOAT, !1, 0, 0);
      }
      n.bindVertexArray(null), this.lighting.shadow && !this.shadow && (this.shadow = new aa(n, x));
    }
    resize() {
      const c = this.canvas, n = Math.min(window.devicePixelRatio || 1, 2), o = Math.round(c.clientWidth * n), O = Math.round(c.clientHeight * n);
      (c.width !== o || c.height !== O) && (c.width = o, c.height = O);
      const u = (this.fit === "cover" ? Math.max : Math.min)(o / (t.w * (1 + 2 * this.pad.side)), O / (t.h * (1 + this.pad.top))), y = (o - t.w * u) / 2, Y = (O - t.h * u) / (this.fit === "cover" ? 2 : 1);
      this.scale = [2 * u / o, -2 * u / O], this.offset = [-1 + 2 * y / o, 1 - 2 * Y / O], this.pxScale = u, this.pxOff = [y, Y];
    }
    draw(c) {
      const n = this.gl;
      this.resize(), n.viewport(0, 0, this.canvas.width, this.canvas.height), n.clearColor(0, 0, 0, 0), n.clear(n.COLOR_BUFFER_BIT);
      const o = this.lighting.enabled, O = o && this.lighting.shadow;
      O && this.shadow.begin(this.canvas.width, this.canvas.height);
      const u = o ? this.lit : this.main;
      if (this.current = u, n.useProgram(u.prog), o) {
        const y = this.lighting;
        n.uniform1i(u.u.uNormal, 1), n.uniform3f(u.u.uLight, y.x, y.y, y.z), n.uniform3f(u.u.uLightColor, (y.color >> 16 & 255) / 255, (y.color >> 8 & 255) / 255, (y.color & 255) / 255), n.uniform3f(u.u.uAmbientColor, (y.ambientColor >> 16 & 255) / 255, (y.ambientColor >> 8 & 255) / 255, (y.ambientColor & 255) / 255), n.uniform4f(u.u.uLighting, y.strength, y.intensity, y.ambient, y.reach), n.uniform4f(u.u.uSurface, y.softness, y.specular, y.rim, y.detail), n.uniform1f(u.u.uAspect, this.canvas.width / this.canvas.height), n.uniform1i(u.u.uCel, y.mode === "cel" ? 1 : 0), n.uniformMatrix3fv(u.u.uHeadRotation, !1, ta(c.angleX ?? 0, c.angleY ?? 0, c.angleZ ?? 0, e.head.maxRoll));
      }
      n.uniform2fv(u.u.uScale, this.scale), n.uniform2fv(u.u.uOffset, this.offset), n.uniform1i(u.u.uTex, 0), n.uniform4fv(u.u.uEyeBox, r.flatMap((y) => [y.x0, y.x1, 0, 0])), n.uniform1fv(u.u.uEyeTop, r.flatMap((y) => y.top)), n.uniform1fv(u.u.uEyeBot, r.flatMap((y) => y.bot)), n.uniform4fv(u.u.uEyeState, c.eyes), n.uniform4f(u.u.uMouth, i.cx, i.cy, i.angle, i.halfLen), n.uniform4f(u.u.uMouthState, c.mouthOpen, c.mouthForm, i.bow, 0), n.uniform4f(u.u.uCheeks, s[0][0], s[0][1], s[1][0], s[1][1]), n.uniform1f(u.u.uCheek, c.cheek), n.activeTexture(n.TEXTURE0);
      for (const y of this.layers)
        !y.visible || y.overlay || this.drawLayer(y, y.alpha ?? 1);
      if (this.original && c.originalAlpha > 0 && this.drawLayer(this.original, c.originalAlpha), O && this.shadow.composite(this.lighting), c.showMesh) {
        const y = this.line;
        n.useProgram(y.prog), n.uniform2fv(y.u.uScale, this.scale), n.uniform2fv(y.u.uOffset, this.offset);
        for (const Y of this.layers)
          !Y.visible || Y.overlay || (n.bindVertexArray(Y.vao), n.bindBuffer(n.ELEMENT_ARRAY_BUFFER, Y.lineBuf), n.uniform4fv(y.u.uColor, Y.color), n.drawElements(n.LINES, Y.mesh.lines.length, n.UNSIGNED_INT, 0), n.bindBuffer(n.ELEMENT_ARRAY_BUFFER, Y.triBuf));
        c.joints?.length && this.drawPoints(c.joints), n.bindVertexArray(null);
      }
    }
    drawLayer(c, n) {
      const o = this.gl, O = this.current;
      o.useProgram(O.prog), o.bindVertexArray(c.vao), o.bindBuffer(o.ARRAY_BUFFER, c.posBuf), o.bufferSubData(o.ARRAY_BUFFER, 0, c.mesh.pos), this.lighting.enabled && (o.activeTexture(o.TEXTURE1), o.bindTexture(o.TEXTURE_2D, c.normal), o.activeTexture(o.TEXTURE0)), o.bindTexture(o.TEXTURE_2D, c.tex), o.uniform4fv(O.u.uRect, c.mesh.rect), o.uniform1i(O.u.uFace, c.eyeBall !== void 0 ? 2 + c.eyeBall : c.face ? 1 : 0), o.uniform1f(O.u.uAlpha, n), o.drawElements(o.TRIANGLES, c.mesh.tris.length, o.UNSIGNED_INT, 0);
    }
    drawPoints(c) {
      const n = this.gl, o = this.line;
      if (!this.pointBuf) {
        this.pointBuf = n.createBuffer(), this.pointVao = n.createVertexArray(), n.bindVertexArray(this.pointVao), n.bindBuffer(n.ARRAY_BUFFER, this.pointBuf);
        const O = n.getAttribLocation(o.prog, "aPos");
        n.enableVertexAttribArray(O), n.vertexAttribPointer(O, 2, n.FLOAT, !1, 0, 0);
      }
      n.bindVertexArray(this.pointVao), n.bindBuffer(n.ARRAY_BUFFER, this.pointBuf), n.bufferData(n.ARRAY_BUFFER, new Float32Array(c.flat()), n.DYNAMIC_DRAW), n.uniform4f(o.u.uColor, 1, 0.85, 0.2, 1), n.drawArrays(n.POINTS, 0, c.length);
    }
    // canvas CSS px -> source image px
    toImage(c, n) {
      if (!this.pxOff) return null;
      const o = this.canvas.width / this.canvas.clientWidth;
      return [(c * o - this.pxOff[0]) / this.pxScale, (n * o - this.pxOff[1]) / this.pxScale];
    }
  }
  return { Renderer: h, buildGrid: b };
}
function na(a, e) {
  const { applyHead: t, applyBody: r, TASSELS: i, tasselAnchor: s } = a, p = (e.strands ?? []).map((n) => {
    if (n.nodes.length === 4) return n;
    const o = Array.from({ length: 4 }, (O, u) => {
      const y = u / 3 * (n.nodes.length - 1), Y = Math.min(n.nodes.length - 2, Math.floor(y)), U = y - Y;
      return [0, 1].map((z) => n.nodes[Y][z] + (n.nodes[Y + 1][z] - n.nodes[Y][z]) * U);
    });
    return { ...n, nodes: o };
  }), w = [0, 300, 200, 140], E = 0.9, A = 7, T = { stiff: 1.7, damp: 1.6, couple: 0.85, reach: 0.9, bind: 4 }, l = Math.min(6, p.filter((n) => n.name.startsWith("bang")).length), x = { freq: 0.7, zeta: 0.22, hang: 0.85, inertia: 0.32, wind: 0.03, max: 0.55, smooth: 6 }, F = (n, o) => [n[0] * Math.cos(o) - n[1] * Math.sin(o), n[0] * Math.sin(o) + n[1] * Math.cos(o)], b = (n, o) => {
    const O = Math.hypot(n[0], n[1]);
    if (O < 1e-6) return n;
    const u = o * Math.tanh(O / o) / O;
    return [n[0] * u, n[1] * u];
  }, h = Object.fromEntries(Object.entries(e.buns ?? {}).map(([n, o]) => [n, { at: [o.cx, o.cy], k: 260, c: 11, hang: 3, max: 4 }])), f = (n, o) => {
    const O = Math.hypot(n[0], n[1]);
    O > o && (n[0] *= o / O, n[1] *= o / O);
  };
  class c {
    constructor() {
      this.gain = 1, this.out = { gain: 1, bunL: [0, 0], bunR: [0, 0] }, this.hair = {};
      for (const o of Object.keys(h))
        this.hair[o] = { p: null, v: [0, 0] }, this.out[o] = [0, 0];
      this.strands = p.map(() => ({ p: null, v: [[0, 0], [0, 0], [0, 0], [0, 0]] })), this.out.strands = p.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]), this.chains = i.map((o) => {
        const O = o.tip[0] - o.pivot[0], u = o.tip[1] - o.pivot[1], y = Math.hypot(O, u), Y = [O / y, u / y];
        return { t: o, dir: Y, L1: y * o.split, L2: y * (1 - o.split), pts: null, prev: null, phi: [0, 0], anchor: [0, 0] };
      }), this.time = 0;
    }
    hairAnchor(o, O) {
      const u = [o[0], o[1]];
      return t(u, 1, O), r(u, o[1], O), u;
    }
    step(o, O) {
      const u = Math.max(1, Math.ceil(O / 0.004166666666666667)), y = Math.min(O, 0.05) / u, Y = -o.angleZ / 30 * e.head.maxRoll - o.bodyAngleZ / 10 * e.body.maxRoll, U = this.gain;
      p.forEach((_, P) => {
        const S = this.strands[P], X = this.out.strands[P], N = _.nodes.map((j) => this.hairAnchor(j, o));
        S.p || (S.p = N.map((j) => [...j]));
        const J = P * 1.7;
        for (let j = 0; j < u; j++) {
          const H = this.time + j * y;
          for (let W = 1; W < 4; W++) {
            const k = Math.hypot(_.nodes[W][0] - _.nodes[0][0], _.nodes[W][1] - _.nodes[0][1]), $ = (Math.sin(H * 1.3) * 0.5 + Math.sin(H * 3.1) * 0.3 + Math.sin(H * 4.7 + J) * 0.2) * _.max * 0.1 * W / 3, D = [S.p[W - 1][0] - N[W - 1][0], S.p[W - 1][1] - N[W - 1][1]], V = N[W][0] + D[0] * E * T.couple - Math.sin(Y) * k * 0.12 + $, K = N[W][1] + D[1] * E * T.couple, q = w[W] * _.k * T.stiff / Math.max(0.35, U), m = A * T.damp * Math.sqrt(T.stiff) / Math.max(0.5, Math.sqrt(U)), g = S.v[W], v = S.p[W];
            g[0] += (q * (V - v[0]) - m * g[0]) * y, g[1] += (q * (K - v[1]) - m * g[1]) * y, v[0] += g[0] * y, v[1] += g[1] * y;
          }
          S.p[0] = [...N[0]];
        }
        for (let j = 0; j < 4; j++) {
          const H = [S.p[j][0] - N[j][0], S.p[j][1] - N[j][1]];
          X[j] = b(H, Math.max(0.5, _.max * T.reach * Math.max(1, U) * j / 3));
        }
      });
      for (const [_, P] of Object.entries(h)) {
        const S = this.hair[_], X = this.hairAnchor(P.at, o), N = Math.sin(this.time * 1.3 + P.at[0] * 0.01) * 0.6 + Math.sin(this.time * 2.9 + P.at[1] * 0.02) * 0.4, J = X[0] - Math.sin(Y) * P.hang + N * P.max * 0.12, j = X[1];
        S.p || (S.p = [J, j]);
        const H = P.k / Math.max(0.35, U), W = P.c / Math.max(0.5, Math.sqrt(U));
        for (let $ = 0; $ < u; $++)
          S.v[0] += (H * (J - S.p[0]) - W * S.v[0]) * y, S.v[1] += (H * (j - S.p[1]) - W * S.v[1]) * y, S.p[0] += S.v[0] * y, S.p[1] += S.v[1] * y;
        const k = [S.p[0] - X[0], S.p[1] - X[1]];
        f(k, P.max * Math.max(1, U)), this.out[_] = k;
      }
      this.out.gain = 1;
      const z = this.out.strands;
      for (let _ = 0; _ < T.bind; _++) for (let P = 1; P < 4; P++) {
        const S = z.slice(0, l).map((X) => [...X[P]]);
        for (let X = 0; X < l; X++) {
          const N = S[Math.max(0, X - 1)], J = S[Math.min(l - 1, X + 1)];
          for (const j of [0, 1]) z[X][P][j] = S[X][j] * 0.5 + (N[j] + J[j]) * 0.25;
        }
      }
      for (const _ of this.chains) {
        const P = s(_.t, o, this.out, [0, 0]);
        _.st || (_.st = { th: [0, 0], w: [0, 0], pos: [...P], vel: [0, 0], acc: [0, 0] });
        const S = _.st, X = x, N = [(P[0] - S.pos[0]) / Math.max(O, 1e-3), (P[1] - S.pos[1]) / Math.max(O, 1e-3)], J = 1 - Math.exp(-O * X.smooth), j = [(N[0] - S.vel[0]) / Math.max(O, 1e-3), (N[1] - S.vel[1]) / Math.max(O, 1e-3)];
        S.acc = [S.acc[0] + (j[0] - S.acc[0]) * J, S.acc[1] + (j[1] - S.acc[1]) * J], S.vel = [S.vel[0] + (N[0] - S.vel[0]) * J, S.vel[1] + (N[1] - S.vel[1]) * J], S.pos = [...P];
        const H = [-_.dir[1], _.dir[0]], W = -(S.acc[0] * H[0] + S.acc[1] * H[1]) / (_.L1 + _.L2) * X.inertia, k = (Math.sin(this.time * 0.9 + _.t.pivot[0]) * 0.6 + Math.sin(this.time * 0.37 + _.t.pivot[1]) * 0.4) * X.wind, $ = -Y * X.hang + k, D = 2 * Math.PI * X.freq / Math.sqrt(Math.max(0.4, U)), V = D * 1.35;
        for (let g = 0; g < u; g++) {
          const v = -D * D * (S.th[0] - $) - 2 * X.zeta * D * S.w[0] + W;
          S.w[0] += v * y, S.th[0] += S.w[0] * y;
          const L = -V * V * (S.th[1] - S.th[0]) - 2 * X.zeta * V * S.w[1] + W * 0.4 + v * 0.5;
          S.w[1] += L * y, S.th[1] += S.w[1] * y;
        }
        S.th[0] = Math.max(-0.55, Math.min(X.max, S.th[0])), S.th[1] = Math.max(-0.55 * 1.4, Math.min(X.max * 1.4, S.th[1])), _.phi = [S.th[0], S.th[1]];
        const K = F(_.dir, S.th[0]), q = F(_.dir, S.th[1]), m = [P[0] + K[0] * _.L1, P[1] + K[1] * _.L1];
        _.pts = [[...P], m, [m[0] + q[0] * _.L2, m[1] + q[1] * _.L2]], _.anchor = P;
      }
      return this.time += O, this.out;
    }
  }
  return { Physics: c };
}
function ia(a, e) {
  const { baseWeights: t, deformBase: r, MOUTH: i } = a, s = (u, y, Y) => {
    const U = Math.min(1, Math.max(0, (Y - u) / (y - u)));
    return U * U * (3 - 2 * U);
  }, p = e.mouth.area, w = {
    a: { sprite: "mouth_a", ref: 0.9, width: 1 },
    aHalf: { sprite: "mouth_a_half", ref: 0.55, width: 1 },
    i: { sprite: "mouth_i", ref: 0.55, width: 1 },
    e: { sprite: "mouth_a_half", ref: 0.65, width: 1.06 },
    o: { sprite: "mouth_o", ref: 0.75, width: 1 },
    u: { sprite: "mouth_o", ref: 0.75, width: 0.78 }
  }, E = 0.16, A = ["angry", "sad"];
  function T(u, y) {
    const Y = (_, P, S) => _ >= P - (y ? 0.07 : 0) && _ < S + (y ? 0.07 : 0), U = [["i", -9, -0.55], ["e", -0.55, -0.2], ["a", -0.2, 0.35], ["o", 0.35, 0.75], ["u", 0.75, 9]], z = y && U.find((_) => _[0] === y || y === "aHalf" && _[0] === "a");
    return z && Y(u, z[1], z[2]) ? z[0] : U.find((_) => u >= _[1] && u < _[2])[0];
  }
  const l = 0.75, x = 0.3, F = 0.06, b = ["sad", "surprise"];
  function h(u, y, Y = null) {
    return Y && u >= x ? Y : u >= l ? null : u < x ? y >= 0.5 ? "eyes_smile" : "eyes_closed" : "eyes_half";
  }
  function f(u, y, Y = null) {
    if (u < E) return null;
    const U = T(y, Y);
    return U === "a" ? u >= 0.6 ? "a" : "aHalf" : U;
  }
  function c(u) {
    return i.cy + (u - i.cx) * Math.tan(i.angle);
  }
  function n() {
    return p.cx;
  }
  function o(u, y) {
    const Y = Math.cos(-p.angle), U = Math.sin(-p.angle), z = u - p.cx, _ = y - p.cy, P = (z * Y - _ * U) / p.rx, S = (z * U + _ * Y) / p.ry;
    return 1 - s(0.55, 0.95, Math.hypot(P, S));
  }
  function O(u, y, Y, U, z) {
    const _ = {}, P = (k) => k.startsWith("eyes_closed") || k.startsWith("eyes_smile"), S = (k) => A.some(($) => k === `mouth_${$}`), X = (k) => P(k) ? 1 : k.startsWith("eyes_") ? 0 : S(k) ? 2 : 3, N = Object.entries(y.layers).sort((k, $) => X(k[0]) - X($[0]));
    for (const [k, $] of N) {
      const D = U($, e.mesh.spriteCell, z(Y[k]), Y[k].width), V = [], K = [];
      for (let m = 0; m < D.rest.length / 2; m++) {
        const g = D.rest[m * 2], v = D.rest[m * 2 + 1];
        V.push(t(g, v, 0)), K.push(k.startsWith("mouth") ? o(g, v) : 0);
      }
      const q = u.addLayer(k, Y[k], D, { color: [0.4, 1, 0.8, 0.6] });
      q.visible = !1, _[k] = { mesh: D, W: V, inner: K, layer: q };
    }
    const J = [0, 0];
    let j = null;
    const H = [0, 1].map(() => ({ cur: "open", prev: "open", t: 1 }));
    function W(k, $, D, V, K = 1) {
      const q = k.mesh.rest, m = k.mesh.pos;
      for (let g = 0; g < k.W.length; g++) {
        let v = q[g * 2], L = q[g * 2 + 1];
        const B = k.inner[g];
        if (B > 0) {
          const C = c(v);
          L = C + (L - C) * (1 + (V - 1) * B), v = n() + (v - n()) * (1 + (K - 1) * B);
        }
        r(v, L, k.W[g], $, D, J), m[g * 2] = J[0], m[g * 2 + 1] = J[1];
      }
    }
    return {
      /**
       * Show / hide and deform the sprites for this frame.
       * Returns which eyes are covered by a sprite, so the layered eye parts can be hidden.
       * `mood` (angry / sad / surprise) picks drawn expression eyes (sad, surprise) and closed
       * mouths (angry, sad) when the avatar has them.
       */
      update(k, $, D = 1 / 60, V = null) {
        for (const L of Object.values(_)) L.layer.visible = !1;
        const K = [!1, !1];
        [
          [k.eyeROpen, k.eyeSmile],
          [k.eyeLOpen, k.eyeSmileL ?? k.eyeSmile]
        ].forEach(([L, B], C) => {
          const R = H[C], d = b.includes(V) && _[`eyes_${V}_${C}`] ? `eyes_${V}` : null, M = h(L, B, d) ?? "open";
          M !== R.cur && (R.prev = R.cur, R.cur = M, R.t = 0), R.t = D > 0 ? Math.min(1, R.t + D / F) : 1;
          const I = s(0, 1, R.t), Z = (ae, re) => {
            if (ae === "open" || re <= 1e-3) return;
            const ie = _[`${ae}_${C}`];
            ie && (ie.layer.visible = !0, ie.layer.alpha = re, W(ie, k, $, 1));
          }, Q = (ae) => ae === "open" ? -1 : P(ae) ? 1 : 0;
          R.t >= 1 ? Z(R.cur, 1) : Q(R.cur) > Q(R.prev) ? (Z(R.prev, 1), Z(R.cur, I)) : (Z(R.cur, 1), Z(R.prev, 1 - I)), K[C] = R.cur !== "open" && I >= 0.999;
        });
        const q = f(k.mouthOpen, k.mouthForm, j);
        j = q;
        const m = q && w[q], g = m && _[m.sprite], v = A.includes(V) && _[`mouth_${V}`];
        if (v && (!g || k.mouthOpen < E + 0.04) && (v.layer.visible = !0, v.layer.alpha = 1, W(v, k, $, 1)), g) {
          g.layer.visible = !0, g.layer.alpha = s(E, E + 0.04, k.mouthOpen);
          const L = Math.min(1.1, Math.max(0.5, k.mouthOpen / m.ref));
          W(g, k, $, L, m.width);
        }
        return { eyes: K, mouth: q };
      }
    };
  }
  return { createSprites: O, mouthShape: f, eyeSprite: h };
}
const pt = { angry: "angry", angryTalk: "angry", sad: "sad", sadTalk: "sad", surprise: "surprise", surprisedTalk: "surprise" };
function sa(a, e) {
  return a && a !== "neutral" ? pt[a] ?? null : (e && pt[e]) ?? null;
}
const oa = /* @__PURE__ */ new Set([
  "angleX",
  "angleY",
  "angleZ",
  "bodyAngleX",
  "bodyAngleZ",
  "armAngle",
  "handAngle",
  "gazeX",
  "gazeY"
]), rt = {
  nod: {
    label: "Nod",
    dur: 1.7,
    tracks: {
      angleY: [[0, 0], [0.32, -13], [0.62, 2], [0.95, -9], [1.3, 1], [1.7, 0]],
      angleZ: [[0, 0], [0.4, -2], [1, -1], [1.7, 0]],
      bodyAngleX: [[0, 0], [0.5, -1.5], [1.7, 0]],
      eyeSmile: [[0, 0], [0.3, 0.45], [1.3, 0.45], [1.7, 0]],
      eyeOpen: [[0, 1], [0.3, 0.72], [1.3, 0.72], [1.7, 1]],
      mouthOpen: [[0, 0], [0.3, 0.12], [1.3, 0.12], [1.7, 0]],
      mouthForm: [[0, 0], [0.3, -0.6], [1.7, -0.3]]
    }
  },
  tilt: {
    label: "Head tilt",
    dur: 2.6,
    tracks: {
      angleZ: [[0, 0], [0.55, 17], [2, 15], [2.6, 0]],
      angleX: [[0, 0], [0.6, 8], [2, 7], [2.6, 0]],
      angleY: [[0, 0], [0.6, 4], [2.6, 0]],
      bodyAngleZ: [[0, 0], [0.8, 3], [2, 3], [2.6, 0]],
      gazeX: [[0, 0], [0.4, 0.5], [2.1, 0.4], [2.6, 0]],
      gazeY: [[0, 0], [0.4, 0.35], [2.1, 0.3], [2.6, 0]],
      browAngle: [[0, 0], [0.5, -0.7], [2.1, -0.6], [2.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [2.1, 0.3], [2.6, 0]]
      // closed mouth: a barely open round mouth read as a squashed blob
    }
  },
  think: {
    label: "Thinking",
    dur: 3.6,
    tracks: {
      angleX: [[0, 0], [0.7, -11], [3, -9], [3.6, 0]],
      angleY: [[0, 0], [0.7, 9], [3, 8], [3.6, 0]],
      angleZ: [[0, 0], [0.8, 6], [3, 5], [3.6, 0]],
      gazeX: [[0, 0], [0.35, -0.8], [3.1, -0.7], [3.6, 0]],
      gazeY: [[0, 0], [0.35, 0.7], [3.1, 0.6], [3.6, 0]],
      handAngle: [[0, 0], [0.6, 3], [3, 3], [3.6, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.3, 0],
        [2.45, 1],
        [2.6, 0],
        [3.6, 0]
      ],
      browY: [[0, 0], [0.6, 0.25], [3, 0.2], [3.6, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3, -0.3], [3.6, 0]],
      mouthForm: [[0, 0], [0.6, 0.4], [3.6, 0]]
    }
  },
  giggle: {
    label: "Chuckle",
    dur: 2.2,
    tracks: {
      eyeOpen: [[0, 1], [0.2, 0], [1.8, 0], [2.2, 1]],
      eyeSmile: [[0, 0], [0.2, 1], [1.8, 1], [2.2, 0]],
      mouthOpen: [[0, 0], [0.2, 0.5], [0.45, 0.32], [0.7, 0.55], [0.95, 0.34], [1.2, 0.5], [1.8, 0.3], [2.1, 0]],
      mouthForm: [[0, 0], [0.2, -0.8], [2.2, -0.2]],
      blush: [[0, 0], [0.3, 0.7], [1.8, 0.7], [2.2, 0.1]],
      angleY: [[0, 0], [0.2, -5], [0.45, -1], [0.7, -6], [0.95, -2], [1.2, -5], [1.6, -2], [2.2, 0]],
      angleZ: [[0, 0], [0.3, -6], [1.8, -5], [2.2, 0]],
      bodyAngleZ: [[0, 0], [0.25, 2], [0.5, -1], [0.75, 2], [1, -1], [1.3, 1.5], [2.2, 0]],
      browY: [[0, 0], [0.3, 0.3], [1.8, 0.3], [2.2, 0]]
    }
  },
  surprise: {
    label: "Surprise",
    dur: 2,
    tracks: {
      angleY: [[0, 0], [0.12, 10], [0.5, 6], [1.5, 5], [2, 0]],
      angleX: [[0, 0], [0.12, -4], [2, 0]],
      bodyAngleX: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]],
      eyeOpen: [[0, 1], [0.1, 1.25], [1.5, 1.2], [2, 1]],
      browY: [[0, 0], [0.1, 1], [1.5, 0.9], [2, 0]],
      mouthOpen: [[0, 0], [0.12, 0.6], [1.4, 0.45], [2, 0]],
      mouthForm: [[0, 0], [0.12, 0.6], [1.5, 0.55], [2, 0]],
      // o
      armAngle: [[0, 0], [0.15, -4], [1.5, -3], [2, 0]]
    }
  },
  shy: {
    label: "Shy",
    dur: 3.2,
    tracks: {
      angleX: [[0, 0], [0.6, 14], [2.6, 12], [3.2, 0]],
      angleY: [[0, 0], [0.6, -9], [2.6, -8], [3.2, 0]],
      angleZ: [[0, 0], [0.7, -8], [2.6, -7], [3.2, 0]],
      gazeX: [[0, 0], [0.3, 0.8], [1.6, 0.8], [1.9, -0.3], [2.2, 0.8], [2.8, 0.6], [3.2, 0]],
      gazeY: [[0, 0], [0.3, -0.5], [2.8, -0.4], [3.2, 0]],
      eyeOpen: [[0, 1], [0.5, 0.75], [2.7, 0.75], [3.2, 1]],
      eyeSmile: [[0, 0], [0.5, 0.5], [2.7, 0.5], [3.2, 0]],
      blush: [[0, 0], [0.8, 1], [2.7, 1], [3.2, 0]],
      browAngle: [[0, 0], [0.5, -0.6], [2.7, -0.5], [3.2, 0]],
      mouthForm: [[0, 0], [0.5, -0.4], [3.2, 0]],
      handAngle: [[0, 0], [0.8, 4], [2.6, 4], [3.2, 0]]
    }
  },
  no: {
    label: "Shake head",
    dur: 1.9,
    tracks: {
      angleX: [[0, 0], [0.2, 13], [0.45, -13], [0.7, 12], [0.95, -10], [1.2, 5], [1.5, 0]],
      angleY: [[0, 0], [0.2, -3], [1.3, -3], [1.9, 0]],
      bodyAngleX: [[0, 0], [0.3, 1.5], [0.6, -1.5], [0.9, 1], [1.3, 0]],
      eyeOpen: [[0, 1], [0.15, 0], [1.4, 0], [1.9, 1]],
      eyeSmile: [[0, 0], [0.15, 1], [1.4, 1], [1.9, 0]],
      // closed mouth while shaking the head
      browAngle: [[0, 0], [0.2, -0.5], [1.4, -0.5], [1.9, 0]]
    }
  },
  wink: {
    label: "Wink",
    dur: 2,
    tracks: {
      angleZ: [[0, 0], [0.35, -13], [1.5, -12], [2, 0]],
      angleX: [[0, 0], [0.35, 9], [1.5, 8], [2, 0]],
      bodyAngleZ: [[0, 0], [0.5, -2], [1.5, -2], [2, 0]],
      eyeOpenL: [[0, 1], [0.25, 1], [0.4, 0], [1.4, 0], [1.6, 1]],
      eyeSmileL: [[0, 0], [0.3, 1], [1.5, 1], [1.7, 0]],
      mouthOpen: [[0, 0], [2, 0]],
      // wink with a closed smile
      mouthForm: [[0, 0], [0.35, -0.8], [2, 0]],
      blush: [[0, 0], [0.4, 0.5], [1.6, 0.5], [2, 0]]
    }
  },
  greet: {
    label: "Greeting",
    dur: 2.6,
    tracks: {
      angleY: [[0, 0], [0.7, -18], [1.2, -17], [1.9, 2], [2.6, 0]],
      bodyAngleX: [[0, 0], [0.8, 2], [1.8, 0]],
      bodyAngleZ: [[0, 0], [0.8, 1.5], [2, 0]],
      armAngle: [[0, 0], [0.8, 3], [2, 0]],
      eyeOpen: [[0, 1], [0.5, 0], [1.4, 0], [1.8, 1]],
      eyeSmile: [[0, 0], [0.5, 1], [1.6, 1], [2.3, 0.4], [2.6, 0]],
      mouthOpen: [[0, 0], [1.6, 0], [1.8, 0.3], [2.3, 0.2], [2.6, 0]],
      mouthForm: [[0, 0], [1.6, -0.8], [2.6, -0.3]],
      blush: [[0, 0], [1.6, 0.3], [2.6, 0]]
    }
  }
}, nt = {
  lookAround: {
    label: "Look around",
    dur: 5.2,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.25, -0.85], [1.5, -0.8], [1.8, 0.1], [2.1, 0.85], [3.4, 0.8], [3.7, 0], [5.2, 0]],
      gazeY: [[0, 0], [0.25, 0.15], [1.8, 0.25], [2.1, 0.1], [3.7, 0], [5.2, 0]],
      angleX: [[0, 0], [0.7, -20], [1.6, -18], [2.5, 19], [3.5, 17], [4.4, 0], [5.2, 0]],
      angleY: [[0, 0], [0.7, 3], [1.8, 5], [2.5, 3], [4.4, 0]],
      angleZ: [[0, 0], [0.8, 4], [1.8, 0], [2.6, -4], [4.4, 0]],
      bodyAngleX: [[0, 0], [1, -4], [2.8, 4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [1, 1.5], [2.8, -1.5], [4.6, 0]],
      handAngle: [[0, 0], [1, -2], [2.8, 2], [4.6, 0]],
      browY: [[0, 0], [0.5, 0.35], [3.6, 0.3], [4.4, 0]],
      // curious: a quick inhale, held while looking, let out at the end
      breath: [[0, 0.2], [0.6, 0.85], [3.6, 0.7], [4.6, 0], [5.2, 0.1]]
    }
  },
  glance: {
    label: "Side glance",
    dur: 4.6,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.18, 0.9], [2.6, 0.85], [2.9, 0.15], [3.2, 0], [4.6, 0]],
      gazeY: [[0, 0], [0.18, 0.4], [2.6, 0.35], [3.2, 0]],
      angleX: [[0, 0], [0.6, 13], [2.6, 11], [3.6, 0]],
      angleY: [[0, 0], [0.6, 6], [2.6, 5], [3.6, 0]],
      angleZ: [[0, 0], [0.7, -5], [2.6, -4], [3.6, 0]],
      bodyAngleX: [[0, 0], [1, 2.5], [2.8, 2], [4, 0]],
      eyeOpen: [[0, 1], [0.3, 1.06], [2.5, 1.05], [2.8, 0.85], [3.4, 1]],
      browY: [[0, 0], [0.4, 0.4], [2.5, 0.35], [3.4, 0]],
      browAngle: [[0, 0], [0.4, -0.2], [2.5, -0.2], [3.4, 0]],
      breath: [[0, 0], [0.5, 0.6], [2.6, 0.55], [3.8, 0], [4.6, 0.3]]
    }
  },
  sway: {
    label: "Sway",
    dur: 7,
    idle: !0,
    tracks: {
      bodyAngleZ: [[0, 0], [1.6, 6], [3.4, -6], [5.2, 5], [7, 0]],
      bodyAngleX: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2.5], [7, 0]],
      angleZ: [[0, 0], [1.8, -10], [3.6, 10], [5.4, -8], [7, 0]],
      angleX: [[0, 0], [1.8, 6], [3.6, -6], [5.4, 5], [7, 0]],
      angleY: [[0, 0], [0.9, 3], [1.8, 0], [2.7, 3], [3.6, 0], [4.5, 3], [5.4, 0], [7, 0]],
      armAngle: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2], [7, 0]],
      handAngle: [[0, 0], [1.8, -4], [3.6, 4], [5.4, -3], [7, 0]],
      gazeX: [[0, 0], [1.8, -0.3], [3.6, 0.3], [5.4, -0.2], [7, 0]],
      eyeOpen: [[0, 1], [0.8, 0.82], [6.2, 0.82], [7, 1]],
      eyeSmile: [[0, 0], [0.8, 0.35], [6.2, 0.35], [7, 0]],
      // slow, even breaths in time with the sway
      breath: [[0, 0], [0.9, 1], [1.8, 0], [2.7, 1], [3.6, 0], [4.5, 1], [5.4, 0], [6.3, 0.8], [7, 0]]
    }
  },
  sigh: {
    label: "Sigh",
    dur: 5.6,
    idle: !0,
    tracks: {
      breath: [[0, 0], [1.3, 1.25], [1.9, 1.25], [3.6, 0], [5.6, 0]],
      angleY: [[0, 0], [1.3, 9], [1.9, 9], [3.3, -9], [4.6, -6], [5.6, 0]],
      angleZ: [[0, 0], [1.3, -3], [3.3, 5], [5.6, 0]],
      bodyAngleX: [[0, 0], [1.3, -2.5], [3.3, 2.5], [5.6, 0]],
      bodyAngleZ: [[0, 0], [1.9, 1], [3.3, -1.5], [5.6, 0]],
      armAngle: [[0, 0], [1.3, -2.5], [3.3, 2], [5.6, 0]],
      gazeY: [[0, 0], [1.2, 0.4], [2, 0.3], [3.2, -0.4], [4.8, -0.2], [5.6, 0]],
      eyeOpen: [[0, 1], [1, 0.95], [1.9, 0.6], [3.4, 0.6], [4.6, 0.78], [5.6, 1]],
      browY: [[0, 0], [1.3, 0.35], [3.2, -0.2], [5.6, 0]],
      browAngle: [[0, 0], [1.9, -0.4], [4.6, -0.35], [5.6, 0]]
    }
  },
  doze: {
    label: "Drowsy",
    dur: 7.2,
    idle: !0,
    tracks: {
      eyeOpen: [[0, 1], [1.8, 0.78], [3.2, 0.62], [4.5, 0.55], [4.75, 1.1], [5.6, 1.05], [7.2, 1]],
      angleY: [[0, 0], [1.8, -6], [3.2, -9], [4.5, -17], [4.75, 5], [5.6, 2], [7.2, 0]],
      angleZ: [[0, 0], [2, 4], [4.5, 10], [4.75, -2], [7.2, 0]],
      angleX: [[0, 0], [4.5, -4], [4.75, 3], [5.4, -6], [6.2, 5], [7.2, 0]],
      bodyAngleZ: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      bodyAngleX: [[0, 0], [4.5, 2], [4.8, -1.5], [7.2, 0]],
      armAngle: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      handAngle: [[0, 0], [4.5, 5], [4.8, -1], [7.2, 0]],
      gazeY: [[0, 0], [4.5, -0.4], [4.75, 0.2], [7.2, 0]],
      gazeX: [[0, 0], [4.8, 0], [5.3, -0.6], [6.1, 0.6], [6.8, 0]],
      browY: [[0, 0], [4.5, -0.35], [4.75, 0.8], [5.8, 0.3], [7.2, 0]],
      // long, slow, deepening breaths; a sharp inhale on waking
      breath: [[0, 0], [1.1, 0.7], [2.6, 0], [3.8, 0.6], [4.5, 0.2], [4.8, 1.1], [6, 0.2], [7.2, 0]]
    }
  },
  stretch: {
    label: "Stretch",
    dur: 6.2,
    idle: !0,
    tracks: {
      angleZ: [[0, 0], [1.3, -22], [2.3, -21], [3.8, 20], [4.8, 19], [6.2, 0]],
      angleY: [[0, 0], [1.3, 5], [2.3, 7], [3.1, -3], [3.8, 5], [4.8, 6], [6.2, 0]],
      angleX: [[0, 0], [1.3, -5], [3.8, 5], [6.2, 0]],
      bodyAngleZ: [[0, 0], [1.3, 4], [3.8, -4], [6.2, 0]],
      bodyAngleX: [[0, 0], [1.3, -2], [3.8, 2], [6.2, 0]],
      armAngle: [[0, 0], [1.3, 2], [3.8, -2], [6.2, 0]],
      eyeOpen: [[0, 1], [0.8, 0.62], [4.9, 0.62], [5.6, 1]],
      browAngle: [[0, 0], [1, -0.3], [4.9, -0.3], [5.8, 0]],
      breath: [[0, 0], [1.3, 1.1], [2.3, 0.9], [3.1, 0.2], [3.8, 1.1], [4.8, 0.9], [6.2, 0]]
    }
  },
  lean: {
    label: "Peek",
    dur: 4.8,
    idle: !0,
    tracks: {
      bodyAngleX: [[0, 0], [0.9, 6], [3.4, 6], [4.4, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      angleX: [[0, 0], [0.9, 9], [2, 7], [2.6, 10], [3.4, 8], [4.4, 0]],
      angleY: [[0, 0], [0.9, -6], [3.4, -5], [4.4, 0]],
      angleZ: [[0, 0], [0.9, 10], [2.2, 12], [3.4, 9], [4.4, 0]],
      armAngle: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      handAngle: [[0, 0], [0.9, 3], [3.4, 3], [4.4, 0]],
      gazeY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      gazeX: [[0, 0], [1.5, 0], [1.8, -0.3], [2.3, 0.2], [2.8, 0], [4.2, 0]],
      eyeOpen: [[0, 1], [0.6, 1.1], [3.4, 1.08], [4.2, 1]],
      browY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      browAngle: [[0, 0], [0.6, -0.3], [3.4, -0.3], [4.2, 0]],
      blush: [[0, 0], [1.2, 0.25], [3.4, 0.25], [4.4, 0]],
      breath: [[0, 0], [0.8, 0.8], [3.4, 0.6], [4.4, 0], [4.8, 0.2]]
    }
  },
  hum: {
    label: "Listen",
    dur: 5.6,
    idle: !0,
    tracks: {
      angleY: [[0, 0], [0.45, -5], [0.9, 2], [1.35, -5], [1.8, 2], [2.25, -5], [2.7, 2], [3.15, -5], [3.6, 2], [4.05, -4], [4.8, 0]],
      angleZ: [[0, 0], [0.9, 8], [1.8, -8], [2.7, 8], [3.6, -8], [4.6, 0]],
      angleX: [[0, 0], [0.9, 4], [1.8, -4], [2.7, 4], [3.6, -4], [4.6, 0]],
      bodyAngleZ: [[0, 0], [0.9, -3], [1.8, 3], [2.7, -3], [3.6, 3], [4.6, 0]],
      bodyAngleX: [[0, 0], [1.8, 2], [3.6, -2], [4.8, 0]],
      handAngle: [[0, 0], [0.9, 3], [1.8, -3], [2.7, 3], [3.6, -3], [4.6, 0]],
      fingerTap: [[0, 0], [0.45, 1], [0.9, 0], [1.35, 1], [1.8, 0], [2.25, 1], [2.7, 0], [3.15, 1], [3.6, 0], [5.6, 0]],
      gazeX: [[0, 0], [0.9, 0.3], [1.8, -0.3], [2.7, 0.3], [3.6, -0.3], [4.6, 0]],
      eyeOpen: [[0, 1], [0.4, 0.72], [4.6, 0.72], [5.3, 1]],
      eyeSmile: [[0, 0], [0.4, 0.55], [4.6, 0.55], [5.3, 0]],
      blush: [[0, 0], [0.8, 0.3], [4.6, 0.3], [5.6, 0]],
      browY: [[0, 0], [0.5, 0.25], [4.6, 0.25], [5.4, 0]],
      breath: [[0, 0], [0.9, 0.9], [1.8, 0.2], [2.7, 0.9], [3.6, 0.2], [4.6, 0.8], [5.6, 0]]
    }
  },
  tap: {
    label: "Tap",
    dur: 5,
    idle: !0,
    tracks: {
      gazeX: [[0, 0], [0.3, -0.6], [2.2, -0.5], [2.5, -0.1], [2.8, -0.6], [4.2, -0.5], [4.7, 0]],
      gazeY: [[0, 0], [0.3, 0.55], [4.2, 0.5], [4.7, 0]],
      angleX: [[0, 0], [0.8, -11], [2.4, -9], [3, -12], [4.2, -10], [5, 0]],
      angleY: [[0, 0], [0.8, 8], [4.2, 7], [5, 0]],
      angleZ: [[0, 0], [0.8, 6], [2.4, 4], [3, 7], [4.2, 5], [5, 0]],
      bodyAngleX: [[0, 0], [1, -2], [4.2, -2], [5, 0]],
      handAngle: [[0, 0], [0.8, 3], [4.2, 3], [5, 0]],
      fingerTap: [
        [0, 0],
        [0.9, 0],
        [1.05, 1],
        [1.2, 0],
        [1.4, 1],
        [1.55, 0],
        [1.75, 1],
        [1.9, 0],
        [2.6, 0],
        [2.75, 1],
        [2.9, 0],
        [3.1, 1],
        [3.25, 0],
        [5, 0]
      ],
      browY: [[0, 0], [0.6, 0.3], [4.2, 0.25], [5, 0]],
      browAngle: [[0, 0], [0.6, -0.35], [4.2, -0.3], [5, 0]],
      eyeOpen: [[0, 1], [0.6, 0.9], [4.2, 0.9], [5, 1]],
      breath: [[0, 0], [0.8, 0.7], [2.2, 0.4], [3.2, 0.8], [4.4, 0], [5, 0.2]]
    }
  },
  readNote: {
    label: "Read script",
    dur: 2.6,
    idle: !0,
    tracks: {
      // a quick look down at the notes on the desk and back to the camera
      gazeY: [[0, 0], [0.2, -0.85], [1.5, -0.8], [1.75, 0], [2.6, 0]],
      gazeX: [[0, 0], [0.2, -0.15], [1.5, -0.1], [1.75, 0]],
      angleY: [[0, 0], [0.45, -9], [1.5, -8], [2, 1], [2.6, 0]],
      angleZ: [[0, 0], [0.5, 2], [1.6, 2], [2.6, 0]],
      eyeOpen: [[0, 1], [0.3, 0.78], [1.5, 0.78], [1.75, 1]],
      breath: [[0, 0.3], [0.8, 0.5], [1.8, 0.2], [2.6, 0.4]]
    }
  },
  waiting: {
    label: "Fidget",
    dur: 6.4,
    idle: !0,
    tracks: {
      // shifts her weight, checks the viewer, looks away, shifts back
      bodyAngleZ: [[0, 0], [0.9, 5], [2.4, 4], [3.3, -5], [5.2, -4], [6.4, 0]],
      bodyAngleX: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      angleZ: [[0, 0], [1, -6], [2.4, -4], [3.4, 6], [5.2, 5], [6.4, 0]],
      angleX: [[0, 0], [1.2, -8], [2.2, 2], [3.6, 12], [5, 10], [6.2, 0]],
      angleY: [[0, 0], [1.2, -3], [2.2, 2], [3.6, -2], [6.2, 0]],
      armAngle: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      handAngle: [[0, 0], [1.2, 3], [3.4, -3], [6.4, 0]],
      fingerTap: [[0, 0], [4.2, 0], [4.35, 1], [4.5, 0], [4.7, 1], [4.85, 0], [6.4, 0]],
      gazeX: [[0, 0], [0.9, -0.7], [1.9, -0.6], [2.1, 0], [2.7, 0], [2.9, 0.8], [5, 0.7], [5.4, 0], [6.4, 0]],
      gazeY: [[0, 0], [0.9, -0.2], [2.1, 0], [2.9, 0.3], [5.4, 0]],
      eyeOpen: [[0, 1], [2, 1], [2.2, 1.06], [2.8, 1.05], [3.1, 0.85], [5.4, 0.85], [6.2, 1]],
      browAngle: [[0, 0], [0.9, -0.35], [2, -0.35], [2.3, 0], [3.1, -0.4], [5.4, -0.35], [6.4, 0]],
      browY: [[0, 0], [2.2, 0.4], [2.8, 0.35], [3.2, 0], [6.4, 0]],
      breath: [[0, 0.3], [0.9, 0.8], [2, 0.3], [2.6, 0.9], [3.4, 0.2], [4.4, 0.8], [5.6, 0], [6.4, 0.2]]
    }
  },
  spaceOut: {
    label: "Daydream",
    dur: 7.4,
    idle: !0,
    tracks: {
      // gaze drifts up and away, breaths get slow and long, one slow blink
      gazeX: [[0, 0], [1.4, -0.55], [4.8, -0.6], [5.6, 0.1], [7, 0]],
      gazeY: [[0, 0], [1.4, 0.6], [4.8, 0.55], [5.6, 0], [7, 0]],
      angleX: [[0, 0], [2, -9], [4.8, -10], [6, 2], [7.4, 0]],
      angleY: [[0, 0], [2, 7], [4.8, 8], [6, -2], [7.4, 0]],
      angleZ: [[0, 0], [2, 9], [4.8, 11], [6, 2], [7.4, 0]],
      bodyAngleZ: [[0, 0], [2.2, 3], [4.8, 3.5], [6.4, 0]],
      bodyAngleX: [[0, 0], [2.2, -2], [4.8, -2], [6.4, 0]],
      handAngle: [[0, 0], [2.2, 4], [4.8, 5], [6.4, 0]],
      armAngle: [[0, 0], [2.2, 2], [4.8, 2], [6.4, 0]],
      eyeOpen: [[0, 1], [1.4, 0.8], [3, 0.8], [3.35, 0.56], [3.8, 0.8], [4.8, 0.8], [5.6, 1.04], [6.4, 1]],
      browY: [[0, 0], [1.6, 0.15], [4.8, 0.15], [5.6, 0.35], [6.6, 0]],
      breath: [[0, 0], [1.6, 0.9], [3.4, 0], [5, 0.9], [6.2, 0.1], [7.4, 0]]
    }
  }
};
function la(a, e) {
  if (e <= a[0][0]) return a[0][1];
  const t = a.length - 1;
  if (e >= a[t][0]) return a[t][1];
  let r = 0;
  for (; e > a[r + 1][0]; ) r++;
  const [i, s] = a[r], [p, w] = a[r + 1], E = (h) => h <= 0 || h >= t ? 0 : (a[h + 1][1] - a[h - 1][1]) / (a[h + 1][0] - a[h - 1][0]), A = p - i, T = (e - i) / A, l = E(r) * A, x = E(r + 1) * A, F = T * T, b = F * T;
  return (2 * b - 3 * F + 1) * s + (b - 2 * F + T) * l + (-2 * b + 3 * F) * w + (b - F) * x;
}
const $e = {
  a: { open: 0.9, form: 0, label: "あ" },
  i: { open: 0.5, form: -0.85, label: "い" },
  u: { open: 0.4, form: 0.9, label: "う" },
  e: { open: 0.62, form: -0.4, label: "え" },
  o: { open: 0.75, form: 0.6, label: "お" },
  n: { open: 0, form: null, label: "ん" }
  // closes with the previous shape
}, ha = {
  a: "あかさたなはまやらわがざだばぱぁ",
  i: "いきしちにひみりぎじぢびぴぃ",
  u: "うくすつぬふむゆるぐずづぶぷぅゔ",
  e: "えけせてねへめれげぜでべぺぇ",
  o: "おこそとのほもよろをごぞどぼぽぉ"
}, Ot = {};
for (const [a, e] of Object.entries(ha)) for (const t of e) Ot[t] = a;
const ua = /* @__PURE__ */ new Set([..."まみむめもばびぶべぼぱぴぷぺぽ"]), ca = /* @__PURE__ */ new Set([..."あいうえおぁぃぅぇぉ"]), gt = { ゃ: "a", ゅ: "u", ょ: "o" }, fa = /* @__PURE__ */ new Set([..."、。，．,.！？!? 　…"]), ma = (a) => a.replace(/[ァ-ヶ]/g, (e) => String.fromCharCode(e.charCodeAt(0) - 96));
function da(a, e = 0.14) {
  const t = [];
  for (const r of ma(a)) {
    const i = t[t.length - 1];
    if (gt[r] && i) {
      i.vowel = gt[r];
      continue;
    }
    if (r === "ー" && i) {
      i.dur += e;
      continue;
    }
    if (r === "っ") {
      t.push({ vowel: "n", dur: e * 0.8, onset: null });
      continue;
    }
    if (r === "ん") {
      t.push({ vowel: "n", dur: e, onset: null });
      continue;
    }
    if (fa.has(r)) {
      t.push({ vowel: "n", dur: e * 2.2, onset: null });
      continue;
    }
    const s = Ot[r];
    s && t.push({ vowel: s, dur: e, onset: ua.has(r) ? "lips" : ca.has(r) ? null : "consonant" });
  }
  return t;
}
function pa(a, e) {
  let t = 0;
  for (const r of a) {
    if (e < t + r.dur) {
      const i = (e - t) / r.dur, s = $e[r.vowel], p = r.onset === "lips" ? 0.05 : r.onset === "consonant" ? 0.45 : 1, w = i < 0.35 ? p + (1 - p) * (i / 0.35) : 1;
      return { open: s.open * w, form: s.form, vowel: r.vowel };
    }
    t += r.dur;
  }
  return null;
}
const Ze = { ...rt, ...nt }, yt = { amp: 1, stiff: 1.8 }, ga = /^(angle|bodyAngle|armAngle|handAngle)/, ya = /* @__PURE__ */ new Set([
  "eyeOpen",
  "eyeOpenL",
  "eyeSmileL",
  "eyeSmile",
  "mouthOpen",
  "mouthForm",
  "blush",
  "browY",
  "browAngle"
]), Ce = (a, e, t) => {
  const r = Math.min(1, Math.max(0, (t - a) / (e - a)));
  return r * r * (3 - 2 * r);
};
function bt(a, e) {
  const t = Math.floor(a), r = a - t, i = (p) => {
    const w = Math.sin((p + e * 57.3) * 127.1) * 43758.5453;
    return w - Math.floor(w);
  }, s = r * r * (3 - 2 * r);
  return (i(t) * (1 - s) + i(t + 1) * s) * 2 - 1;
}
const be = (a, e) => bt(a, e) * 0.7 + bt(a * 2.3, e + 9) * 0.3, ue = (a, e, t) => Math.max(e, Math.min(t, a)), Lt = {
  normal: { label: "Neutral", p: {} },
  smile: { label: "Smile", p: { eyeOpen: 0, eyeSmile: 1, blush: 0.35, browY: 0.2 } },
  shy: { label: "Blush", p: { eyeOpen: 0.78, eyeSmile: 0.5, blush: 1, browAngle: -0.5, browY: -0.1, glance: [0.7, 0.35] } },
  jito: { label: "Half-lidded", p: { eyeOpen: 0.5, browY: -0.5, browAngle: 0.6 } },
  surprise: { label: "Surprise", p: { eyeOpen: 1.22, browY: 1, mouthOpen: 0.6, mouthForm: 0.6 } },
  wink: { label: "Wink", p: { eyeOpenL: 0, eyeSmileL: 1, blush: 0.3 } },
  // talking faces for AITuber OnAir emotion tags: eyes stay mostly open (closed / ^^ eyes are
  // what a single image fakes worst, and they would stay shut for a whole sentence)
  happyTalk: { label: "happy", p: { eyeOpen: 0.8, eyeSmile: 0.45, blush: 0.35, browY: 0.25, mouthForm: -0.5 } },
  sadTalk: { label: "sad", p: { eyeOpen: 0.78, browAngle: -0.8, browY: -0.2, mouthForm: 0.3, glance: [0, -0.35] } },
  angryTalk: { label: "angry", p: { eyeOpen: 0.72, browAngle: 0.85, browY: -0.55, mouthForm: 0.2 } },
  surprisedTalk: { label: "surprised", p: { eyeOpen: 1.18, browY: 0.9, mouthForm: 0.9 } },
  relaxedTalk: { label: "relaxed", p: { eyeOpen: 0.82, eyeSmile: 0.35, blush: 0.15, browY: 0.1 } }
}, vt = {
  happy: ["happyTalk", "nod"],
  sad: ["sadTalk", "sigh"],
  angry: ["angryTalk", "no"],
  surprised: ["surprisedTalk", "surprise"],
  relaxed: ["relaxedTalk", "sway"],
  neutral: ["normal", null]
}, ba = {
  gazeX: [260, 0.9],
  gazeY: [260, 0.9],
  angleX: [55, 0.72],
  angleY: [55, 0.72],
  angleZ: [45, 0.75],
  bodyAngleX: [14, 0.9],
  bodyAngleZ: [12, 0.9],
  armAngle: [20, 0.85],
  handAngle: [30, 0.8]
};
class va {
  /** @param {number[]} gazeCenter */
  constructor(e) {
    this.mode = "auto", this.P = Object.fromEntries(Xe.map((t) => [t.id, t.def])), this.manual = { ...this.P }, this.cur = { ...this.P }, this.vel = Object.fromEntries(Xe.map((t) => [t.id, 0])), this.expr = "normal", this.exprMix = {}, this.t = 0, this.blink = { t: 0, start: 1.5, double: !1 }, this.gaze = { x: 0, y: 0, next: 0 }, this.tap = { next: 4, until: -1 }, this.pointer = null, this.faceCenter = [...e], this.lipOpen = null, this.lipForm = 0, this.speaking = !1, this.voice = 0, this.mouth = 0, this.vowel = "a", this.vowelForm = 0, this.syllableArmed = !0, this.voicePeak = 0, this.voiceTrough = 0, this.kana = null, this.lipHold = null, this.emotionUntil = 0, this.talkGain = 1, this.play = null, this.autoMotion = !0, this.nextAuto = 14, this.autoIdle = !0, this.nextIdle = 3, this.lastAuto = null, this.onMotion = null;
  }
  setExpression(e) {
    this.expr = e;
  }
  hasMotion(e) {
    return e in Ze;
  }
  // ---- speech (driven from outside, e.g. by the TTS audio analyser) ----
  setVoiceLevel(e) {
    this.voice = Math.min(1, Math.max(0, Number(e) || 0));
  }
  setSpeaking(e) {
    e !== this.speaking && (this.speaking = !!e, e || (this.emotionUntil = this.t + 1.2, this.voice = 0));
  }
  /** `playMotion: false` changes only the face (a caller that picks motions itself). */
  setEmotion(e, { playMotion: t = !0 } = {}) {
    const r = vt[e] ?? vt.neutral;
    this.expr = r[0], this.emotionUntil = 1 / 0, r[1] && t && this.playMotion(r[1]);
  }
  /** Mouth shapes from kana text, without audio (preview / tuning). */
  /** @param {string} text @param {{ speed?: number, loop?: boolean }} [options] */
  speakKana(e, { speed: t, loop: r = !1 } = {}) {
    this.lipHold = null;
    const i = da(e, t === void 0 ? 0.14 : 1 / ue(Number(t) || 7, 4, 12));
    this.kana = i.length ? { moras: i, t: 0, loop: r, duration: i.reduce((s, p) => s + p.dur, 0) } : null;
  }
  holdMouth(e) {
    this.kana = null, this.lipHold = Object.hasOwn($e, e) ? e : null;
  }
  stopLipSync() {
    this.kana = null, this.lipHold = null, this.lipOpen = null, this.mouth = 0;
  }
  getLipSyncState() {
    return { active: this.kana !== null || this.lipHold !== null, open: this.P.mouthOpen, form: this.P.mouthForm };
  }
  // Mouth from the TTS loudness. A volume signal has no vowel information, so each syllable
  // (the voice dipping and rising again) gets one vowel at random, weighted towards a, and
  // keeps it until the next syllable: the drawn mouths must not change shape mid-syllable.
  // Syllables are found relative to the recent peak (not an absolute level), and the mouth
  // is scaled by where the voice sits between the recent trough and peak, so it closes in
  // the dip before each mora even when a loud voice never gets quiet.
  speechMouth(e) {
    if (this.kana || this.lipHold) {
      let l;
      if (this.lipHold ? l = $e[this.lipHold] : (this.kana.t += e, this.kana.loop && (this.kana.t %= this.kana.duration), l = pa(this.kana.moras, this.kana.t)), !l)
        return this.kana = null, this.mouth > 0.01 ? [this.mouth *= 0.6, this.vowelForm] : null;
      const x = l.open > this.mouth ? 1 - Math.exp(-e * 30) : 1 - Math.exp(-e * 22);
      return this.mouth += (l.open - this.mouth) * x, l.form !== null && (this.vowelForm = l.form), [this.mouth, this.vowelForm];
    }
    const t = this.speaking ? this.voice : 0, r = 1 - Math.exp(-e * 5);
    this.voicePeak = t > this.voicePeak ? t : this.voicePeak + (t - this.voicePeak) * r, this.voiceTrough = t < this.voiceTrough ? t : this.voiceTrough + (t - this.voiceTrough) * r;
    const i = Math.max(this.voicePeak, 0.05);
    if (t < i * 0.6) this.syllableArmed = !0;
    else if (this.syllableArmed && t > i * 0.8 && t > 0.1) {
      this.syllableArmed = !1;
      const l = Math.random();
      this.vowel = l < 0.4 ? "a" : l < 0.58 ? "o" : l < 0.74 ? "e" : l < 0.88 ? "i" : "u";
    }
    const s = this.voicePeak - this.voiceTrough, p = s < i * 0.3 ? 1 : Math.max(0, (t - this.voiceTrough) / s), w = $e[this.vowel ?? "a"], E = Math.min(1, Math.pow(t, 0.7) * 1.15) * Math.pow(p, 0.3), A = this.speaking ? Math.min(0.95, E) * (0.45 + 0.55 * w.open / 0.9) : 0, T = A > this.mouth ? 1 - Math.exp(-e * 40) : 1 - Math.exp(-e * 32);
    return this.mouth += (A - this.mouth) * T, this.speaking && (this.vowelForm = w.form), this.speaking || this.mouth > 0.01 ? [this.mouth, this.vowelForm] : null;
  }
  // Breathing: inhale ~40% of the cycle, a slower exhale, a short pause at the bottom,
  // and a period that drifts between ~3.2 and 4.6 s so it never looks metronomic.
  breathValue(e) {
    this.breathPhase = (this.breathPhase ?? 0) + e / (this.breathPeriod ?? 3.8), this.breathPhase >= 1 && (this.breathPhase -= 1, this.breathPeriod = 3.2 + Math.random() * 1.4);
    const t = this.breathPhase;
    return t < 0.4 ? Ce(0, 0.4, t) : t < 0.88 ? 1 - Ce(0.4, 0.88, t) : 0;
  }
  // pick one at random, never the one that just played
  playRandom(e) {
    const t = e.filter((r) => r !== this.lastAuto);
    this.playMotion(t[Math.floor(Math.random() * t.length)]);
  }
  playMotion(e) {
    this.lastAuto = e, this.play = { id: e, t: 0 }, this.onMotion?.(e);
  }
  blinkValue(e) {
    const t = this.blink;
    if (t.t += e, t.t < t.start) return 1;
    const r = (t.t - t.start) / 0.17;
    return r >= 1 ? (t.double ? (t.double = !1, t.start = t.t + 0.07) : (t.start = t.t + 1.8 + Math.random() * 4.2, t.double = Math.random() < 0.18), 1) : r < 0.45 ? 1 - r / 0.45 : (r - 0.45) / 0.55;
  }
  update(e) {
    this.t += e;
    const t = this.t, r = {};
    for (const b of Xe) r[b.id] = b.def;
    if (this.mode === "manual")
      Object.assign(r, this.manual);
    else if (this.mode === "auto") {
      if (r.angleX = be(t * 0.18, 1) * 10 + this.gaze.x * 11, r.angleY = be(t * 0.15, 2) * 6 - 1 + this.gaze.y * 7, r.angleZ = be(t * 0.12, 3) * 10, r.bodyAngleX = be(t * 0.1, 4) * 5, r.bodyAngleZ = be(t * 0.09, 5) * 4, r.armAngle = be(t * 0.14, 6) * 5, r.handAngle = be(t * 0.21, 7) * 5, t > this.gaze.next) {
        const b = Math.random();
        this.gaze.x = b < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.8, this.gaze.y = b < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5, this.gaze.next = t + 0.8 + Math.random() * 2.5;
      }
      if (r.gazeX = this.gaze.x + r.angleX / 60, r.gazeY = this.gaze.y + r.angleY / 60, t > this.tap.next && (this.tap.until = t + 1.1, this.tap.next = t + 5 + Math.random() * 6), this.speaking) {
        this.nextIdle = Math.max(this.nextIdle, t + 2.5), this.nextAuto = Math.max(this.nextAuto, t + 6);
        const b = this.talkGain;
        this.talkNod = (this.talkNod ?? 0) + (this.voice * 7 * b - (this.talkNod ?? 0)) * Math.min(1, e * 6), r.angleY -= this.talkNod, r.angleX += be(t * 0.6, 11) * 5 * b, r.angleZ += be(t * 0.5, 12) * 4 * b;
      }
      !this.speaking && t > this.emotionUntil && (this.expr = "normal", this.emotionUntil = 1 / 0), this.speaking || (!this.play && this.autoMotion && t > this.nextAuto ? (this.playRandom(Object.keys(rt).filter((b) => b !== "surprise")), this.nextAuto = t + 15 + Math.random() * 10, this.nextIdle = Math.max(this.nextIdle, t + 5)) : !this.play && this.autoIdle && t > this.nextIdle && (this.playRandom(Object.keys(nt)), this.nextIdle = t + 5 + Math.random() * 5));
    } else if (this.mode === "mouse" && this.pointer) {
      const b = (this.pointer[0] - this.faceCenter[0]) / 500, h = (this.pointer[1] - this.faceCenter[1]) / 500;
      r.angleX = ue(b * 30, -30, 30), r.angleY = ue(-h * 30, -30, 30), r.angleZ = ue(-b * h * 25, -12, 12), r.bodyAngleX = ue(b * 10, -10, 10) * 0.6, r.gazeX = ue(b * 1.4, -1, 1), r.gazeY = ue(-h * 1.4, -1, 1), r.handAngle = ue(b * 4, -5, 5);
    }
    this.mode !== "manual" && (r.breath = this.breathValue(e), t < this.tap.until && (r.fingerTap = Math.max(0, Math.sin((this.tap.until - t) * Math.PI * 3.6)) ** 2));
    let i = null, s = 0;
    if (this.play) {
      const b = Ze[this.play.id];
      if (this.play.t += e, this.play.t >= b.dur)
        this.play = null, this.onMotion?.(null);
      else {
        i = {};
        for (const [h, f] of Object.entries(b.tracks))
          i[h] = la(f, this.play.t) * (b.idle && ga.test(h) ? yt.amp : 1);
        s = Ce(0, 0.15, this.play.t) * (1 - Ce(b.dur - 0.25, b.dur, this.play.t));
        for (const [h, f] of Object.entries(i))
          oa.has(h) ? r[h] += f : h === "breath" ? r[h] += (f - r[h]) * s : ya.has(h) || (r[h] = Math.max(r[h], Math.max(0, f)));
      }
    }
    this.mode !== "manual" && (r.angleY += r.breath * 1.6);
    const p = Lt[this.expr].p, w = ["eyeOpen", "eyeOpenL", "eyeSmileL", "eyeSmile", "mouthOpen", "mouthForm", "blush", "browY", "browAngle", "gx", "gy"], E = {
      eyeOpen: p.eyeOpen ?? 1,
      eyeOpenL: p.eyeOpenL ?? p.eyeOpen ?? 1,
      eyeSmileL: p.eyeSmileL ?? p.eyeSmile ?? 0,
      eyeSmile: p.eyeSmile ?? 0,
      mouthOpen: p.mouthOpen ?? 0,
      mouthForm: p.mouthForm ?? 0,
      blush: p.blush ?? 0,
      browY: p.browY ?? 0,
      browAngle: p.browAngle ?? 0,
      gx: p.glance?.[0] ?? 0,
      gy: p.glance?.[1] ?? 0
    }, A = 1 - Math.exp(-e * 9);
    for (const b of w)
      this.exprMix[b] === void 0 && (this.exprMix[b] = E[b]), this.exprMix[b] += (E[b] - this.exprMix[b]) * A;
    const T = this.exprMix, l = {};
    for (const b of Xe) {
      const h = b.id;
      if (this.mode === "manual" && !i) {
        l[h] = r[h], this.cur[h] = r[h], this.vel[h] = 0;
        continue;
      }
      let [f, c] = ba[h] ?? [120, 0.95];
      i && /^angle|^body/.test(h) && (Ze[this.play?.id ?? ""]?.idle ? (f *= yt.stiff, c = 0.8) : /^angle/.test(h) && (f *= 4.5, c = 0.75));
      const n = 2 * Math.sqrt(f) * c;
      this.vel[h] += (f * (r[h] - this.cur[h]) - n * this.vel[h]) * e, this.cur[h] += this.vel[h] * e, l[h] = this.cur[h];
    }
    let x = 1;
    if (this.mode !== "manual" ? (x = this.blinkValue(e), l.eyeROpen = T.eyeOpen * x, l.eyeLOpen = T.eyeOpenL * x, l.eyeSmile = T.eyeSmile, l.eyeSmileL = T.eyeSmileL, l.mouthOpen = T.mouthOpen, l.mouthForm = T.mouthForm, l.blush = T.blush, l.browY = T.browY + (l.angleY > 0 ? l.angleY / 60 : 0) - (1 - x) * 0.18, l.browAngle = T.browAngle, l.gazeX = ue(l.gazeX + T.gx, -1, 1), l.gazeY = ue(l.gazeY + T.gy, -1, 1)) : l.eyeSmileL = l.eyeSmile, i) {
      const b = (f, c) => {
        l[f] += (c - l[f]) * s;
      }, h = (f) => Math.min(1.3, Math.max(0, f));
      "eyeOpen" in i && (b("eyeROpen", h(i.eyeOpen) * x), "eyeOpenL" in i || b("eyeLOpen", h(i.eyeOpen) * x)), "eyeOpenL" in i && b("eyeLOpen", h(i.eyeOpenL) * x), "eyeSmile" in i && (b("eyeSmile", i.eyeSmile), "eyeSmileL" in i || b("eyeSmileL", i.eyeSmile)), "eyeSmileL" in i && b("eyeSmileL", i.eyeSmileL);
      for (const f of ["mouthOpen", "mouthForm", "blush", "browY", "browAngle"])
        f in i && b(f, f === "mouthOpen" || f === "blush" ? Math.max(0, i[f]) : i[f]);
    }
    const F = this.speechMouth(e);
    return F ? (this.lipOpen = F[0], this.lipForm = F[1]) : this.lipOpen !== null && !this.speaking && !this.kana && (this.lipOpen = null), this.lipOpen !== null && (l.mouthOpen = Math.max(l.mouthOpen * 0.3, this.lipOpen), l.mouthForm = ue(this.lipForm, -1, 1)), this.P = l, l;
  }
}
const it = {
  neutral: "normal",
  smile: "smile",
  shy: "shy",
  surprise: "surprise",
  halfLidded: "jito",
  angry: "angryTalk",
  sad: "sadTalk",
  wink: "wink"
}, xa = { sad: { pitch: -6, gy: -0.45 } }, Te = (a, e, t) => Math.max(e, Math.min(t, a)), Re = Object.freeze({ eyeOpen: 1, eyeOpenL: 1, eyeSmile: 0, eyeSmileL: 0, blush: 0, browY: 0, browAngle: 0, mouthOpen: 0, gx: 0, gy: 0, pitch: 0 });
function wa(a) {
  const e = Lt[it[a]]?.p ?? {}, t = xa[a] ?? {};
  return {
    eyeOpen: e.eyeOpen ?? 1,
    eyeOpenL: e.eyeOpenL ?? e.eyeOpen ?? 1,
    eyeSmile: e.eyeSmile ?? 0,
    eyeSmileL: e.eyeSmileL ?? e.eyeSmile ?? 0,
    blush: e.blush ?? 0,
    browY: e.browY ?? 0,
    browAngle: e.browAngle ?? 0,
    mouthOpen: e.mouthOpen ?? 0,
    gx: e.glance?.[0] ?? 0,
    gy: t.gy ?? e.glance?.[1] ?? 0,
    pitch: t.pitch ?? 0
  };
}
function Aa(a, e) {
  const t = { ...a };
  return t.eyeROpen = (a.eyeROpen ?? 1) * e.eyeOpen, t.eyeLOpen = (a.eyeLOpen ?? 1) * e.eyeOpenL, t.eyeSmile = Math.max(a.eyeSmile ?? 0, e.eyeSmile), t.eyeSmileL = Math.max(a.eyeSmileL ?? a.eyeSmile ?? 0, e.eyeSmileL), t.blush = Math.max(a.blush ?? 0, e.blush), t.browY = Te((a.browY ?? 0) + e.browY, -1, 1), t.browAngle = Te((a.browAngle ?? 0) + e.browAngle, -1, 1), t.mouthOpen = Math.max(a.mouthOpen ?? 0, e.mouthOpen), t.gazeX = Te((a.gazeX ?? 0) + e.gx, -1, 1), t.gazeY = Te((a.gazeY ?? 0) + e.gy, -1, 1), t.angleY = Te((a.angleY ?? 0) + e.pitch, -30, 30), t;
}
class Ma {
  /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
  name = "neutral";
  mix = { ...Re };
  /** @param {string} name */
  set(e) {
    this.name = Object.hasOwn(it, e) ? (
      /** @type {keyof typeof OVERLAY_EXPRESSIONS} */
      e
    ) : "neutral";
  }
  /** True while an expression is shown or still fading out. */
  get active() {
    return this.name !== "neutral" || Object.keys(Re).some((e) => Math.abs(this.mix[e] - Re[e]) > 1e-3);
  }
  apply(e, t) {
    if (!this.active)
      return this.mix = { ...Re }, e;
    const r = wa(this.name), i = 1 - Math.exp(-Math.max(0, t) * 12);
    for (const s of Object.keys(Re)) this.mix[s] += (r[s] - this.mix[s]) * i;
    return Aa(e, this.mix);
  }
}
const xt = ["ball", "low", "crease", "lash"], We = /* @__PURE__ */ new Map(), He = /* @__PURE__ */ new Map();
async function wt(a) {
  return He.has(a) || He.set(a, fetch(a).then((e) => {
    if (!e.ok) throw new Error(`failed to load ${a}`);
    return e.json();
  })), He.get(a);
}
function At(a) {
  if (We.has(a)) return We.get(a);
  const e = new Promise((t, r) => {
    const i = new Image();
    i.onload = () => t(i), i.onerror = () => r(new Error(`failed to load ${a}`)), i.src = a;
  });
  return We.set(a, e), e;
}
function kt(a, e) {
  const t = document.createElement("canvas");
  t.width = a.width, t.height = a.height;
  const r = t.getContext("2d");
  r.drawImage(a, 0, 0);
  const i = r.getImageData(0, 0, t.width, t.height).data, s = new Uint8Array(t.width * t.height);
  for (let p = 0; p < s.length; p++) s[p] = i[p * 4 + e];
  return s;
}
const Oe = (a) => kt(a, 3);
function Ea(a, e) {
  const [t, r] = a.t.pivot, i = a.dir, s = a.pts, p = (F, b, h) => {
    const f = Math.min(1, Math.max(0, (h - F) / (b - F)));
    return f * f * (3 - 2 * f);
  }, w = Math.cos(a.phi[0]), E = Math.sin(a.phi[0]), A = Math.cos(a.phi[1]), T = Math.sin(a.phi[1]), l = e.rest, x = e.pos;
  for (let F = 0; F < l.length; F += 2) {
    const b = l[F] - t, h = l[F + 1] - r, f = b * i[0] + h * i[1], c = s[0][0] + b * w - h * E, n = s[0][1] + b * E + h * w, o = b - i[0] * a.L1, O = h - i[1] * a.L1, u = s[1][0] + o * A - O * T, y = s[1][1] + o * T + O * A, Y = p(a.L1 * 0.55, a.L1 * 1.35, f);
    x[F] = c + (u - c) * Y, x[F + 1] = n + (y - n) * Y;
  }
}
async function Sa(a, e) {
  if (!e.assets && e.assetsBase === void 0)
    throw new Error("createMeshAvatar requires assets or assetsBase.");
  const t = e.rig, r = It(t), {
    IMG: i,
    EYES: s,
    baseWeights: p,
    deformBase: w,
    eyePartY: E,
    eyePartAlpha: A,
    handWeights: T,
    handFrame: l,
    deformHand: x,
    TASSELS: F
  } = r, { Renderer: b, buildGrid: h } = ra(r, t), { Physics: f } = na(r, t), { createSprites: c } = ia(r, t), n = (e.assetsBase ?? "").replace(/\/?$/, "/"), o = (d, M) => {
    if (e.assets) {
      if (!e.assets[d]) throw new Error(`Missing project asset: ${d}`);
      return e.assets[d];
    }
    return `${n}${d}${M === void 0 ? "" : `?b=${M}`}`;
  }, O = await wt(o("layers.json")), u = ["base", ...t.hand ? ["hand"] : [], ...F.map((d) => d.name), ...[0, 1].flatMap((d) => xt.map((M) => `eye${d}_${M}`)), "hairmask"], y = Object.fromEntries(await Promise.all(u.map(async (d) => [d, await At(o(`${d}.png`, O.build))]))), Y = kt(y.hairmask, 0), U = (d, M) => Y[Math.min(i.h - 1, Math.max(0, Math.round(M))) * i.w + Math.min(i.w - 1, Math.max(0, Math.round(d)))] / 255, z = new b(a, { padTop: e.padTop ?? t.view.padTop, padSide: e.padSide ?? t.view.padSide, fit: e.fit }), _ = { base: [0, 0, i.w, i.h], ...O.layers }, P = h(_.base, t.mesh.baseCell, Oe(y.base), y.base.width, t.mesh.fine), S = [];
  for (let d = 0; d < P.rest.length / 2; d++) {
    const M = P.rest[d * 2], I = P.rest[d * 2 + 1];
    S.push(p(M, I, U(M, I)));
  }
  z.addLayer("base", y.base, P, { face: !0 });
  const X = [];
  s.forEach((d, M) => {
    for (const I of xt) {
      const Z = `eye${M}_${I}`, Q = h(_[Z], I === "ball" ? t.mesh.eyeBallCell : t.mesh.eyeCell, Oe(y[Z]), y[Z].width), ae = [];
      for (let ie = 0; ie < Q.rest.length / 2; ie++) ae.push(p(Q.rest[ie * 2], Q.rest[ie * 2 + 1], 0));
      const re = z.addLayer(Z, y[Z], Q, { eyeBall: I === "ball" ? M : void 0 });
      X.push({ e: d, eye: M, part: I, mesh: Q, W: ae, layer: re });
    }
  });
  let N = null;
  try {
    {
      const d = await wt(o("sprites/sprites.json")), M = Object.fromEntries(await Promise.all(Object.keys(d.layers).map(async (I) => [I, await At(o(`sprites/${I}.png`, d.build))])));
      N = c(z, d, M, h, Oe);
    }
  } catch (d) {
    console.warn("eye / mouth sprites not loaded:", d);
  }
  const J = F.map((d) => {
    const M = h(_[d.name], t.mesh.tasselCell, Oe(y[d.name]), y[d.name].width);
    return z.addLayer(d.name, y[d.name], M);
  }), j = t.hand ? h(_.hand, t.mesh.handCell, Oe(y.hand), y.hand.width) : { rest: [], pos: [] }, H = [];
  for (let d = 0; d < j.rest.length / 2; d++) H.push(T(j.rest[d * 2], j.rest[d * 2 + 1]));
  t.hand && z.addLayer("hand", y.hand, j);
  const W = new f(), k = new va(t.view.gazeCenter ?? [t.head.cx, t.head.cy]), $ = /* @__PURE__ */ new Set();
  k.onMotion = (d) => {
    for (const M of $) M(d);
  };
  let D = {}, V = 1, K = {};
  const q = new Ma(), m = [0, 0];
  function g(d) {
    const M = { ...k.update(d) };
    for (const [Z, Q] of Object.entries(D)) M[Z] = V === 1 ? Q : (M[Z] ?? 0) + (Q - (M[Z] ?? 0)) * V;
    k.lipOpen !== null && (M.mouthOpen = k.P.mouthOpen, (!e.preserveMouthForm || D.mouthForm === void 0) && (M.mouthForm = k.P.mouthForm));
    const I = q.apply(M, d);
    return K = I, I;
  }
  function v(d) {
    const M = g(d), I = W.step(M, d), Z = P.pos, Q = P.rest;
    for (let G = 0; G < S.length; G++)
      w(Q[G * 2], Q[G * 2 + 1], S[G], M, I, m), Z[G * 2] = m[0], Z[G * 2 + 1] = m[1];
    const ae = (G) => N ? 1 : G;
    for (const G of X) {
      const Ue = ae(G.eye === 0 ? M.eyeROpen : M.eyeLOpen), ot = G.eye === 0 ? M.eyeSmile : M.eyeSmileL ?? M.eyeSmile;
      G.layer.alpha = A(G.part, Ue, ot);
      const lt = G.mesh.rest, ht = G.mesh.pos;
      for (let xe = 0; xe < G.W.length; xe++) {
        const ut = lt[xe * 2], zt = lt[xe * 2 + 1];
        w(ut, E(G.e, G.part, ut, zt, Ue, ot), G.W[xe], M, I, m), ht[xe * 2] = m[0], ht[xe * 2 + 1] = m[1];
      }
    }
    const re = N?.update(M, I, d, sa(q.name, k.mode === "manual" ? null : k.expr));
    if (re) for (const G of X) re.eyes[G.eye] && (G.layer.alpha = 0);
    const ie = j.pos, de = j.rest, Be = l(M);
    for (let G = 0; G < H.length; G++)
      x(de[G * 2], de[G * 2 + 1], H[G], M, Be, m), ie[G * 2] = m[0], ie[G * 2 + 1] = m[1];
    W.chains.forEach((G, Ue) => Ea(G, J[Ue].mesh));
    const Ye = 7;
    z.draw({
      angleX: M.angleX,
      angleY: M.angleY,
      angleZ: M.angleZ,
      eyes: [
        ae(M.eyeROpen),
        M.eyeSmile,
        M.gazeX * Ye,
        -M.gazeY * Ye * 0.6,
        ae(M.eyeLOpen),
        M.eyeSmileL ?? M.eyeSmile,
        M.gazeX * Ye * 0.85,
        -M.gazeY * Ye * 0.6
      ],
      // with sprites the drawn mouths replace the shader-painted one
      mouthOpen: N ? 0 : M.mouthOpen,
      mouthForm: M.mouthForm,
      cheek: M.blush,
      showMesh: !1,
      originalAlpha: 0,
      joints: []
    });
  }
  let L = 0, B = performance.now(), C = !1;
  const R = (d) => {
    const M = Math.min(0.05, (d - B) / 1e3);
    B = d, v(M), L = requestAnimationFrame(R);
  };
  return e.manual || (L = requestAnimationFrame(R)), {
    motions: [
      ...Object.entries(rt).map(([d, M]) => ({ id: d, label: M.label, idle: !1 })),
      ...Object.entries(nt).map(([d, M]) => ({ id: d, label: M.label, idle: !0 }))
    ],
    setParameters(d, M = 1) {
      D = { ...d }, V = Math.min(1, Math.max(0, Number(M) || 0));
    },
    getParameters() {
      return { ...K };
    },
    /** 0..1 loudness of the voice being played (e.g. normalised RMS). */
    setVoiceLevel(d) {
      k.setVoiceLevel(d);
    },
    /** true while TTS audio is playing: idle motions pause and the head nods along. */
    setSpeaking(d) {
      k.setSpeaking(d);
    },
    /** AITuber OnAir emotion tag: happy / sad / angry / surprised / relaxed / neutral (or null). */
    setEmotion(d, M) {
      k.setEmotion(d, M);
    },
    /** Live expression layered over tracking (see OVERLAY_EXPRESSIONS); 'neutral' clears it. */
    setExpression(d) {
      q.set(d);
    },
    getExpression() {
      return { name: q.name, active: q.active };
    },
    /** How much the head moves with the voice while speaking (1 = default, calmer below). */
    setTalkGain(d) {
      k.talkGain = Math.max(0, Number(d) || 0);
    },
    /** Play a motion or idle motion by id (see `motions`). */
    play(d) {
      k.hasMotion(d) && k.playMotion(d);
    },
    /** Move the mouth through the vowels of kana text (no audio; for previews). */
    speakKana(d, M) {
      k.speakKana(String(d ?? ""), M);
    },
    holdMouth(d) {
      k.holdMouth(d);
    },
    stopLipSync() {
      k.stopLipSync();
    },
    getLipSyncState() {
      return k.getLipSyncState();
    },
    setAutoIdle(d) {
      k.autoIdle = !!d;
    },
    setLighting(d) {
      z.setLighting(d);
    },
    getLightingStats() {
      return { ...z.lightingStats };
    },
    setAutoMotion(d) {
      k.autoMotion = !!d;
    },
    /** Hair / tassel sway multiplier (1 = default). */
    setSwayGain(d) {
      W.gain = d;
    },
    /** Called with the motion id when a motion starts and with null when it ends. */
    onMotion(d) {
      return $.add(d), () => $.delete(d);
    },
    /** Advance the simulation by `sec` and draw (for tests / hidden tabs). */
    advance(d, M = 60) {
      if (!C)
        if (d === 0) v(0);
        else for (let I = 0; I < Math.round(d * M); I++) v(1 / M);
    },
    /** Update motion and lip sync without drawing a hidden preview. */
    advanceParameters(d) {
      C || g(d);
    },
    destroy() {
      C || (C = !0, cancelAnimationFrame(L), $.clear(), z.destroy());
    }
  };
}
const Ta = Object.keys(it);
async function Ra(a, e) {
  return Sa(a, { ...e, rig: at(e.rig) });
}
function Ne(a) {
  if (!a || typeof a != "object" || Array.isArray(a))
    throw new Error("avatar.json: expected an object");
  const e = a, t = [];
  e.format !== "mesh-avatar" && t.push('avatar.json.format: expected "mesh-avatar"'), e.version !== 1 && t.push(`avatar.json.version: unsupported version ${JSON.stringify(e.version) ?? "missing"} (expected 1)`), (typeof e.name != "string" || !e.name.trim()) && t.push("avatar.json.name: expected a non-empty string");
  const r = { format: "mesh-avatar", version: 1, name: e.name };
  for (const i of ["author", "license", "thumbnail", "source"])
    e[i] !== void 0 && (typeof e[i] != "string" ? t.push(`avatar.json.${i}: expected a string`) : r[i] = e[i]);
  if (e.studio !== void 0) {
    const i = e.studio;
    !i || typeof i != "object" || Array.isArray(i) || !("version" in i) || typeof i.version != "string" || !i.version.trim() ? t.push("avatar.json.studio.version: expected a non-empty string") : r.studio = { version: i.version };
  }
  if (t.length) throw new Error(t.join(`
`));
  return r;
}
function Oa(a) {
  return Ne({ format: "mesh-avatar", version: 1, name: a });
}
const Ve = (a) => !!a && typeof a == "object" && !Array.isArray(a), we = (a, e) => Array.isArray(a) && a.length === e && a.every((t) => typeof t == "number" && Number.isFinite(t)), Ge = (a, e) => Object.hasOwn(a, e);
function La(a) {
  const e = [];
  function t(x, F = !0) {
    if (!Ge(a, x)) {
      F && e.push(`${x}: missing file`);
      return;
    }
    const b = a[x];
    if (!(b instanceof Uint8Array)) {
      e.push(`${x}: JSON bytes are required`);
      return;
    }
    let h;
    try {
      h = JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(b));
    } catch {
      e.push(`${x}: invalid UTF-8 JSON`);
      return;
    }
    if (!Ve(h)) {
      e.push(`${x}: expected an object`);
      return;
    }
    return h;
  }
  function r(x, F, b = !0) {
    return x.version === 1 || b && x.version === void 0 ? !0 : (e.push(`${F}.version: unsupported version ${JSON.stringify(x.version) ?? "missing"} (expected 1)`), !1);
  }
  function i(x) {
    if (!Ge(a, x)) {
      e.push(`${x}: missing file`);
      return;
    }
    const F = a[x], b = F instanceof Uint8Array ? F.byteLength : F?.size;
    (!Number.isSafeInteger(b) || b <= 0) && e.push(`${x}: expected a non-empty file`);
  }
  function s(x, F, b, h) {
    if (!Ve(x)) {
      e.push(`${F}.layers: expected a layer rectangle map`);
      return;
    }
    for (const [f, c] of Object.entries(x)) {
      const n = `${F}.layers.${f}`;
      if (!/^[A-Za-z0-9_-]+$/.test(f)) {
        e.push(`${n}: expected a safe layer name (letters, digits, hyphens or underscores)`);
        continue;
      }
      !we(c, 4) || !c.every(Number.isInteger) || c[0] < 0 || c[1] < 0 || c[2] <= 0 || c[3] <= 0 ? e.push(`${n}: expected [x, y, width, height] with non-negative integer origins and positive integer dimensions`) : h && (c[0] + c[2] > h[0] || c[1] + c[3] > h[1]) && e.push(`${n}: rectangle must stay inside the image`), i(`${b}/${f}.png`);
    }
    return x;
  }
  function p(x, F) {
    (typeof x.build != "string" || !x.build.trim()) && e.push(`${F}.build: expected a non-empty string`);
  }
  const w = t("avatar.json", !1);
  if (w)
    try {
      Ne(w);
    } catch (x) {
      e.push(x.message);
    }
  const E = t("rig.json");
  let A;
  if (E && r(E, "rig.json", !1)) {
    const x = Rt(E);
    e.push(...x.map((F) => `rig.json: ${F}`)), x.length || (A = E);
  }
  i("built/base.png"), i("built/hairmask.png");
  const T = t("built/layers.json");
  if (T && r(T, "built/layers.json")) {
    p(T, "built/layers.json");
    let x;
    !we(T.size, 2) || !T.size.every((b) => Number.isInteger(b) && b > 0) ? e.push("built/layers.json.size: expected [width, height] with positive integer dimensions") : (x = T.size, A && (x[0] !== A.image.width || x[1] !== A.image.height) && e.push("built/layers.json.size: must match rig.json.image"));
    const F = s(T.layers, "built/layers.json", "built", x);
    if (A && F) {
      const b = [
        ...A.eyes.flatMap((h, f) => ["ball", "low", "crease", "lash"].map((c) => `eye${f}_${c}`)),
        ...A.hand ? ["hand"] : [],
        ...(A.accessories ?? []).map((h) => h.name)
      ];
      for (const h of b) Ge(F, h) || e.push(`built/layers.json.layers.${h}: missing required layer`);
    }
    !Array.isArray(T.eyes) || T.eyes.length !== 2 ? e.push("built/layers.json.eyes: expected two eye curves") : T.eyes.forEach((b, h) => {
      const f = `built/layers.json.eyes[${h}]`;
      if (!Ve(b)) {
        e.push(`${f}: expected an object`);
        return;
      }
      we([b.x0, b.x1], 2) && b.x0 < b.x1 || e.push(`${f}: expected finite x0 < x1`);
      for (const c of ["top", "bot"])
        we(b[c], 24) || e.push(`${f}.${c}: expected 24 finite numbers`);
      if (we(b.top, 24) && we(b.bot, 24) && b.top.some((c, n) => c > b.bot[n]) && e.push(`${f}.top: must not exceed bottom curve`), A) for (const c of ["x0", "x1", "top", "bot"]) {
        const n = b[c], o = A.eyes[h][c];
        (Array.isArray(o) ? we(n, o.length) && n.every((O, u) => O === o[u]) : n === o) || e.push(`${f}.${c}: must match rig.json.eyes[${h}].${c}`);
      }
    });
  }
  const l = t("built/sprites/sprites.json", !1);
  return l && r(l, "built/sprites/sprites.json") && (p(l, "built/sprites/sprites.json"), s(l.layers, "built/sprites/sprites.json", "built/sprites", A ? [A.image.width, A.image.height] : void 0)), e;
}
var le = Uint8Array, Me = Uint16Array, ka = Int32Array, Ft = new le([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), _t = new le([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), Fa = new le([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), Bt = function(a, e) {
  for (var t = new Me(31), r = 0; r < 31; ++r)
    t[r] = e += 1 << a[r - 1];
  for (var i = new ka(t[30]), r = 1; r < 30; ++r)
    for (var s = t[r]; s < t[r + 1]; ++s)
      i[s] = s - t[r] << 5 | r;
  return { b: t, r: i };
}, Yt = Bt(Ft, 2), Ut = Yt.b, _a = Yt.r;
Ut[28] = 258, _a[258] = 28;
var Ba = Bt(_t, 0), Ya = Ba.b, et = new Me(32768);
for (var te = 0; te < 32768; ++te) {
  var ve = (te & 43690) >> 1 | (te & 21845) << 1;
  ve = (ve & 52428) >> 2 | (ve & 13107) << 2, ve = (ve & 61680) >> 4 | (ve & 3855) << 4, et[te] = ((ve & 65280) >> 8 | (ve & 255) << 8) >> 1;
}
var Fe = (function(a, e, t) {
  for (var r = a.length, i = 0, s = new Me(e); i < r; ++i)
    a[i] && ++s[a[i] - 1];
  var p = new Me(e);
  for (i = 1; i < e; ++i)
    p[i] = p[i - 1] + s[i - 1] << 1;
  var w;
  if (t) {
    w = new Me(1 << e);
    var E = 15 - e;
    for (i = 0; i < r; ++i)
      if (a[i])
        for (var A = i << 4 | a[i], T = e - a[i], l = p[a[i] - 1]++ << T, x = l | (1 << T) - 1; l <= x; ++l)
          w[et[l] >> E] = A;
  } else
    for (w = new Me(r), i = 0; i < r; ++i)
      a[i] && (w[i] = et[p[a[i] - 1]++] >> 15 - a[i]);
  return w;
}), _e = new le(288);
for (var te = 0; te < 144; ++te)
  _e[te] = 8;
for (var te = 144; te < 256; ++te)
  _e[te] = 9;
for (var te = 256; te < 280; ++te)
  _e[te] = 7;
for (var te = 280; te < 288; ++te)
  _e[te] = 8;
var Pt = new le(32);
for (var te = 0; te < 32; ++te)
  Pt[te] = 5;
var Ua = /* @__PURE__ */ Fe(_e, 9, 1), Pa = /* @__PURE__ */ Fe(Pt, 5, 1), qe = function(a) {
  for (var e = a[0], t = 1; t < a.length; ++t)
    a[t] > e && (e = a[t]);
  return e;
}, ce = function(a, e, t) {
  var r = e / 8 | 0;
  return (a[r] | a[r + 1] << 8) >> (e & 7) & t;
}, Je = function(a, e) {
  var t = e / 8 | 0;
  return (a[t] | a[t + 1] << 8 | a[t + 2] << 16) >> (e & 7);
}, Xa = function(a) {
  return (a + 7) / 8 | 0;
}, st = function(a, e, t) {
  return (e == null || e < 0) && (e = 0), (t == null || t > a.length) && (t = a.length), new le(a.subarray(e, t));
}, ja = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], oe = function(a, e, t) {
  var r = new Error(e || ja[a]);
  if (r.code = a, Error.captureStackTrace && Error.captureStackTrace(r, oe), !t)
    throw r;
  return r;
}, Ca = function(a, e, t, r) {
  var i = a.length, s = r ? r.length : 0;
  if (!i || e.f && !e.l)
    return t || new le(0);
  var p = !t, w = p || e.i != 2, E = e.i;
  p && (t = new le(i * 3));
  var A = function(R) {
    var d = t.length;
    if (R > d) {
      var M = new le(Math.max(d * 2, R));
      M.set(t), t = M;
    }
  }, T = e.f || 0, l = e.p || 0, x = e.b || 0, F = e.l, b = e.d, h = e.m, f = e.n, c = i * 8;
  do {
    if (!F) {
      T = ce(a, l, 1);
      var n = ce(a, l + 1, 3);
      if (l += 3, n)
        if (n == 1)
          F = Ua, b = Pa, h = 9, f = 5;
        else if (n == 2) {
          var o = ce(a, l, 31) + 257, O = ce(a, l + 10, 15) + 4, u = o + ce(a, l + 5, 31) + 1;
          l += 14;
          for (var y = new le(u), Y = new le(19), U = 0; U < O; ++U)
            Y[Fa[U]] = ce(a, l + U * 3, 7);
          l += O * 3;
          for (var z = qe(Y), _ = (1 << z) - 1, P = Fe(Y, z, 1), U = 0; U < u; ) {
            var S = P[ce(a, l, _)];
            l += S & 15;
            var X = S >> 4;
            if (X < 16)
              y[U++] = X;
            else {
              var N = 0, J = 0;
              for (X == 16 ? (J = 3 + ce(a, l, 3), l += 2, N = y[U - 1]) : X == 17 ? (J = 3 + ce(a, l, 7), l += 3) : X == 18 && (J = 11 + ce(a, l, 127), l += 7); J--; )
                y[U++] = N;
            }
          }
          var j = y.subarray(0, o), H = y.subarray(o);
          h = qe(j), f = qe(H), F = Fe(j, h, 1), b = Fe(H, f, 1);
        } else
          oe(1);
      else {
        var X = Xa(l) + 4, W = a[X - 4] | a[X - 3] << 8, k = X + W;
        if (k > i) {
          E && oe(0);
          break;
        }
        w && A(x + W), t.set(a.subarray(X, k), x), e.b = x += W, e.p = l = k * 8, e.f = T;
        continue;
      }
      if (l > c) {
        E && oe(0);
        break;
      }
    }
    w && A(x + 131072);
    for (var $ = (1 << h) - 1, D = (1 << f) - 1, V = l; ; V = l) {
      var N = F[Je(a, l) & $], K = N >> 4;
      if (l += N & 15, l > c) {
        E && oe(0);
        break;
      }
      if (N || oe(2), K < 256)
        t[x++] = K;
      else if (K == 256) {
        V = l, F = null;
        break;
      } else {
        var q = K - 254;
        if (K > 264) {
          var U = K - 257, m = Ft[U];
          q = ce(a, l, (1 << m) - 1) + Ut[U], l += m;
        }
        var g = b[Je(a, l) & D], v = g >> 4;
        g || oe(3), l += g & 15;
        var H = Ya[v];
        if (v > 3) {
          var m = _t[v];
          H += Je(a, l) & (1 << m) - 1, l += m;
        }
        if (l > c) {
          E && oe(0);
          break;
        }
        w && A(x + 131072);
        var L = x + q;
        if (x < H) {
          var B = s - H, C = Math.min(H, L);
          for (B + x < 0 && oe(3); x < C; ++x)
            t[x] = r[B + x];
        }
        for (; x < L; ++x)
          t[x] = t[x - H];
      }
    }
    e.l = F, e.p = V, e.b = x, e.f = T, F && (T = 1, e.m = h, e.d = b, e.n = f);
  } while (!T);
  return x != t.length && p ? st(t, 0, x) : t.subarray(0, x);
}, $a = /* @__PURE__ */ new le(0), ge = function(a, e) {
  return a[e] | a[e + 1] << 8;
}, he = function(a, e) {
  return (a[e] | a[e + 1] << 8 | a[e + 2] << 16 | a[e + 3] << 24) >>> 0;
}, Ke = function(a, e) {
  return he(a, e) + he(a, e + 4) * 4294967296;
};
function za(a, e) {
  return Ca(a, { i: 2 }, e && e.out, e && e.dictionary);
}
var tt = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), Na = 0;
try {
  tt.decode($a, { stream: !0 }), Na = 1;
} catch {
}
var Ia = function(a) {
  for (var e = "", t = 0; ; ) {
    var r = a[t++], i = (r > 127) + (r > 223) + (r > 239);
    if (t + i > a.length)
      return { s: e, r: st(a, t - 1) };
    i ? i == 3 ? (r = ((r & 15) << 18 | (a[t++] & 63) << 12 | (a[t++] & 63) << 6 | a[t++] & 63) - 65536, e += String.fromCharCode(55296 | r >> 10, 56320 | r & 1023)) : i & 1 ? e += String.fromCharCode((r & 31) << 6 | a[t++] & 63) : e += String.fromCharCode((r & 15) << 12 | (a[t++] & 63) << 6 | a[t++] & 63) : e += String.fromCharCode(r);
  }
};
function Da(a, e) {
  if (e) {
    for (var t = "", r = 0; r < a.length; r += 16384)
      t += String.fromCharCode.apply(null, a.subarray(r, r + 16384));
    return t;
  } else {
    if (tt)
      return tt.decode(a);
    var i = Ia(a), s = i.s, t = i.r;
    return t.length && oe(8), s;
  }
}
var Za = function(a, e) {
  return e + 30 + ge(a, e + 26) + ge(a, e + 28);
}, Wa = function(a, e, t) {
  var r = ge(a, e + 28), i = ge(a, e + 30), s = Da(a.subarray(e + 46, e + 46 + r), !(ge(a, e + 8) & 2048)), p = e + 46 + r, w = Ha(a, p, i, t, he(a, e + 20), he(a, e + 24), he(a, e + 42)), E = w[0], A = w[1], T = w[2];
  return [ge(a, e + 10), E, A, s, p + i + ge(a, e + 32), T];
}, Ha = function(a, e, t, r, i, s, p) {
  var w = i == 4294967295, E = s == 4294967295, A = p == 4294967295, T = e + t, l = w + E + A;
  if (r && l) {
    for (; e + 4 < T; e += 4 + ge(a, e + 2))
      if (ge(a, e) == 1)
        return [
          w ? Ke(a, e + 4 + 8 * E) : i,
          E ? Ke(a, e + 4) : s,
          A ? Ke(a, e + 4 + 8 * (E + w)) : p,
          1
        ];
    r < 2 && oe(13);
  }
  return [i, s, p, 0];
};
function Va(a, e) {
  for (var t = {}, r = a.length - 22; he(a, r) != 101010256; --r)
    (!r || a.length - r > 65558) && oe(13);
  var i = ge(a, r + 8);
  if (!i)
    return {};
  var s = he(a, r + 16), p = he(a, r - 20) == 117853008;
  if (p) {
    var w = he(a, r - 12);
    p = he(a, w) == 101075792, p && (i = he(a, w + 32), s = he(a, w + 48));
  }
  for (var E = e && e.filter, A = 0; A < i; ++A) {
    var T = Wa(a, s, p), l = T[0], x = T[1], F = T[2], b = T[3], h = T[4], f = T[5], c = Za(a, f);
    s = h, (!E || E({
      name: b,
      size: x,
      originalSize: F,
      compression: l
    })) && (l ? l == 8 ? t[b] = za(a.subarray(c, c + x), { out: new le(F) }) : oe(14, "unknown compression type " + l) : t[b] = st(a, c, c + x));
  }
  return t;
}
const Mt = 200, Et = 64 * 1024 * 1024, St = new TextDecoder("utf-8", { fatal: !0 });
function Xt(a) {
  if (!a || a.startsWith("/") || /^[A-Za-z]:/.test(a) || a.includes("\\") || a.includes("\0") || a.split("/").includes(".."))
    throw new Error(`ZIP entry ${JSON.stringify(a)}: path must be relative, without .. or backslashes`);
}
function Ga(a) {
  const e = new DataView(a.buffer, a.byteOffset, a.byteLength), t = (x = "(archive)") => {
    throw new Error(`ZIP entry ${JSON.stringify(x)}: invalid or truncated ZIP`);
  }, r = (x) => x >= 0 && x + 2 <= a.length ? e.getUint16(x, !0) : t(), i = (x) => x >= 0 && x + 4 <= a.length ? e.getUint32(x, !0) : t();
  let s = a.length - 22;
  for (; s >= Math.max(0, a.length - 65557) && !(i(s) === 101010256 && s + 22 + r(s + 20) === a.length); s--)
    ;
  (s < 0 || s < a.length - 65557) && t(), (r(s + 4) || r(s + 6) || r(s + 8) !== r(s + 10)) && t();
  const p = r(s + 10), w = i(s + 16), E = w + i(s + 12);
  E !== s && t();
  const A = [], T = /* @__PURE__ */ new Set();
  let l = w;
  for (let x = 0; x < p; x++) {
    (l + 46 > E || i(l) !== 33639248) && t();
    const F = r(l + 28), b = l + 46 + F + r(l + 30) + r(l + 32);
    b > E && t();
    let h;
    try {
      h = St.decode(a.subarray(l + 46, l + 46 + F));
    } catch {
      throw new Error("ZIP entry (invalid UTF-8 name): invalid filename");
    }
    if (Xt(h), x >= Mt) throw new Error(`ZIP entry ${JSON.stringify(h)}: more than ${Mt} entries`);
    if (T.has(h)) throw new Error(`ZIP entry ${JSON.stringify(h)}: duplicate entry`);
    T.add(h);
    const f = i(l + 24), c = i(l + 20), n = i(l + 42);
    if (f > Et || c > Et) throw new Error(`ZIP entry ${JSON.stringify(h)}: exceeds 64 MB`);
    if (r(l + 10) !== 0) throw new Error(`ZIP entry ${JSON.stringify(h)}: expected stored compression (method 0)`);
    if (r(l + 8) & 1) throw new Error(`ZIP entry ${JSON.stringify(h)}: encrypted entries are not supported`);
    (c !== f || n + 30 > w || i(n) !== 67324752) && t(h);
    const o = n + 30 + r(n + 26) + r(n + 28);
    (o + f > w || r(n + 8) !== 0 || r(n + 6) !== r(l + 8)) && t(h);
    let O;
    try {
      O = St.decode(a.subarray(n + 30, n + 30 + r(n + 26)));
    } catch {
      t(h);
    }
    O !== h && t(h), A.push({ name: h, offset: n, start: o, size: f, central: l }), l = b;
  }
  return l !== E && t(), { files: A };
}
function qa(a) {
  const e = a instanceof Uint8Array ? a : new Uint8Array(a), t = Ga(e), r = Va(e, { filter: (s) => s.name !== "__proto__" }), i = /* @__PURE__ */ Object.create(null);
  for (const s of t.files) {
    const p = s.name === "__proto__" ? e.slice(s.start, s.start + s.size) : r[s.name];
    if (!(p instanceof Uint8Array) || p.length !== s.size) throw new Error(`ZIP entry ${JSON.stringify(s.name)}: invalid size`);
    i[s.name] = p;
  }
  return i;
}
const Ja = (a) => JSON.parse(new TextDecoder("utf-8", { fatal: !0 }).decode(a));
function ke(a, e) {
  try {
    return Ja(a);
  } catch {
    throw new Error(`${e}: invalid UTF-8 JSON`);
  }
}
function jt(a, e) {
  return [
    "layers.json",
    "base.png",
    "hairmask.png",
    ...Object.keys(a?.layers ?? {}).map((t) => `${t}.png`),
    ...e ? ["sprites/sprites.json", ...Object.keys(e.layers ?? {}).map((t) => `sprites/${t}.png`)] : []
  ];
}
function Ct(a) {
  const e = La(a);
  if (e.length) throw new Error(e.join(`
`));
}
function $t(a) {
  return !!a && typeof a == "object" && "manifest" in a && "rig" in a && "assets" in a && "release" in a;
}
function Qe(a) {
  const e = qa(a);
  if (!Object.hasOwn(e, "avatar.json")) throw new Error("avatar.json: missing file in .mavatar archive");
  Ct(e);
  const t = Ne(ke(e["avatar.json"], "avatar.json")), r = at(ke(e["rig.json"], "rig.json")), i = jt(
    ke(e["built/layers.json"], "built/layers.json"),
    e["built/sprites/sprites.json"] ? ke(e["built/sprites/sprites.json"], "built/sprites/sprites.json") : void 0
  ), s = {}, p = [], w = () => {
    p.splice(0).forEach((E) => URL.revokeObjectURL(E));
  };
  try {
    for (const E of new Set(i)) {
      const A = URL.createObjectURL(new Blob([new Uint8Array(e[`built/${E}`])], { type: E.endsWith(".json") ? "application/json" : "image/png" }));
      p.push(A), s[E] = A;
    }
  } catch (E) {
    throw w(), E;
  }
  return { manifest: t, rig: r, assets: s, release: w };
}
async function Ka(a, e = {}) {
  if ($t(a)) return a;
  if (a instanceof Blob) return Qe(await a.arrayBuffer());
  if (a instanceof ArrayBuffer || a instanceof Uint8Array) return Qe(a);
  const t = new URL(a, typeof location > "u" ? void 0 : location.href);
  if (/\.mavatar$/i.test(t.pathname)) {
    const h = await fetch(t);
    if (!h.ok) throw new Error(`.mavatar: could not load (${h.status})`);
    return Qe(await h.arrayBuffer());
  }
  t.pathname.endsWith("/") || (t.pathname += "/");
  const r = (h) => {
    const f = new URL(t);
    return f.pathname += h.split("/").map(encodeURIComponent).join("/"), e.version !== void 0 && f.searchParams.set("v", String(e.version)), f.href;
  }, i = {};
  async function s(h, f = !1) {
    const c = await fetch(r(h));
    if (f && (c.status === 404 || c.ok && c.headers.get("content-type")?.includes("text/html"))) return;
    if (!c.ok) throw new Error(`${h}: could not load (${c.status})`);
    const n = new Uint8Array(await c.arrayBuffer());
    return i[h] = n, ke(n, h);
  }
  const p = e.rigFile ?? "rig.json";
  Xt(p);
  const [w, E, A, T] = await Promise.all([
    s(p),
    s("built/layers.json"),
    s("avatar.json", !0),
    s("built/sprites/sprites.json", !0)
  ]);
  Array.isArray(w?.eyes) && Array.isArray(E?.eyes) && (w.eyes = w.eyes.map((h, f) => {
    if (!h || typeof h != "object") return h;
    const c = { ...h };
    for (const n of ["x0", "x1", "top", "bot"]) c[n] === void 0 && (c[n] = E.eyes[f]?.[n]);
    return c;
  })), i["rig.json"] = new TextEncoder().encode(JSON.stringify(w));
  const l = jt(E, T);
  for (const h of l) h.endsWith(".png") && (i[`built/${h}`] = { size: 1 });
  Ct(i);
  const x = at(w), F = Object.fromEntries(l.map((h) => [h, r(`built/${h}`)])), b = decodeURIComponent(t.pathname.split("/").filter(Boolean).at(-1) ?? "Avatar");
  return { manifest: A === void 0 ? Oa(b) : Ne(A), rig: x, assets: F, release() {
  } };
}
async function Qa(a, e, t = {}) {
  const r = !$t(e), i = await Ka(e);
  try {
    const s = await Ra(a, { ...t, rig: i.rig, assets: i.assets }), p = s.destroy.bind(s);
    let w = !1;
    return Object.assign(s, { package: i, destroy() {
      if (!w) {
        w = !0;
        try {
          p();
        } finally {
          r && i.release();
        }
      }
    } });
  } catch (s) {
    throw r && i.release(), s;
  }
}
const er = "https://shinshin86.github.io/mesh-avatar-studio/miko.mavatar", tr = ["happy", "sad", "angry", "surprised", "relaxed", "neutral"];
function ar(a) {
  return a === null || a === "" ? "neutral" : Ta.includes(a) ? a : void 0;
}
function rr(a) {
  return a === null || a === "" ? null : tr.includes(a) ? a : void 0;
}
function Tt(a) {
  return a === null || a === "" ? "contain" : a === "contain" || a === "cover" ? a : void 0;
}
function nr(a, e) {
  return Math.min(0.05, Math.max(1e-3, (a - e) / 1e3));
}
class ir {
  promise;
  #a;
  #e;
  #t = !0;
  /** Call when a load starts. */
  start() {
    this.#t && (this.#t = !1, this.promise = new Promise((e, t) => {
      this.#a = e, this.#e = t;
    }), this.promise.catch(() => {
    }));
  }
  resolve(e) {
    this.#t || (this.#t = !0, this.#a(e));
  }
  reject(e) {
    this.#t || (this.#t = !0, this.#e(e));
  }
}
const sr = `
:host { display: block; position: relative; aspect-ratio: 1 / 1; }
:host([hidden]) { display: none; }
canvas { display: block; width: 100%; height: 100%; }
`, or = typeof HTMLElement > "u" ? class {
} : HTMLElement;
class lr extends or {
  static observedAttributes = ["src", "fit", "expression", "emotion", "paused", "no-idle", "label"];
  #a;
  #e = null;
  #t = new ir();
  #o = 0;
  #n = !1;
  #i = null;
  #h;
  #s = 0;
  #u = 0;
  #p = !0;
  #c = null;
  #f = null;
  #g = /* @__PURE__ */ new Set();
  constructor() {
    super();
    const e = this.attachShadow({ mode: "open" }), t = document.createElement("style");
    t.textContent = sr, this.#a = document.createElement("canvas"), this.#a.setAttribute("role", "img"), this.#a.setAttribute("aria-label", "Avatar"), e.append(t, this.#a), this.#t.start(), this.#a.addEventListener("webglcontextlost", (r) => {
      r.preventDefault(), this.#l();
    }), this.#a.addEventListener("webglcontextrestored", () => this.#m());
  }
  /** The loaded runtime avatar, or null while loading. Every `mesh-avatar` method is available on it. */
  get avatar() {
    return this.#e;
  }
  /** Resolves with the avatar once the current source has loaded. */
  get ready() {
    return this.#t.promise;
  }
  /** Loads a file, archive or URL without changing `src`. A changed `src` replaces this source. */
  load(e) {
    return this.#i = null, this.#h = e, this.#m(), this.ready;
  }
  get src() {
    return this.getAttribute("src") ?? "";
  }
  set src(e) {
    this.setAttribute("src", e);
  }
  get fit() {
    return Tt(this.getAttribute("fit")) ?? "contain";
  }
  set fit(e) {
    this.setAttribute("fit", e);
  }
  get expression() {
    return this.getAttribute("expression") ?? "neutral";
  }
  set expression(e) {
    this.setAttribute("expression", e);
  }
  get emotion() {
    return this.getAttribute("emotion");
  }
  set emotion(e) {
    e === null ? this.removeAttribute("emotion") : this.setAttribute("emotion", e);
  }
  get paused() {
    return this.hasAttribute("paused");
  }
  set paused(e) {
    this.toggleAttribute("paused", e);
  }
  /** Mouth opening from the voice loudness, 0 to 1. Kept until the avatar loads. */
  setVoiceLevel(e) {
    this.#f = e, this.#e?.setVoiceLevel(e);
  }
  /** Moves the mouth to Japanese text without audio. Waits for the avatar to load. */
  async speak(e, t) {
    (await this.ready).speakKana(e, t);
  }
  /** Plays a motion by id (see `avatar.motions`). Waits for the avatar to load. */
  async play(e) {
    (await this.ready).play(e);
  }
  connectedCallback() {
    this.#c ??= new IntersectionObserver((e) => {
      this.#p = e.at(-1)?.isIntersecting ?? !0, this.#r();
    }), this.#c.observe(this), document.addEventListener("visibilitychange", this.#r), !this.#e && !this.#n ? this.#b() : this.#r();
  }
  disconnectedCallback() {
    this.#c?.disconnect(), document.removeEventListener("visibilitychange", this.#r), this.#l(), queueMicrotask(() => {
      this.isConnected || this.#v();
    });
  }
  attributeChangedCallback(e, t, r) {
    t !== r && (e === "src" || e === "fit" ? (e === "src" && (this.#h = void 0), e === "fit" && Tt(r) === void 0 && this.#d(e, r), this.isConnected && this.#b()) : e === "label" ? this.#a.setAttribute("aria-label", r || "Avatar") : e === "paused" ? this.#r() : this.#e && this.#y(this.#e, e));
  }
  #y(e, t) {
    if (t === "expression") {
      const r = ar(this.getAttribute("expression"));
      r ? e.setExpression(r) : this.#d(t, this.getAttribute(t));
    } else if (t === "emotion") {
      const r = rr(this.getAttribute("emotion"));
      r !== void 0 ? e.setEmotion(r) : this.#d(t, this.getAttribute(t));
    } else t === "no-idle" && e.setAutoIdle(!this.hasAttribute("no-idle"));
  }
  #b() {
    if (this.#t.start(), this.#i) return;
    const e = this.#i = {};
    queueMicrotask(() => {
      this.#i === e && (this.#i = null, this.isConnected && this.#m());
    });
  }
  async #m(e = this.#h ?? (this.getAttribute("src") || er)) {
    const t = ++this.#o;
    this.#v(!1), this.#n = !0, this.#t.start();
    try {
      const r = await Qa(this.#a, e, { manual: !0, fit: this.fit });
      if (t !== this.#o) {
        r.destroy();
        return;
      }
      this.#n = !1, this.#e = r;
      for (const i of ["expression", "emotion", "no-idle"])
        (i !== "emotion" || this.hasAttribute(i)) && this.#y(r, i);
      this.#f !== null && r.setVoiceLevel(this.#f), matchMedia("(prefers-reduced-motion: reduce)").matches && r.setSwayGain(0.5), r.onMotion((i) => this.dispatchEvent(new CustomEvent("motion", { detail: { id: i } }))), r.advance(0), this.#t.resolve(r), this.dispatchEvent(new CustomEvent("load", { detail: { avatar: r } })), this.#r();
    } catch (r) {
      if (t !== this.#o) return;
      this.#n = !1, this.#t.reject(r), this.dispatchEvent(new CustomEvent("error", { detail: { error: r } }));
    }
  }
  /** Destroys the avatar. Without `cancel = false` it also abandons a load in progress. */
  #v(e = !0) {
    e && (this.#o++, this.#n = !1), this.#l(), this.#e?.destroy(), this.#e = null;
  }
  #r = () => {
    const e = this.#e && this.isConnected && this.#p && !document.hidden && !this.paused;
    e && !this.#s ? (this.#u = performance.now(), this.#s = requestAnimationFrame(this.#x)) : e || this.#l();
  };
  #x = (e) => {
    const t = nr(e, this.#u);
    this.#u = e, this.#e?.advance(t, 1 / t), this.#s = requestAnimationFrame(this.#x);
  };
  #l() {
    cancelAnimationFrame(this.#s), this.#s = 0;
  }
  #d(e, t) {
    const r = `${e}=${t}`;
    this.#g.has(r) || (this.#g.add(r), console.warn(`<mesh-avatar> ignores ${e}="${t}".`));
  }
}
typeof customElements < "u" && !customElements.get("mesh-avatar") && customElements.define("mesh-avatar", lr);
export {
  er as DEFAULT_SRC,
  tr as EMOTIONS,
  lr as MeshAvatarElement
};
