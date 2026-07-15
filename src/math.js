import * as THREE from 'three';

export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smooth01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

export function horizontalDistanceSq(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function horizontalLength(x, z) {
  return Math.hypot(x, z);
}

export function normalizeXZ(target, x, z) {
  const length = Math.hypot(x, z);
  if (length <= 0.0001) {
    target.set(0, 0, 0);
    return target;
  }
  target.set(x / length, 0, z / length);
  return target;
}

export function randomPointInCircle(radius, minRadius = 0) {
  const angle = Math.random() * TAU;
  const r = Math.sqrt(randRange(minRadius * minRadius, radius * radius));
  return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
}

export function clampToCircle(position, radius) {
  const length = Math.hypot(position.x, position.z);
  if (length > radius) {
    const scale = radius / length;
    position.x *= scale;
    position.z *= scale;
  }
  return position;
}

export function angleToXZ(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function signedAngleDifference(a, b) {
  let diff = (a - b + Math.PI) % TAU - Math.PI;
  if (diff < -Math.PI) diff += TAU;
  return diff;
}

export function disposeObject3D(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose?.());
      } else {
        child.material.dispose?.();
      }
    }
  });
}
