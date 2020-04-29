import { Coordinate } from "../Coordinate";
import {
  isTile,
  isTileInstance,
  Tile,
  TileInstance,
  TileInstanceFor,
} from "./Tile";
import { useMapView } from "../MatchContext";
import { TileKey } from "./index";

export interface TileChecker<T extends Tile<TileKey>> {
  (coord: Coordinate): boolean;

  (tile: Tile | null | undefined): tile is T;

  (
    tileInstance: TileInstance | null | undefined,
  ): tileInstance is TileInstanceFor<T>;

  (something: any): boolean;
}

export namespace TileChecker {
  export function check<T extends Tile<TileKey>>(
    coord: Coordinate,
    tag: T["tag"] | T,
  ): boolean;
  export function check<T extends Tile<TileKey>>(
    tile: Tile | null | undefined,
    tag: T["tag"] | T,
  ): tile is T;
  export function check<T extends Tile<TileKey>>(
    tileInstance: TileInstance | null | undefined,
    tag: T["tag"] | T,
  ): tileInstance is TileInstanceFor<T>;
  export function check(thing: any, tag: TileKey | Tile) {
    if (Coordinate.isCoordinate(thing)) {
      thing = useMapView().get(thing);
    }
    if (thing == null) {
      return false;
    }
    if (isTileInstance(thing)) {
      thing = thing.tile;
    }
    let checkTag: TileKey;
    if (isTile(tag)) {
      checkTag = tag.tag;
    } else {
      checkTag = tag;
    }
    if (isTile(thing)) {
      return thing.tag === checkTag;
    } else {
      return false;
    }
  }

  export function create<T extends Tile<TileKey>>(
    tag: T["tag"] | T,
  ): TileChecker<T>;
  export function create(
    tag1: TileKey | Tile<TileKey>,
    tag2: TileKey | Tile<TileKey>,
    ...rest: readonly (TileKey | Tile<TileKey>)[]
  ): TileChecker<Tile<TileKey>>;
  export function create(
    tag1: TileKey | Tile<TileKey>,
    tag2?: TileKey | Tile<TileKey>,
    ...rest: readonly (TileKey | Tile<TileKey>)[]
  ): TileChecker<Tile<TileKey>> {
    return ((arg: any) =>
      [tag1, tag2, ...rest]
        .filter((tag): tag is TileKey | Tile => tag != null)
        .some((tag) => check(arg, tag))) as TileChecker<Tile>;
  }

  export const not = <T extends Tile<TileKey>>(
    checker: TileChecker<T>,
  ): TileChecker<T> => ((arg: any) => !checker(arg)) as TileChecker<T>;
}
