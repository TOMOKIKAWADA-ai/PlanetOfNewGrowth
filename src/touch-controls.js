export class TouchControls {
  constructor(input, root) {
    this.input = input;
    this.root = root;
    this.stick = root?.querySelector('#touchStick') ?? null;
    this.knob = root?.querySelector('.touch-stick-knob') ?? null;
    this.stickPointerId = null;
    this.actionPointers = new Map();
    this.enabled = false;
    if (!root || !this.stick) return;

    this.stick.addEventListener('pointerdown', (event) => {
      if (!this.enabled || this.stickPointerId !== null) return;
      event.preventDefault();
      this.stickPointerId = event.pointerId;
      this.stick.setPointerCapture(event.pointerId);
      this.updateStick(event);
    });
    this.stick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.stickPointerId) this.updateStick(event);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.stick.addEventListener(type, (event) => {
        if (event.pointerId === this.stickPointerId) this.resetStick();
      });
    }

    for (const button of root.querySelectorAll('[data-touch-action]')) {
      const action = button.dataset.touchAction;
      button.addEventListener('pointerdown', (event) => {
        if (!this.enabled || this.actionPointers.has(action)) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.actionPointers.set(action, event.pointerId);
        button.classList.add('is-pressed');
        this.input.pressTouchAction(action);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(type, (event) => {
          if (this.actionPointers.get(action) !== event.pointerId) return;
          this.actionPointers.delete(action);
          button.classList.remove('is-pressed');
          this.input.releaseTouchAction(action);
        });
      }
    }
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  updateStick(event) {
    const bounds = this.stick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.34);
    const dx = event.clientX - (bounds.left + bounds.width * 0.5);
    const dz = event.clientY - (bounds.top + bounds.height * 0.5);
    const scale = Math.min(1, radius / Math.max(1, Math.hypot(dx, dz)));
    const x = dx * scale;
    const z = dz * scale;
    this.knob.style.transform = `translate(${x}px, ${z}px)`;
    this.input.setTouchMovement(x / radius, z / radius);
  }

  resetStick() {
    this.stickPointerId = null;
    this.knob.style.transform = '';
    this.input.setTouchMovement(0, 0);
  }

  reset() {
    this.resetStick();
    this.actionPointers.clear();
    for (const button of this.root?.querySelectorAll('[data-touch-action]') ?? []) {
      button.classList.remove('is-pressed');
    }
    this.input.clearTouchInput();
  }

  setEnabled(enabled) {
    const visible = Boolean(enabled && window.matchMedia?.('(any-pointer: coarse)').matches);
    if (visible === this.enabled) return;
    this.enabled = visible;
    this.root?.classList.toggle('hidden', !visible);
    if (!visible) this.reset();
  }
}
