export class SpatialGrid {
  constructor(cellSize = 6) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  keyFor(x, z) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  insert(entity) {
    const key = this.keyFor(entity.position.x, entity.position.z);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(entity);
  }

  rebuild(entities) {
    this.clear();
    for (const entity of entities) {
      if (!entity.dead) this.insert(entity);
    }
  }

  query(position, radius, out = []) {
    out.length = 0;
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);
    const radiusSq = radius * radius;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const cell = this.cells.get(`${x},${z}`);
        if (!cell) continue;
        for (const entity of cell) {
          const dx = entity.position.x - position.x;
          const dz = entity.position.z - position.z;
          if (dx * dx + dz * dz <= radiusSq) out.push(entity);
        }
      }
    }
    return out;
  }
}
