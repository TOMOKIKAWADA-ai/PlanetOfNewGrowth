// A19: the center message is a single slot. Without priorities, any later line (a level-up title,
// "MP不足", the water-egg hint) replaced an important explanation the moment it appeared.
// With priorities: a lower line never replaces a higher one that is still showing, and a warning
// that interrupts an explanation hands the slot back to it afterwards (for the time it had left).

export const MessagePriority = Object.freeze({
  normal: 0, // short feedback: upgrade titles, MP不足, counters
  important: 1, // first-time explanations, boss introductions
  warning: 2 // act now: shockwave / inhale warnings, stunned, grabbed
});

export class MessageSlot {
  constructor({ enabled = true, resumeMinSeconds = 0.8 } = {}) {
    this.enabled = enabled;
    this.resumeMinSeconds = resumeMinSeconds;
    this.current = null; // { text, remaining, priority, className }
    this.stashed = null;
  }

  get remaining() {
    return this.current ? this.current.remaining : 0;
  }

  // Returns true when the message takes the slot (the caller then shows it).
  offer(text, seconds, priority = MessagePriority.normal, className = '') {
    const next = { text, remaining: seconds, priority, className };
    const current = this.current;
    if (!this.enabled || !current || current.remaining <= 0) {
      this.current = next;
      if (!this.enabled) this.stashed = null;
      return true;
    }
    if (priority < current.priority) return false;
    if (priority > current.priority && current.priority >= MessagePriority.important
      && current.remaining >= this.resumeMinSeconds) {
      // Keep only the most important interrupted line.
      if (!this.stashed || current.priority >= this.stashed.priority) this.stashed = { ...current };
    }
    this.current = next;
    return true;
  }

  // Advances time. Returns the message to show again when an interrupted one comes back, otherwise null.
  update(dt) {
    if (!this.current) return null;
    this.current.remaining = Math.max(0, this.current.remaining - dt);
    if (this.current.remaining > 0) return null;
    const resumed = this.stashed;
    this.stashed = null;
    this.current = resumed;
    return resumed;
  }

  clear() {
    this.current = null;
    this.stashed = null;
  }
}
