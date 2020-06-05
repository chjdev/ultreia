import { Rectangle } from "./render/primitive/Rectangle";
import { Textures } from "./render/Textures";
import TextureMap = Textures.TextureMap;

export class SceneData {
  public position!: Float32Array;
  public indices!: Uint16Array;
  public colors!: Float32Array;
  public radii!: Float32Array;
  public texCoords!: Float32Array;

  private end: number;

  public constructor(
    public texture: WebGLTexture,
    public textureMap: TextureMap,
  ) {
    this.resize(0);
    this.end = 0;
  }

  public resize(size: number) {
    if (this.indices != null && size <= this.indices.length / 6) {
      // no need to resize
      return;
    }
    this.position = new Float32Array(size * 4 * 4);
    this.indices = new Uint16Array(size * 6);
    this.colors = new Float32Array(this.position.length);
    this.radii = new Float32Array(this.position.length);
    this.texCoords = new Float32Array(this.position.length);
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
    this.indices.set(this.indices.slice(id * 6, this.length() * 6), id * 6 + 6);
    const v4Offset = id * 4 * 4;
    const v4To = v4Offset + 4 + 4;
    const v4Length = this.length() * 4 * 4;
    this.position.set(this.position.slice(v4Offset, v4Length), v4To);
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
    const z = 0;
    // const maxZoom = 1.5;
    // const scaleFactor =
    //   z >= 0 ? 1 + (maxZoom - 1) * z : (1 / maxZoom) * Math.abs(z);

    // const xScaling = (width * (scaleFactor - 1)) / 2;
    // const yScaling = (height * (scaleFactor - 1)) / 2;
    const xScaling = 0,
      yScaling = 0;

    const x1 = x - xScaling;
    const x2 = x + width + xScaling;
    const y1 = y - yScaling;
    const y2 = y + height + yScaling;

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

    const indexIdx = id * 6;
    const quadIdx = id * 4;
    this.indices.set(
      [0, 1, 2, 2, 1, 3].map((vertIdx) => vertIdx + quadIdx),
      indexIdx,
    );
  }

  private perVertex4(
    id: number,
    x: number,
    y: number,
    z: number,
    w: number,
  ): [ArrayLike<number>, number] {
    this.resize(id + 1);
    return [
      Array(4)
        .fill([x, y, z, w])
        .flat(),
      id * 4 * 4,
    ];
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
    this.colors.set(...this.perVertex4(id, r, g, b, a));
  }

  public setRadii(id: number, { tl = 0, tr = 0, br = 0, bl = 0 }) {
    this.radii.set(...this.perVertex4(id, tl, tr, br, bl));
  }

  public setTexCoords(
    id: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.texCoords.set(...this.perVertex4(id, x, y, width, height));
  }

  public setRectangle(id: number, rectangle: Rectangle) {
    this.setPosition(id, rectangle);
    this.setColor(id, rectangle.backgroundColor ?? {});
    this.setRadii(id, rectangle.borderRadius ?? {});

    // todo
    const texCoord = [
      ...(this.textureMap[rectangle.texture ?? ""] ?? [-1, -1]),
      256,
      384,
    ] as [number, number, number, number];
    this.setTexCoords(id, ...texCoord);
  }
}
