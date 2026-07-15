export class InputState {
  constructor(target = window) {
    this.keys = new Set();
    this.previous = new Set();
    this.mouseDown = false;
    this.previousMouseDown = false;
    target.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      this.keys.add(event.code);
    });
    target.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    target.addEventListener('pointerdown', () => {
      this.mouseDown = true;
    });
    target.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
    target.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
  }

  beginFrame() {}

  endFrame() {
    this.previous = new Set(this.keys);
    this.previousMouseDown = this.mouseDown;
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.keys.has(code) && !this.previous.has(code);
  }

  pointerPressed() {
    return this.mouseDown && !this.previousMouseDown;
  }

  movementActive() {
    return this.down('KeyW') || this.down('KeyA') || this.down('KeyS') || this.down('KeyD')
      || this.down('ArrowUp') || this.down('ArrowLeft') || this.down('ArrowDown') || this.down('ArrowRight');
  }
}
