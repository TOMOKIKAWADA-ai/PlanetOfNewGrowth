// 縛り蔓（Config.enemy.vine）の見た目: 敵本体、足元の予兆の輪、地面から伸びるツタ、プレイヤーに巻き付くツタ。
// 細い木のツタに、淡い色のトゲと小さな葉を付ける。形はすべてプログラムで作る（生成モデルはまだない）。
// 章ごとの強さ（vineStatsForChapter）もここで組み立てる。
import * as THREE from 'three';
import { Config } from './config.js';
import { TAU, clamp } from './math.js';

// その章の縛り蔓の強さ: 共通の値に、章ごとの値（Config.enemy.vine.chapters）を重ねたもの。
export function vineStatsForChapter(chapter) {
  const { chapters, ...base } = Config.enemy.vine;
  const index = clamp(Math.round(chapter) || 1, 1, chapters.length) - 1;
  return { ...base, ...chapters[index] };
}

// 試合の中で同時に出せる数。introAt で 1 体、fullAt で maxAlive まで増える。
export function vineAliveCap(stats, elapsed) {
  const progress = clamp((elapsed - stats.introAt) / Math.max(1, stats.fullAt - stats.introAt), 0, 1);
  return Math.max(1, Math.round(1 + (stats.maxAlive - 1) * progress));
}

const VINE_COLORS = {
  bark: 0x9c7743,
  barkDark: 0x6b4d2a,
  thorn: 0xeedcab,
  leaf: 0x5f9e3c,
  bud: 0x7f9a3c,
  warning: 0x9fe36a
};

const VINE_MATERIALS = {
  bark: new THREE.MeshStandardMaterial({ color: VINE_COLORS.bark, roughness: 0.82 }),
  barkDark: new THREE.MeshStandardMaterial({ color: VINE_COLORS.barkDark, roughness: 0.9 }),
  thorn: new THREE.MeshStandardMaterial({ color: VINE_COLORS.thorn, roughness: 0.6 }),
  leaf: new THREE.MeshStandardMaterial({ color: VINE_COLORS.leaf, roughness: 0.7, side: THREE.DoubleSide }),
  bud: new THREE.MeshStandardMaterial({ color: VINE_COLORS.bud, roughness: 0.75, emissive: 0x2c4a10, emissiveIntensity: 0 })
};

// トゲは根元が原点、葉は付け根が原点。向きは付ける場所で決める。
const THORN_GEOMETRY = new THREE.ConeGeometry(0.045, 0.17, 5).translate(0, 0.085, 0);
const LEAF_GEOMETRY = new THREE.SphereGeometry(1, 8, 5).scale(0.17, 0.022, 0.08).translate(0.17, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();

// TubeGeometry は太さが一定なので、輪ごとに中心へ寄せて先を細くする。
function taperedTube(curve, segments, radius, tipScale = 0.3, radial = 6) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const position = geometry.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, center);
    const scale = 1 - (1 - tipScale) * t * t;
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(scale).add(center);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

// 曲線に沿ってトゲと葉を並べる。userData.t は伸びる演出で表示を切り替える位置。
function decorate(group, curve, { radius, thornStep = 0.11, leafStep = 0.3, start = 0.08, seed = 0 }) {
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  let index = 0;
  for (let t = start; t < 0.96; t += thornStep, index++) {
    curve.getPointAt(t, tempVec);
    curve.getTangentAt(t, tangent);
    side.crossVectors(tangent, Math.abs(tangent.y) > 0.9 ? tempVec2.set(1, 0, 0) : UP).normalize();
    side.applyAxisAngle(tangent, seed + index * 2.3);
    const thorn = new THREE.Mesh(THORN_GEOMETRY, VINE_MATERIALS.thorn);
    thorn.position.copy(tempVec).addScaledVector(side, radius * (1 - 0.6 * t * t) * 0.8);
    thorn.quaternion.setFromUnitVectors(UP, side);
    thorn.scale.setScalar(1 - 0.45 * t);
    thorn.userData.t = t;
    group.add(thorn);
  }
  for (let t = start + leafStep * 0.5; t < 0.92; t += leafStep, index++) {
    curve.getPointAt(t, tempVec);
    curve.getTangentAt(t, tangent);
    side.crossVectors(tangent, Math.abs(tangent.y) > 0.9 ? tempVec2.set(1, 0, 0) : UP).normalize();
    side.applyAxisAngle(tangent, seed + index * 1.7);
    const leaf = new THREE.Mesh(LEAF_GEOMETRY, VINE_MATERIALS.leaf);
    leaf.position.copy(tempVec);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), side);
    leaf.rotateX(seed + index);
    leaf.userData.t = t;
    group.add(leaf);
  }
}

// 上へ伸びて、先が渦を巻くツタの曲線。base は根元、out は外向きの水平方向、height は渦の中心の高さ。
function curlingCurve(base, out, height, reach, curlRadius, turns = 1.2) {
  const points = [
    base.clone(),
    base.clone().addScaledVector(out, reach * 0.35).setY(base.y + height * 0.35),
    base.clone().addScaledVector(out, reach * 0.55).setY(base.y + height * 0.72)
  ];
  const center = base.clone().addScaledVector(out, reach * 0.3).setY(base.y + height);
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const angle = -0.2 + s * turns * TAU;
    const r = curlRadius * (1 - s * 0.75);
    points.push(center.clone().addScaledVector(out, Math.cos(angle) * r).setY(center.y + Math.sin(angle) * r));
  }
  return new THREE.CatmullRomCurve3(points);
}

let enemyTemplate = null;

function buildEnemyTemplate() {
  const root = new THREE.Group();
  root.name = 'VineEnemyModel';
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 8), VINE_MATERIALS.barkDark);
  mound.scale.set(1, 0.4, 1);
  mound.position.y = 0.06;
  root.add(mound);

  // 地面を這う根
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TAU + 0.3;
    const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, 0).addScaledVector(out, 0.3),
      new THREE.Vector3(0, 0.07, 0).addScaledVector(out, 0.75).add(new THREE.Vector3(out.z * 0.15, 0, -out.x * 0.15)),
      new THREE.Vector3(0, 0.03, 0).addScaledVector(out, 1.15)
    ]);
    root.add(new THREE.Mesh(taperedTube(curve, 10, 0.07, 0.25, 5), VINE_MATERIALS.barkDark));
  }

  // 揺れるツタ3本。ピボットの +Z がプレイヤーの方向（Enemy が model.rotation.y で向ける）。
  const stalks = [
    { angle: 0, height: 1.75, reach: 0.25, curl: 0.3 },
    { angle: 2.2, height: 1.3, reach: 0.4, curl: 0.24 },
    { angle: -2.1, height: 1.45, reach: 0.38, curl: 0.27 }
  ];
  stalks.forEach((spec, i) => {
    const pivot = new THREE.Group();
    pivot.name = `VineStalk${i}`;
    const out = new THREE.Vector3(Math.sin(spec.angle), 0, Math.cos(spec.angle));
    pivot.position.copy(out).multiplyScalar(0.18).setY(0.15);
    const curve = curlingCurve(new THREE.Vector3(), out, spec.height, spec.reach, spec.curl);
    pivot.add(new THREE.Mesh(taperedTube(curve, 40, 0.075, 0.3), VINE_MATERIALS.bark));
    decorate(pivot, curve, { radius: 0.075, seed: i * 1.3 });
    root.add(pivot);
  });

  // 真ん中のツタの手前に付く、閉じたつぼみ。予兆のあいだ光る。
  const head = new THREE.Group();
  head.name = 'VineHead';
  head.position.set(0, 1.12, 0.12);
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), VINE_MATERIALS.bud);
  bud.name = 'VineBud';
  bud.scale.set(1, 1.3, 1);
  head.add(bud);
  for (let i = 0; i < 4; i++) {
    const sepal = new THREE.Mesh(LEAF_GEOMETRY, VINE_MATERIALS.leaf);
    sepal.rotation.set(0, (i / 4) * TAU, -0.9);
    sepal.position.y = -0.18;
    sepal.scale.setScalar(1.1);
    head.add(sepal);
  }
  for (let i = 0; i < 5; i++) {
    const thorn = new THREE.Mesh(THORN_GEOMETRY, VINE_MATERIALS.thorn);
    thorn.position.y = 0.28;
    thorn.rotation.set(0.55, (i / 5) * TAU, 0, 'YXZ');
    head.add(thorn);
  }
  root.add(head);
  root.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  return root;
}

// 形と素材はすべての敵で共有する（破棄しない）。
export function createVineEnemyModel() {
  enemyTemplate ??= buildEnemyTemplate();
  return enemyTemplate.clone();
}

// 予兆の輪。中の円がふくらみ、外の輪が縮んで、重なったときにツタが出る。
export class VineWarning {
  constructor(scene, grabRadius) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'VineWarning';
    const make = (geometry, opacity) => {
      const material = new THREE.MeshBasicMaterial({
        color: VINE_COLORS.warning, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      return mesh;
    };
    this.fill = make(new THREE.CircleGeometry(grabRadius, 32), 0.22);
    this.edge = make(new THREE.RingGeometry(grabRadius * 0.93, grabRadius, 40), 0.85);
    this.closing = make(new THREE.RingGeometry(grabRadius * 0.9, grabRadius, 40), 0.7);
    this.group.position.y = 0.05;
    scene.add(this.group);
  }

  update(position, progress, time) {
    this.group.position.x = position.x;
    this.group.position.z = position.z;
    this.fill.scale.setScalar(0.25 + 0.75 * progress);
    this.fill.material.opacity = 0.16 + 0.14 * progress + Math.sin(time * 18) * 0.05;
    this.closing.scale.setScalar(2.2 - 1.2 * progress);
    this.closing.material.opacity = 0.35 + 0.55 * progress;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const mesh of this.group.children) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}

let eruptionGeometry = null;

// 輪の場所で地面から突き出して引っ込むツタ。外れたときも、どこに出たかが見える。
export function createVineEruption(position) {
  eruptionGeometry ??= taperedTube(
    curlingCurve(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 1.35, 0.5, 0.22, 0.9), 28, 0.07, 0.3
  );
  const group = new THREE.Group();
  group.name = 'VineEruption';
  group.position.set(position.x, 0, position.z);
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + Math.random() * 0.4;
    const tendril = new THREE.Mesh(eruptionGeometry, VINE_MATERIALS.bark);
    tendril.position.set(Math.sin(angle) * 1.05, -0.05, Math.cos(angle) * 1.05);
    tendril.rotation.y = angle;
    tendril.userData.delay = Math.random() * 0.08;
    group.add(tendril);
  }
  return group;
}

export function updateVineEruption(group, age, duration) {
  for (const tendril of group.children) {
    const t = clamp((age - tendril.userData.delay) / duration, 0, 1);
    const grow = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    tendril.scale.set(1, Math.max(0.001, Math.sin(grow * Math.PI * 0.5)), 1);
  }
}

// 捕まったプレイヤーに巻き付くツタ。プレイヤーの足元を原点に作り、敵の根元から地面を這う一本でつなぐ。
// 形はこの拘束だけのものなので、外したときに破棄する（トゲ・葉の形と素材は共有なので残す）。
export class VineBindVisual {
  constructor(scene, playerPosition, sourcePosition, { bodyHeight = 1.5, bodyRadius = 0.42 } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'VineBind';
    this.group.position.set(playerPosition.x, 0, playerPosition.z);
    this.wrap = new THREE.Group();
    this.group.add(this.wrap);
    this.parts = [];
    this.age = 0;
    this.jolt = 0;
    this.loosen = 0;
    this.holding = false; // 捕まったまま倒れた（外さずに残す）

    // 体に巻き付く2本のらせん
    for (let k = 0; k < 2; k++) {
      const points = [];
      const turns = 2.3;
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const angle = k * Math.PI + s * turns * TAU * (k ? -1 : 1);
        const radius = bodyRadius * (1.05 - 0.15 * Math.sin(s * Math.PI)) + k * 0.04;
        points.push(new THREE.Vector3(Math.sin(angle) * radius, 0.12 + s * bodyHeight * (0.82 - k * 0.12), Math.cos(angle) * radius));
      }
      this.addVine(this.wrap, new THREE.CatmullRomCurve3(points), 0.055, 0.18 + k * 0.1, k * 2.1);
    }

    // 足元から伸びて、肩の上で渦を巻く3本
    for (let k = 0; k < 3; k++) {
      const angle = (k / 3) * TAU + 0.6;
      const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const base = out.clone().multiplyScalar(bodyRadius + 0.55).setY(-0.05);
      const curve = curlingCurve(base, out.clone().negate(), bodyHeight * (0.95 + k * 0.08), 0.75, 0.24, 1.1);
      this.addVine(this.wrap, curve, 0.06, 0.05 + k * 0.12, k * 1.4 + 0.5);
    }

    // 敵の根元からの一本。地面を波打って這い、足元のらせんへつながる。
    const dx = sourcePosition.x - playerPosition.x;
    const dz = sourcePosition.z - playerPosition.z;
    const length = Math.hypot(dx, dz);
    if (length > 0.6) {
      const dir = new THREE.Vector3(dx / length, 0, dz / length);
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const points = [];
      const steps = Math.max(6, Math.ceil(length * 1.5));
      for (let i = 0; i <= steps; i++) {
        const s = i / steps;
        const along = length * (1 - s);
        const lift = s > 0.85 ? (s - 0.85) / 0.15 : 0;
        points.push(dir.clone().multiplyScalar(Math.max(bodyRadius, along))
          .addScaledVector(side, Math.sin(s * length * 1.3) * 0.22 * (1 - lift))
          .setY(0.08 + lift * 0.25));
      }
      this.addVine(this.group, new THREE.CatmullRomCurve3(points), 0.065, 0, 0.9, 0.12);
    }
    scene.add(this.group);
  }

  addVine(parent, curve, radius, delay, seed, thornStep = 0.09) {
    const segments = Math.max(24, Math.round(curve.getLength() * 22));
    const geometry = taperedTube(curve, segments, radius, 0.35);
    const mesh = new THREE.Mesh(geometry, VINE_MATERIALS.bark);
    mesh.castShadow = true;
    const holder = new THREE.Group();
    holder.add(mesh);
    decorate(holder, curve, { radius, thornStep, leafStep: 0.24, seed });
    parent.add(holder);
    this.parts.push({ holder, geometry, indexCount: geometry.index.count, delay });
  }

  // grow: 伸びきるまでの時間。loosen: 0〜1（振りほどきの進み具合でらせんが緩む）。
  update(dt, loosen, grow = 0.28) {
    this.age += dt;
    this.loosen = loosen;
    this.jolt = Math.max(0, this.jolt - dt * 5);
    for (const part of this.parts) {
      const t = clamp((this.age - part.delay) / grow, 0, 1);
      const eased = 1 - (1 - t) ** 3;
      const count = Math.floor(part.indexCount * eased / 6) * 6;
      part.geometry.setDrawRange(0, count);
      for (const child of part.holder.children) {
        if (child.userData.t !== undefined) child.visible = child.userData.t <= eased;
      }
    }
    const shake = this.jolt * 0.12;
    this.wrap.rotation.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake);
    this.wrap.scale.set(1 + loosen * 0.22 + this.jolt * 0.05, 1, 1 + loosen * 0.22 + this.jolt * 0.05);
  }

  struggle() {
    this.jolt = 1;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const part of this.parts) part.geometry.dispose();
  }
}
