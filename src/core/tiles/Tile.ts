import { Coordinate } from "../Coordinate";
import { CostGood, Good, Inventory, InventoryView } from "../Goods";
import { TileKey } from "./index";
import { Opaque, Writable } from "ts-essentials";
import { Constructor1 } from "../../utils";
import { TileChecker } from "./TileChecker";

/**
 * Base interface for all Tiles. A Tile is a tagged configuration of a world map element.
 */
export interface Tile<T extends TileKey = any> {
  /** The TileKey tag uniquely identifying this Tile */
  readonly tag: T;

  /**
   * Create a new instance of this Tile type
   *
   * @param coord where does the instance live?
   * @returns a new tile instance
   */
  create(coord: Coordinate): TileInstance<T>;
}

/**
 * Type guard for Tiles
 *
 * @param value the value to guard
 * @returns value is a tile
 * @see Tile
 */
export const isTile = (value: any): value is Tile<any> =>
  typeof value?.tag === "string" && typeof value?.create === "function";

/**
 * Type assertions for Tiles
 *
 * @param value the value to assert
 * @throws TypeError
 * @see Tile
 */
export function assertTile(value: any): asserts value is Tile<any> {
  if (!isTile(value)) {
    throw new TypeError(
      `provided value (${JSON.stringify(value)}) is not a tile!`,
    );
  }
}

interface WithInfluence {
  /**
   * Which tiles based on the provided coordinate does the tile influence?
   *
   * @param coord the coordinate acting as center of the influence
   * @returns the influenced coordinates as array
   * @see Coordinate
   */
  influence(coord: Coordinate): Coordinate[];
}

/**
 * A constructable Tile is the base interface for a Tile that can be created by
 * the player and has a cost associated with it.
 *
 * @see Tile
 */
export interface ConstructableTile<
  T extends TileKey,
  Costs extends CostGood | "Nothing"
> extends Tile<T>, WithInfluence {
  /** Configures the cost of this Tile */
  readonly costs: InventoryView<Costs>;

  /**
   * Check whether this tile is allowed at this coordinate
   *
   * @param coord the coordinate to check
   * @returns tile allowed at coordinate?
   * @see Coordinate
   */
  allowed(coord: Coordinate): boolean;

  create(coord: Coordinate): ConstructableTileInstance<T, Costs>;
}

/**
 * Type guard for constructable Tiles
 *
 * @param value the value to guard
 * @returns value is a constructable Tile
 * @see ConstructableTile
 */
export const isConstructableTile = (
  value: any,
): value is ConstructableTile<any, any> =>
  typeof value?.allowed === "function" &&
  typeof value?.influence === "function" &&
  typeof value?.costs === "object" &&
  isTile(value);

/**
 * Type assertions for constructable Tiles
 *
 * @param value the value to assert
 * @throws TypeError
 * @see ConstructableTile
 */
export function assertConstructableTile(
  value: any,
): asserts value is ConstructableTile<any, any> {
  if (!isConstructableTile(value)) {
    throw new TypeError(
      `provided value (${JSON.stringify(value)}) is not a constructable tile!`,
    );
  }
}

/**
 * Helper type to combine Consumes and Produces goods and get the correct
 * type to be used for states, i.e. don't include Nothing
 *
 * @see Good
 */
type StateGoods<
  Consumes extends Good,
  Produces extends Good
> = Consumes extends "Nothing"
  ? Produces
  : Produces extends "Nothing"
  ? Consumes
  : Consumes | Produces;

/**
 * Opaque types for productivities. Productivity is represented as a percentage
 * with a number in [0., 1.]
 */
export type Productivity = Opaque<"Productivity", number>;

export namespace Productivity {
  /**
   * Type guard for productivities
   *
   * @param value the value to test
   * @returns value is a Productivity
   * @see Productivity
   */
  export const isProductivity = (value: any): value is Productivity =>
    typeof value === "number" && value >= 0 && value <= 1;

  /**
   * Type assertion for productivities
   *
   * @param value the value to assert
   * @throws TypeError
   * @see Productivity
   */
  export function assertProductivity(
    value: any,
  ): asserts value is Productivity {
    if (!isProductivity(value)) {
      throw new TypeError(
        `provided value ${JSON.stringify(value)} is not a productivity value.`,
      );
    }
  }

  /**
   * Safely convert number ot Productivity
   *
   * @param value the number to convert
   * @returns the converted productivity
   * @see Productivity
   */
  export const fromNumber = (value: number): Productivity => {
    assertProductivity(value);
    return value;
  };

  /**
   * Calculate the max productivity.
   *
   * @param productivities the productivities to compare
   * @returns the maximum of the provided productivities
   * @see Math.max
   */
  export const max = (
    ...productivities: readonly (Productivity | number)[]
  ): Productivity => Productivity.fromNumber(Math.max(...productivities));

  /**
   * @returns a simple 1.0 productivity
   */
  export const simple = (): Productivity => fromNumber(1);

  /**
   * Calculate a productivity based on the amount of the consumption stock.
   *
   * @param instance a stateful instance to check.
   * @returns productivity based on amount of consumption stock.
   */
  export const fromStock = (
    instance: StatefulTileInstance<any, any, any>,
  ): Productivity =>
    fromNumber(
      Inventory.reduce(
        (acc, consumes, good) => acc * (instance.state[good] / consumes),
        1.0,
        instance.tile.consumes,
      ),
    );

  /**
   * Calculate productivity from reachable tiles.
   *
   * @param fromTile the tile for witch to create the tile reachability
   * @param reachableTile the tile to search for
   * @param coord the coordinate to check from.
   * @param scale (optional) the scale factor to use for the productivity, e.g.
   *  2 means 1 reachable -> 50%, 2 reachable -> 100%. must be >= 1.0 (default: 1.0)
   * @returns a productivity based on reachable tiles.
   */
  export function fromTileReachability<
    F extends Tile & WithInfluence,
    T extends Tile<TileKey>
  >(
    fromTile: F,
    reachableTile: T | T["tag"],
    coord: Coordinate,
    scale: number = 1,
  ): Productivity {
    if (scale < 1) {
      throw new RangeError(`scale factor ${JSON.stringify(scale)} < 1`);
    }
    return Productivity.fromNumber(
      Math.min(
        1.0,
        fromTile
          .influence(coord)
          .filter((coord) => TileChecker.check<T>(coord, reachableTile))
          .length / scale,
      ),
    );
  }
}

/**
 * A stateful Tile is a tile that consumes and produces goods according to a formula
 * and maintains that information in a state.
 *
 * Note: A stateful tile is not necessarily a constructable tile (and vice versa).
 * For example a FishSchool is stateful but not constructable by the player.
 *
 * @see Tile
 */
export interface StatefulTile<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good
> extends Tile<T>, WithInfluence {
  /** Configures the goods that are consumed by this tile */
  readonly consumes: InventoryView<Consumes>;
  /** Configures the goods that are produced by this tile */
  readonly produces: InventoryView<Produces>;
  /** Configures how consumption goods are converted to production goods
   * There can be multiple ways a production good can be produced (e.g. money)
   * in this case instead of a simple mapping, an array of mappings can be provided.
   *
   * @example
   * {
   *   Jewelery: {
   *     Gold: 2,
   *     Jewel: 1,
   *   },
   *   Money: [
   *     { Gold: 1 },
   *     { Silver: 1 }
   *   ]
   * }
   *
   */
  readonly formula: InventoryView<
    Produces,
    | Partial<InventoryView<Consumes>>
    | readonly Partial<InventoryView<Consumes>>[]
  >;
  /**
   * Initial state of consumption and production goods an instance starts with
   * usually maps to 0.
   *
   * @example
   * {
   *   Gold: 0,
   *   Jewel: 0,
   *   Money: 0,
   * }
   */
  readonly initialState: InventoryView<StateGoods<Consumes, Produces>>;

  /**
   * The base productivity possible at this coordinate.
   *
   * @param coord the coordinate to check
   * @returns the base productivity possible at this coordinate.
   * @see Productivity
   */
  baseProductivity(coord: Coordinate): Productivity;
  /**
   * The productivity of this specific instance
   *
   * @param inst the instance to check
   * @returns the productivity of this specific instance
   * @see Productivity
   */
  productivity(inst: StatefulTileInstance<T, Consumes, Produces>): Productivity;

  create(coord: Coordinate): StatefulTileInstance<T, Consumes, Produces>;
}

/**
 * Type guard for stateful Tiles
 *
 * @param value the value to guard
 * @returns value is a stateful Tile
 * @see StatefulTile
 */
export const isStatefulTile = (
  value: any,
): value is StatefulTile<any, any, any> =>
  typeof value?.productivity === "function" &&
  typeof value?.influence === "function" &&
  typeof value?.consumes === "object" &&
  typeof value?.produces === "object" &&
  typeof value?.formula === "object" &&
  typeof value?.initialState === "object" &&
  isTile(value);

/**
 * Type assertions for stateful Tiles
 *
 * @param value the value to assert
 * @throws TypeError
 * @see StatefulTile
 */
export const assertStatefulTile = (
  value: any,
): asserts value is StatefulTile<any, any, any> => {
  if (!isStatefulTile(value)) {
    throw new TypeError(
      `provided value (${JSON.stringify(value)}) is not a stateful tile!`,
    );
  }
};

/**
 * Standard tiles are constructable, stateful tiles. These are usually the
 * type of tiles the player interacts with.
 *
 * @see ConstructableTile
 * @see StatefulTile
 */
export interface StandardTile<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good,
  Costs extends CostGood | "Nothing"
> extends StatefulTile<T, Consumes, Produces>, ConstructableTile<T, Costs> {
  create(coord: Coordinate): StandardTileInstance<T, Consumes, Produces, Costs>;
}

/**
 * Type guard for standard Tiles
 *
 * @param value the value to guard
 * @returns value is a standard Tile
 * @see StandardTile
 */
export const isStandardTile = (
  value: any,
): value is StandardTile<any, any, any, any> =>
  isConstructableTile(value) && isStatefulTile(value);

/**
 * Type assertions for standard Tiles
 *
 * @param value the value to assert
 * @throws TypeError
 * @see StandardTile
 */
export const assertStandardTile = (
  value: any,
): asserts value is StandardTile<any, any, any, any> => {
  if (!isStandardTile(value)) {
    throw new TypeError(
      `provided value (${JSON.stringify(value)}) is not a standard tile!`,
    );
  }
};

export interface TileInstance<T extends TileKey = any> {
  readonly tile: Readonly<Tile<T>>;
  readonly coordinate: Coordinate;

  close(): void;
}

export const TileInstance = <T extends TileKey>(
  tile: Tile<T>,
): Constructor1<Coordinate, TileInstance<T>> => {
  return class implements TileInstance<T> {
    public readonly tile = tile;

    public constructor(public readonly coordinate: Coordinate) {}

    public close() {
      // clean up
    }
  };
};

export const isTileInstance = (value: any): value is TileInstance =>
  isTile(value?.tile) && Coordinate.isCoordinate(value?.coordinate);

export interface ConstructableTileInstance<
  T extends TileKey,
  Costs extends CostGood | "Nothing"
> extends TileInstance {
  readonly tile: Readonly<ConstructableTile<T, Costs>>;
}

export const ConstructableTileInstance = <
  T extends TileKey,
  Costs extends CostGood | "Nothing"
>(
  tile: ConstructableTileInstance<T, Costs>["tile"],
): Constructor1<Coordinate, ConstructableTileInstance<T, Costs>> => {
  return class extends TileInstance(tile)
    implements ConstructableTileInstance<T, Costs> {
    public readonly tile = tile;
  };
};

export const isConstructableTileInstance = (
  value: any,
): value is ConstructableTileInstance<any, any> =>
  isTileInstance(value) && isConstructableTile(value.tile);

export type InventoryViewFor<
  T extends StatefulTile<any, any, any>,
  E = void
> = E extends void ? T["initialState"] : Record<keyof T["initialState"], E>;
export type InventoryFor<
  T extends StatefulTile<any, any, any>,
  E = void
> = Writable<InventoryViewFor<T, E>>;

export interface StatefulTileInstance<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good
> extends TileInstance {
  readonly tile: Readonly<StatefulTile<T, Consumes, Produces>>;
  readonly state: InventoryFor<StatefulTile<T, Consumes, Produces>>;
}

export const StatefulTileInstance = <
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good
>(
  tile: StatefulTileInstance<T, Consumes, Produces>["tile"],
): Constructor1<Coordinate, StatefulTileInstance<T, Consumes, Produces>> => {
  return class extends TileInstance(tile)
    implements StatefulTileInstance<T, Consumes, Produces> {
    public readonly tile = tile;
    public readonly state = {
      ...tile.initialState,
    };
  };
};

export const isStatefulTileInstance = (
  value: any,
): value is StatefulTileInstance<any, any, any> =>
  typeof value?.state === "object" &&
  isTileInstance(value) &&
  isStatefulTile(value.tile);

export interface StandardTileInstance<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good,
  Costs extends CostGood | "Nothing"
>
  extends StatefulTileInstance<T, Consumes, Produces>,
    ConstructableTileInstance<T, Costs> {
  readonly tile: Readonly<StandardTile<T, Consumes, Produces, Costs>>;
}

export const StandardTileInstance = <
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good,
  Costs extends CostGood | "Nothing"
>(
  tile: StandardTileInstance<T, Consumes, Produces, Costs>["tile"],
): Constructor1<
  Coordinate,
  StandardTileInstance<T, Consumes, Produces, Costs>
> => {
  return class extends StatefulTileInstance(tile)
    implements StandardTileInstance<T, Consumes, Produces, Costs> {
    public readonly tile = tile;
  };
};

export type TileInstanceFor<T extends Tile> = T extends StandardTile<
  infer T,
  infer Consumes,
  infer Produces,
  infer Costs
>
  ? StandardTileInstance<T, Consumes, Produces, Costs>
  : T extends StatefulTile<infer T, infer Consumes, infer Produces>
  ? StatefulTileInstance<T, Consumes, Produces>
  : T extends ConstructableTile<infer T, infer Costs>
  ? ConstructableTileInstance<T, Costs>
  : T extends TileInstance<infer T>
  ? TileInstance<T>
  : TileInstance;

export function isConsuming<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(
  value: Tile,
  g0: G0,
  g1?: G1,
  g2?: G2,
  g3?: G3,
  g4?: G4,
  g5?: G5,
  g6?: G6,
): value is StatefulTile<any, G0 | G1 | G2 | G3 | G4 | G5 | G6, any>;
export function isConsuming<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(
  value: TileInstance,
  g0: G0,
  g1?: G1,
  g2?: G2,
  g3?: G3,
  g4?: G4,
  g5?: G5,
  g6?: G6,
): value is StatefulTileInstance<any, G0 | G1 | G2 | G3 | G4 | G5 | G6, any>;
export function isConsuming<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(value: Tile | TileInstance, ...args: readonly Good[]) {
  if (isStatefulTileInstance(value)) {
    value = value.tile;
  }
  if (isStatefulTile(value)) {
    const consumption = value.consumes;
    return args.every((good) => good in consumption);
  }
  return false;
}

export function isProducing<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(
  value: Tile,
  g0: G0,
  g1?: G1,
  g2?: G2,
  g3?: G3,
  g4?: G4,
  g5?: G5,
  g6?: G6,
): value is StatefulTile<any, any, G0 | G1 | G2 | G3 | G4 | G5 | G6>;
export function isProducing<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(
  value: TileInstance,
  g0: G0,
  g1?: G1,
  g2?: G2,
  g3?: G3,
  g4?: G4,
  g5?: G5,
  g6?: G6,
): value is StatefulTileInstance<any, any, G0 | G1 | G2 | G3 | G4 | G5 | G6>;
export function isProducing<
  G0 extends Good,
  G1 extends Good = G0,
  G2 extends Good = G1,
  G3 extends Good = G2,
  G4 extends Good = G3,
  G5 extends Good = G4,
  G6 extends Good = G5
>(value: Tile | TileInstance, ...args: readonly Good[]) {
  if (isStatefulTileInstance(value)) {
    value = value.tile;
  }
  if (isStatefulTile(value)) {
    const production = value.produces;
    return args.every((good) => good in production);
  }
  return false;
}
