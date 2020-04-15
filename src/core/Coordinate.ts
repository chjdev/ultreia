import { useTileDimensionsView } from "./MatchContext";
import { Opaque } from "ts-essentials";

export interface Coordinate extends Object {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export namespace Coordinate {
  export const isCoordinate = (value: any): value is Coordinate =>
    value != null &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.z === "number" &&
    value.x + value.y + value.z === 0;

  export const from = (x: number, y: number, z: number): Coordinate => {
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);
    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }
    const c = { x: rx, y: ry, z: rz };
    if (isCoordinate(c)) {
      return c;
    }
    throw new TypeError("provided values are not a coordinate");
  };

  export const ZERO = from(0, 0, 0);

  export const fromOffset = (column: number, row: number) => {
    const x = column - (row - (row & 1)) / 2;
    const z = row;
    const y = -x - z;
    return from(x, y, z);
  };

  export const toOffset = (coord: Coordinate): [number, number] => {
    /*
      var col = cube.x + (cube.z - (cube.z&1)) / 2
      var row = cube.z
      return OffsetCoord(col, row)
     */
    const col = coord.x + (coord.z - (coord.z & 1)) / 2;
    const row = coord.z;
    return [col, row];
  };

  export const toString = (coord: Coordinate): string =>
    `Coordinate: { ${coord.x}, ${coord.y}, ${coord.z}  }`;

  export const toWorld = (
    coord: Coordinate,
    tileWidth: number = useTileDimensionsView().width(),
    tileHeight: number = useTileDimensionsView().height(),
  ): [number, number] => {
    console.assert(tileWidth > 0);
    console.assert(tileHeight > 0);
    console.assert(
      tileWidth === tileHeight,
      "only standard pointy hex for now",
    );
    console.assert(
      tileWidth === tileHeight,
      "only standard pointy hex for now",
    );
    const [col, row] = toOffset(coord);
    console.assert(col >= 0 && row >= 0, "only positive offsets");
    return [
      Math.round(((row & 1) * tileWidth) / 2 + col * tileWidth),
      Math.round(row * (0.75 * tileHeight)),
    ];
  };

  // that should be easier?
  export const fromWorld = (
    worldX: number,
    worldY: number,
    tileWidth: number = useTileDimensionsView().width(),
    tileHeight: number = useTileDimensionsView().height(),
  ) => {
    console.assert(worldX >= 0);
    console.assert(worldY >= 0);
    console.assert(tileWidth > 0);
    console.assert(tileHeight > 0);
    console.assert(
      tileWidth === tileHeight,
      "only standard pointy hex for now",
    );
    const partWidth = tileWidth;
    const partHeight = 1.5 * tileHeight;
    const partX = Math.floor(worldX / partWidth);
    const partY = Math.floor(worldY / partHeight);
    const partIX = worldX % partWidth;
    const partIY = worldY % partHeight;
    const row = 2 * partY;
    if (partIY > tileHeight) {
      //below main body
      if (partIX < tileWidth / 2) {
        //left
        return fromOffset(partX - 1, row + 1);
      } else {
        //right
        return fromOffset(partX, row + 1);
      }
    }
    if (partIY <= tileHeight / 4) {
      //upperoverflow
      if (partIX < tileWidth / 2) {
        //left
        if (partIX / 2 <= partIY) {
          return fromOffset(partX - 1, row - 1);
        } else {
          return fromOffset(partX, row);
        }
      } else {
        //right
        if (partIX / 2 > partIY) {
          return fromOffset(partX, row - 1);
        } else {
          return fromOffset(partX, row);
        }
      }
    }
    if (partIY > tileHeight / 4 && partIY <= tileHeight) {
      //main body
      return fromOffset(partX, row);
    }
    //loweroverflow
    if (partIX < tileWidth / 2) {
      //left
      if (partIX / 2 <= partIY) {
        return fromOffset(partX - 1, row + 1);
      } else {
        return fromOffset(partX, row);
      }
    } else {
      //right
      if (partIX / 2 > partIY) {
        return fromOffset(partX, row + 1);
      } else {
        return fromOffset(partX, row);
      }
    }
  };

  export type Hash = Opaque<"CoordinateHash", number>;

  export const hashCode = (coord: Coordinate): Hash => {
    const [i, j] = toOffset(coord);
    console.assert(
      i < 1 << 16 && j < 1 << 16,
      "coords up to 65,535 should be enough for now",
    );
    return ((i << 16) | j) as Hash;
  };

  export const rectangle = (
    worldX: number,
    worldY: number,
    width: number,
    height: number,
    tileWidth: number = useTileDimensionsView().width(),
    tileHeight: number = useTileDimensionsView().height(),
    clipEnds: boolean = false,
  ): Coordinate[] => {
    console.assert(width >= 0);
    console.assert(height >= 0);
    const [minI, minJ] = toOffset(
      fromWorld(worldX, worldY, tileWidth, tileHeight),
    );
    const [maxI, maxJ] = toOffset(
      fromWorld(worldX + width, worldY + height, tileWidth, tileHeight),
    );
    const coords = [];
    for (let i = minI; clipEnds ? i < maxI : i <= maxI; i++) {
      for (let j = minJ; clipEnds ? j < maxJ : j <= maxJ; j++) {
        coords.push(fromOffset(i, j));
      }
    }
    return coords;
  };

  export const equals = (c1: Coordinate, c2: Coordinate): boolean =>
    c1 === c2 || (c1.x === c2.x && c1.y === c2.y && c1.z === c2.z);

  export const plus = (c1: Coordinate, c2: Coordinate): Coordinate =>
    from(c1.x + c2.x, c1.y + c2.y, c1.z + c2.z);

  export const minus = (c1: Coordinate, c2: Coordinate): Coordinate =>
    from(c1.x - c2.x, c1.y - c2.y, c1.z - c2.z);

  export const scale = (c: Coordinate, factor: number): Coordinate =>
    from(c.x * factor, c.y * factor, c.z * factor);

  export const neighbors = (coord?: Coordinate): Coordinate[] => {
    const directions = [
      from(+1, -1, 0),
      from(+1, 0, -1),
      from(0, +1, -1),
      from(-1, +1, 0),
      from(-1, 0, +1),
      from(0, -1, +1),
    ];
    if (coord == null) {
      return directions;
    }
    return directions.map((direction) => plus(coord, direction));
  };

  export const range = (
    center: Coordinate,
    steps: number,
    includeOrigin = true,
  ): Coordinate[] => {
    const results = [];
    for (let x = -steps; x <= steps; x++) {
      for (
        let y = Math.max(-steps, -x - steps);
        y <= Math.min(steps, -x + steps);
        y++
      ) {
        const z = -x - y;
        const offset = from(x, y, z);
        if (includeOrigin || !equals(ZERO, offset)) {
          results.push(plus(center, offset));
        }
      }
    }
    return results;
  };

  export const manhattan = (a: Coordinate, b: Coordinate) =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));

  export type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

  export const touchingFace = (c1: Coordinate, c2: Coordinate): FaceIndex => {
    if (manhattan(c1, c2) != 1) {
      throw new Error("CoordinateError: hexes are not touching");
    }
    const dist = minus(c1, c2);
    return dist.x === 0
      ? dist.y < 0
        ? 5
        : 2
      : dist.x < 0
      ? dist.y === 0
        ? 4
        : 3
      : dist.y === 0
      ? 1
      : 0;
  };

  export const difference = (
    setA: readonly Coordinate[],
    setB: readonly Coordinate[],
  ): Coordinate[] =>
    setA.filter((coordA) => !setB.some((coordB) => equals(coordA, coordB)));

  export const union = (
    setA: readonly Coordinate[],
    setB: readonly Coordinate[],
  ): Coordinate[] => setB.concat(difference(setA, setB));

  export const intersection = (
    setA: readonly Coordinate[],
    setB: readonly Coordinate[],
  ): Coordinate[] =>
    difference(
      union(setA, setB),
      union(difference(setA, setB), difference(setB, setA)),
    );
}

export class CoordinateIndexed<E = unknown> {
  private readonly arr: Readonly<E>[][] = [];
  private cachedCoordinates: Coordinate[] | null = null;
  private cachedValues: E[] | null = null;

  public constructor(elements: readonly [Coordinate, E][] = []) {
    elements.forEach((element) => this.set(...element));
  }

  public coordinates(): Coordinate[] {
    if (this.cachedCoordinates == null) {
      this.cachedCoordinates = this.arr
        .map((col, i) => col.map((tile, j) => Coordinate.fromOffset(i, j)))
        .reduce((acc, col) => {
          acc.push(...col);
          return acc;
        }, []);
    }
    return this.cachedCoordinates.slice(0);
  }

  public *[Symbol.iterator](): Iterator<E> {
    for (const col of this.arr) {
      yield* col;
    }
  }

  public values(): E[] {
    if (this.cachedValues == null) {
      this.cachedValues = this.arr.reduce((acc, column) => {
        column.forEach((row) => acc.push(row));
        return acc;
      }, []);
    }
    return this.cachedValues.slice(0);
  }

  public get(coord: Coordinate): E | undefined {
    const [i, j] = Coordinate.toOffset(coord);
    return this.arr[i]?.[j];
  }

  public has(coord: Coordinate): boolean {
    const [i, j] = Coordinate.toOffset(coord);
    return i in this.arr && j in this.arr[i];
  }

  public at(coord: Coordinate): E {
    if (!this.has(coord)) {
      throw new Error(
        `IndexError: no tile at coordinate ${JSON.stringify(coord)}`,
      );
    }
    console.assert(coord != null, "should exist");
    return this.get(coord) as E;
  }

  public forEach(
    fun: (tile: E, coord: Coordinate, map: CoordinateIndexed<E>) => void,
  ): void {
    this.arr.forEach((col, i) =>
      col.forEach((tile, j) => fun(tile, Coordinate.fromOffset(i, j), this)),
    );
  }

  public set(coord: Coordinate, tile: E): boolean {
    const [i, j] = Coordinate.toOffset(coord);
    if (!(i in this.arr)) {
      this.arr[i] = [];
    }
    this.arr[i][j] = tile;
    this.cachedCoordinates = null;
    this.cachedValues = null;
    return true;
  }

  public del(
    coord: Coordinate,
    destructor?: (element: E) => void,
  ): E | undefined {
    const current = this.get(coord);
    if (current != null) {
      const [i, j] = Coordinate.toOffset(coord);
      delete this.arr[i][j];
      if (destructor) {
        destructor(current);
      }
    }
    return current;
  }

  protected columns(): number {
    return this.arr.length;
  }

  protected rows(): number {
    return Math.max(...this.arr.map((col) => col.length));
  }

  public slice(start: Coordinate, stop: Coordinate) {
    const [startI, startJ] = Coordinate.toOffset(start);
    const [stopI, stopJ] = Coordinate.toOffset(stop);
    console.assert(startI <= stopI);
    console.assert(startJ <= stopJ);
    const newArr: [Coordinate, E][] = [];
    for (let i = startI; i <= stopI && i < this.arr.length; i++) {
      for (let j = startJ; j <= stopJ && j < this.arr[i]?.length; j++) {
        newArr.push([Coordinate.fromOffset(i, j), this.arr[i][j]]);
      }
    }
    return new CoordinateIndexed<E>(newArr);
  }

  public filter<T extends E>(
    fun: (
      tile: E,
      coord: Coordinate,
      collection: CoordinateIndexed<T>,
    ) => tile is T,
  ): CoordinateIndexed<T>;
  public filter(
    fun: (
      element: E,
      coord: Coordinate,
      collection: CoordinateIndexed<E>,
    ) => boolean,
  ): CoordinateIndexed<E> {
    const newArr: [Coordinate, E][] = [];
    for (const coord of this.coordinates()) {
      const element = this.at(coord);
      if (fun(element, coord, this)) {
        newArr.push([coord, element]);
      }
    }
    return new CoordinateIndexed<E>(newArr);
  }
}

export type CoordinateIndexedView<E = unknown> = Omit<
  CoordinateIndexed<E>,
  "del" | "set"
>;
