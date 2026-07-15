import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Config } from './config.js';

export class AssetStore {
  constructor() {
    this.loader = new GLTFLoader();
    this.models = new Map();
    this.animations = new Map();
  }

  async loadAll(onProgress = () => {}) {
    const entries = [
      ['player', Config.assets.player],
      ['seed', Config.assets.seed],
      ['egg', Config.assets.egg],
      ['motherEgg', Config.assets.motherEgg],
      ['zombie', Config.assets.zombie],
      ['ghost', Config.assets.ghost],
      ['skeleton', Config.assets.skeleton],
      ['vampire', Config.assets.vampire],
      ...Config.assets.trees.map((url, index) => [`tree${index}`, url]),
      ...Config.assets.rocks.map((url, index) => [`rock${index}`, url]),
      ...Config.assets.grass.map((url, index) => [`grass${index}`, url])
    ];
    let loaded = 0;
    await Promise.all(entries.map(async ([key, url]) => {
      const gltf = await this.loader.loadAsync(url);
      this.models.set(key, gltf.scene);
      this.animations.set(key, gltf.animations ?? []);
      loaded += 1;
      onProgress(loaded / entries.length);
    }));
  }

  cloneModel(key) {
    const source = this.models.get(key);
    if (!source) return null;
    const object = clone(source);
    object.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();
        }
      }
    });
    return object;
  }

  getAnimations(key) {
    return this.animations.get(key) ?? [];
  }

  cloneFirstMesh(key, material = null) {
    const source = this.models.get(key);
    if (!source) return null;
    let mesh = null;
    source.traverse((child) => {
      if (!mesh && child.isMesh && child.geometry) {
        mesh = child;
      }
    });
    if (!mesh) return null;
    const cloned = new THREE.Mesh(mesh.geometry, material ?? mesh.material);
    cloned.castShadow = true;
    cloned.receiveShadow = true;
    cloned.scale.copy(mesh.scale);
    cloned.rotation.copy(mesh.rotation);
    cloned.position.copy(mesh.position);
    return cloned;
  }
}
