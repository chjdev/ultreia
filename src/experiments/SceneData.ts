export class SceneData {
  public position!: Float32Array;
  public indices!: Uint16Array;
  public colors!: Float32Array;
  public radii!: Float32Array;
  public texCoords!: Float32Array;

  private end: number;

  public constructor() {
    this.resize(12);
    this.end = 0;
  }

  private resize(size: number) {
    if (size <= this.indices.length / 6) {
      // no need to resize
    }
    this.position = new Float32Array(size * 4 * 4);
    this.indices = new Uint16Array(size * 6);
    this.colors = new Float32Array(this.indices.length * 4);
    this.radii = new Float32Array(this.indices.length * 4);
    this.texCoords = new Float32Array(this.indices.length * 4);
  }

  public length(): number {
    return this.end + 1;
  }

  public insert(id: number) {
    if (id >= this.length()) {
      this.end = id;
      this.resize(this.length());
      return;
    }
    // vacate a space and move rest up one step
    this.end++;
    this.resize(this.length());
    this.position.set(
      this.position.slice(id * 4 * 4, this.length() * 4 * 4),
      id * 4 * 4 + 4,
    );
    this.indices.set(this.indices.slice(id * 6, this.length() * 6), id * 6 + 6);

    const v4Offset = id * 6 * 4;
    const v4To = v4Offset + 6 + 4;
    const v4Length = this.length() * 6 * 4;
    this.colors.set(this.colors.slice(v4Offset, v4Length), v4To);
    this.radii.set(this.radii.slice(v4Offset, v4Length), v4To);
    this.texCoords.set(this.texCoords.slice(v4Offset, v4Length), v4To);
  }

  public add() {
    this.insert(this.length());
  }

  public setPosition(
    id: number,
    {
      x,
      y,
      width,
      height,
    }: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ): void {
    this.resize(id + 1);
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;
    const z = id;
    const aspect = width / height;
    const triangleIdx = id * 4 * 4;
    // 1000s because corner info is encoded here since gl_VertexID is broken
    this.position.set(
      [
        [x1, y1, z, aspect],
        [x2, y1, z, aspect + 1000],
        [x1, y2, z, aspect + 2000],
        [x2, y2, z, aspect + 3000],
      ].flat(),
      triangleIdx,
    );
  }

  private set4PerVertex(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number,
  ) {
    this.resize(id + 1);
    this.colors.set(
      Array(6)
        .fill([x, y, z, w])
        .flat(),
      id * 6 * 4,
    );
  }

  public setColor(
    id: number,
    {
      r = 0,
      g = 0,
      b = 0,
      a = r + g + b > 0 ? 1 : 0,
    }: { r?: number; g?: number; b?: number; a?: number },
  ) {
    this.set4PerVertex(id, r, g, b, a);
  }

  public setRadii(id: number, { tl = 0, tr = 0, br = 0, bl = 0 } = {}) {
    this.set4PerVertex(id, tl, tr, br, bl);
  }

  public setTexCoords(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.set4PerVertex(id, x, y, width, height);
  }
}
