import { Coordinate } from "../Coordinate";
import { CostGood, Good, InventoryView } from "../Goods";
import { TileKey } from "./index";
import { Writable } from "ts-essentials";
import { Constructor1 } from "../../utils";

export interface Tile<T extends TileKey = any> {
  readonly tag: T;

  create(coord: Coordinate): TileInstance<T>;
}

export const isTile = (value: any): value is Tile<any> =>
  typeof value?.tag === "string" && typeof value?.create === "function";

export interface ConstructableTile<
  T extends TileKey,
  Costs extends CostGood | "Nothing"
> extends Tile<T> {
  readonly costs: InventoryView<Costs>;

  allowed(coord: Coordinate): boolean;

  influence(coord: Coordinate): Coordinate[];

  create(coord: Coordinate): ConstructableTileInstance<T, Costs>;
}

export const isConstructableTile = (
  value: any,
): value is ConstructableTile<any, any> =>
  typeof value?.allowed === "function" &&
  typeof value?.influence === "function" &&
  typeof value?.costs === "object" &&
  isTile(value);

type StateGoods<
  Consumes extends Good,
  Produces extends Good
> = Consumes extends "Nothing"
  ? Produces
  : Produces extends "Nothing"
  ? Consumes
  : Consumes | Produces;

export interface StatefulTile<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good
> extends Tile<T> {
  readonly consumes: InventoryView<Consumes>;
  readonly produces: InventoryView<Produces>;
  readonly formula: InventoryView<
    Produces,
    | Partial<InventoryView<Consumes>>
    | readonly Partial<InventoryView<Consumes>>[]
  >;
  readonly initialState: InventoryView<StateGoods<Consumes, Produces>>;

  influence(coord: Coordinate): Coordinate[];

  productivity(coord: Coordinate): number;

  create(coord: Coordinate): StatefulTileInstance<T, Consumes, Produces>;
}

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

export interface StandardTile<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good,
  Costs extends CostGood | "Nothing"
> extends StatefulTile<T, Consumes, Produces>, ConstructableTile<T, Costs> {
  create(coord: Coordinate): StandardTileInstance<T, Consumes, Produces, Costs>;
}

export const isStandardTile = (
  value: any,
): value is StandardTile<any, any, any, any> =>
  isConstructableTile(value) && isStatefulTile(value);

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
  typeof value?.state === "object" && isTileInstance(value);

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
    return [...args]
      .slice(1)
      .filter((arg) => arg != null)
      .every((good) => good in consumption);
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
    return [...args]
      .slice(1)
      .filter((arg) => arg != null)
      .every((good) => good in production);
  }
  return false;
}
