export class ObjectPool {
  constructor(factory) {
    this.factory = factory;
    this.items = [];
  }

  acquire() {
    const item = this.items.pop() ?? this.factory();
    item.active = true;
    item.dead = false;
    item.object.visible = true;
    return item;
  }

  release(item) {
    item.active = false;
    item.dead = true;
    item.object.visible = false;
    this.items.push(item);
  }
}
