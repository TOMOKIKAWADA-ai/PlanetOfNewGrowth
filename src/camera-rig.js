import * as THREE from 'three';
import { Config } from './config.js';
import { lerp, smooth01 } from './math.js';

export class CameraRig {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.mode = 'human';
    this.from = { ...Config.camera.human };
    this.to = { ...Config.camera.human };
    this.current = { ...Config.camera.human };
    this.timer = Config.camera.transitionSeconds;
    this.shakeOffset = new THREE.Vector3();
  }

  startTransition(mode) {
    this.mode = mode;
    this.from = { ...this.current };
    this.to = { ...(Config.camera[mode] ?? Config.camera.human) };
    this.timer = 0;
  }

  update(dt, shake = 0) {
    this.timer = Math.min(Config.camera.transitionSeconds, this.timer + dt);
    const t = smooth01(this.timer / Config.camera.transitionSeconds);
    this.current.height = lerp(this.from.height, this.to.height, t);
    this.current.distance = lerp(this.from.distance, this.to.distance, t);
    this.current.fov = lerp(this.from.fov, this.to.fov, t);
    this.current.pitch = lerp(this.from.pitch, this.to.pitch, t);
    const portraitScale = this.camera.aspect < 0.85
      ? Math.min(1.6, 0.85 / this.camera.aspect)
      : 1;
    const targetFov = Math.min(80, this.current.fov * portraitScale);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 8);
    this.camera.updateProjectionMatrix();

    const target = this.player.position;
    const focusY = target.y + Config.visuals.playerModelHeight * 0.48;
    const distance = this.current.distance;
    const z = Math.cos(this.current.pitch) * distance;
    const y = Math.sin(this.current.pitch) * distance + this.current.height;
    this.camera.position.set(target.x, focusY + y, target.z + z);
    if (shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * shake;
    }
    this.camera.lookAt(target.x, focusY, target.z);
  }
}
