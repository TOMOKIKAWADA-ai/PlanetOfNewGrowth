const GAMEPAD_ACTION_BUTTONS = {
  confirm: [0],
  cancel: [1],
  burst: [2, 5],
  transform: [3],
  pause: [9],
  restart: [8]
};

const KEYBOARD_ACTION_KEYS = {
  burst: ['KeyE'],
  transform: ['KeyQ'],
  pause: ['Escape'],
  restart: ['KeyR']
};

const GAMEPAD_DIRECTIONS = {
  up: 12,
  down: 13,
  left: 14,
  right: 15
};

function applyDeadzone(value, deadzone) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - deadzone) / (1 - deadzone));
}

function connectedGamepad() {
  try {
    return Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected) ?? null;
  } catch {
    return null;
  }
}

export class InputState {
  constructor(target = window) {
    this.keys = new Set();
    this.previous = new Set();
    this.mouseDown = false;
    this.previousMouseDown = false;
    this.gamepadButtons = new Set();
    this.previousGamepadButtons = new Set();
    this.blockedGamepadButtons = new Set();
    this.gamepadDirections = new Set();
    this.previousGamepadDirections = new Set();
    this.menuRepeatAt = new Map();
    this.gamepadMoveX = 0;
    this.gamepadMoveZ = 0;
    this.touchMoveX = 0;
    this.touchMoveZ = 0;
    this.touchActions = new Set();
    this.touchPressedActions = new Set();
    this.gamepadId = '';
    this.controllerConnected = false;
    this.gamepadDeadzone = 0.18;
    target.addEventListener('keydown', (event) => {
      if (connectedGamepad()) {
        this.keys.clear();
        this.previous.clear();
        if (!event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
      this.keys.add(event.code);
    }, true);
    target.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (connectedGamepad() && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    target.addEventListener('pointerdown', () => {
      this.mouseDown = true;
    });
    target.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
    target.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
      this.clearTouchInput();
    });
  }

  beginFrame() {
    this.pollGamepad();
  }

  endFrame() {
    this.previous = new Set(this.keys);
    this.previousMouseDown = this.mouseDown;
    this.previousGamepadButtons = new Set(this.gamepadButtons);
    this.previousGamepadDirections = new Set(this.gamepadDirections);
    this.touchPressedActions.clear();
  }

  setTouchMovement(x, z) {
    this.touchMoveX = applyDeadzone(x, 0.1);
    this.touchMoveZ = applyDeadzone(z, 0.1);
  }

  pressTouchAction(action) {
    if (this.touchActions.has(action)) return;
    this.touchActions.add(action);
    this.touchPressedActions.add(action);
  }

  releaseTouchAction(action) {
    this.touchActions.delete(action);
  }

  clearTouchInput() {
    this.setTouchMovement(0, 0);
    this.touchActions.clear();
    this.touchPressedActions.clear();
  }

  pollGamepad() {
    const gamepad = connectedGamepad();
    const connected = Boolean(gamepad);
    if (connected !== this.controllerConnected) {
      this.controllerConnected = connected;
      this.keys.clear();
      this.previous.clear();
      if (typeof document !== 'undefined') document.documentElement.dataset.inputMode = connected ? 'gamepad' : 'keyboard';
    }
    this.gamepadButtons.clear();
    this.gamepadDirections.clear();
    this.gamepadMoveX = 0;
    this.gamepadMoveZ = 0;
    this.gamepadId = gamepad?.id ?? '';
    if (!gamepad) {
      this.blockedGamepadButtons.clear();
      return;
    }

    gamepad.buttons.forEach((button, index) => {
      if (button.pressed || button.value >= 0.5) this.gamepadButtons.add(index);
    });
    for (const index of this.blockedGamepadButtons) {
      if (!this.gamepadButtons.has(index)) this.blockedGamepadButtons.delete(index);
    }
    const stickX = applyDeadzone(gamepad.axes[0] ?? 0, this.gamepadDeadzone);
    const stickZ = applyDeadzone(gamepad.axes[1] ?? 0, this.gamepadDeadzone);
    const dpadX = (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.right) ? 1 : 0)
      - (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.left) ? 1 : 0);
    const dpadZ = (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.down) ? 1 : 0)
      - (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.up) ? 1 : 0);
    this.gamepadMoveX = dpadX || stickX;
    this.gamepadMoveZ = dpadZ || stickZ;

    if (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.up) || stickZ < -0.55) this.gamepadDirections.add('up');
    if (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.down) || stickZ > 0.55) this.gamepadDirections.add('down');
    if (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.left) || stickX < -0.55) this.gamepadDirections.add('left');
    if (this.gamepadButtons.has(GAMEPAD_DIRECTIONS.right) || stickX > 0.55) this.gamepadDirections.add('right');
  }

  down(code) {
    return !this.hasGamepad && this.keys.has(code);
  }

  pressed(code) {
    return !this.hasGamepad && this.keys.has(code) && !this.previous.has(code);
  }

  pointerPressed() {
    return this.mouseDown && !this.previousMouseDown;
  }

  gamepadPressed(buttonIndex) {
    return this.gamepadButtons.has(buttonIndex)
      && !this.previousGamepadButtons.has(buttonIndex)
      && !this.blockedGamepadButtons.has(buttonIndex);
  }

  actionDown(action) {
    const keys = KEYBOARD_ACTION_KEYS[action] ?? [];
    const buttons = GAMEPAD_ACTION_BUTTONS[action] ?? [];
    return this.touchActions.has(action)
      || keys.some((code) => this.down(code))
      || buttons.some((index) => this.gamepadButtons.has(index));
  }

  actionPressed(action) {
    const keys = KEYBOARD_ACTION_KEYS[action] ?? [];
    const buttons = GAMEPAD_ACTION_BUTTONS[action] ?? [];
    return this.touchPressedActions.has(action)
      || keys.some((code) => this.pressed(code))
      || buttons.some((index) => this.gamepadPressed(index));
  }

  consumeAction(action) {
    for (const index of GAMEPAD_ACTION_BUTTONS[action] ?? []) {
      if (this.gamepadButtons.has(index)) this.blockedGamepadButtons.add(index);
    }
  }

  directionPressed(direction) {
    return this.gamepadDirections.has(direction) && !this.previousGamepadDirections.has(direction);
  }

  menuDirectionPressed(direction) {
    if (!this.gamepadDirections.has(direction)) {
      this.menuRepeatAt.delete(direction);
      return false;
    }
    const now = performance.now();
    if (!this.previousGamepadDirections.has(direction) || !this.menuRepeatAt.has(direction)) {
      this.menuRepeatAt.set(direction, now + 320);
      return true;
    }
    if (now < (this.menuRepeatAt.get(direction) ?? Infinity)) return false;
    this.menuRepeatAt.set(direction, now + 170);
    return true;
  }

  movementX() {
    let keyboard = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) keyboard -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) keyboard += 1;
    return keyboard || this.gamepadMoveX || this.touchMoveX;
  }

  movementZ() {
    let keyboard = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) keyboard -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) keyboard += 1;
    return keyboard || this.gamepadMoveZ || this.touchMoveZ;
  }

  movementActive() {
    return Math.abs(this.movementX()) > 0.001 || Math.abs(this.movementZ()) > 0.001;
  }

  get hasGamepad() {
    return this.controllerConnected || Boolean(connectedGamepad());
  }
}
