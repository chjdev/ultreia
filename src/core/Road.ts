import { Coordinate } from "./Coordinate";
import { MapView } from "./WorldMap";
import { useMapView } from "./MatchContext";
import { Opaque } from "ts-essentials";
import { baseTileFor } from "./tiles";
import { ShortestPath } from "./ShortestPath";
import { TileChecker } from "./tiles/TileChecker";
import { Mountain } from "./tiles/Mountain";
import { Water } from "./tiles/Water";
import { Forest } from "./tiles/Forest";
import { Grass } from "./tiles/Grass";

const traversableChecker = TileChecker.not(TileChecker.create(Mountain, Water));
/**
 * Is this coordinate traversable (e.g. mountains are not)?
 *
 * @param map the map to use
 * @returns is the coordinate traversable on the map?
 */
const isTraversable = (map: MapView) => (coord: Coordinate): boolean => {
  const tile = map.get(coord);
  if (tile == null) {
    return false;
  }
  return traversableChecker(baseTileFor(tile));
};

/**
 * The base movement cost for this coordinate (e.g. marshes have higher movement cost than grass).
 *
 * @param map the map to use
 * @returns the cost of this coordinate on the map
 */
const cost = (map: MapView) => (coord: Coordinate): number => {
  const tile = map.get(coord);
  if (map.roadNetwork.has(coord)) {
    return 0.25;
  } else if (TileChecker.check(tile, Grass)) {
    return 1;
  } else if (TileChecker.check(tile, Forest)) {
    return 2;
  } else {
    if (tile != null) {
      console.warn("traversable check omitted!", tile);
    }
    return Number.POSITIVE_INFINITY;
  }
};

/**
 * Opaque type for roads. Roads are continuous coordinates with at least 2 steps.
 */
export type Road = Opaque<"Road", readonly Coordinate[]>;

export namespace Road {
  /**
   * is the value a road? an array of continuous coordinates without loops and at least 2 steps.
   *
   * @param value the value to check
   * @returns is value a road?
   */
  export const isRoad = (value: any): value is Road => {
    if (value instanceof Array && value.every(Coordinate.isCoordinate)) {
      if (value.length < 2) {
        return false;
      }

      const continuous = value.every(
        (coord, idx, road: readonly Coordinate[]) =>
          idx < 1 || Coordinate.manhattan(coord, road[idx - 1]) === 1,
      );
      if (!continuous) {
        return false;
      }
      const unique: Set<Coordinate.Hash> = value.reduce(
        (acc: Set<Coordinate.Hash>, coord: Coordinate) => {
          acc.add(Coordinate.hashCode(coord));
          return acc;
        },
        new Set<Coordinate.Hash>(),
      );
      if (unique.size === value.length) {
        return true;
      }
    }
    return false;
  };

  const toRoad = (coordinates: readonly Coordinate[]): Road => {
    if (isRoad(coordinates)) {
      return coordinates;
    } else {
      throw new Error(
        `RoadError: provided coordinates don't form a road! (road: ${JSON.stringify(
          coordinates,
        )}`,
      );
    }
  };

  /**
   * Check whether two roads are the same.
   *
   * @param roadA first road
   * @param roadB second road
   * @returns are the two roads equal?
   */
  export const equals = (roadA: Road, roadB: Road): boolean =>
    roadA.length === roadB.length &&
    roadA.every((step, idx) => Coordinate.equals(step, roadB[idx]));

  /**
   * Find the shortest road between two coordinates using A*.
   *
   * @param origin coordinate to start from
   * @param goal coordinate of the goal
   * @param map (optional) which map to use, defaults to the active map view.
   * @returns the road as an ordered array of coordinates.
   */
  export const search = (
    origin: Coordinate,
    goal: Coordinate,
    map: MapView = useMapView(),
  ): Road =>
    toRoad(
      ShortestPath.search(
        origin,
        goal,
        (step: Coordinate) =>
          Coordinate.neighbors(step).filter(isTraversable(map)),
        Coordinate.equals,
        cost(map),
        Coordinate.manhattan,
        Coordinate.hashCode,
      ),
    );

  /**
   * Type of a road hash.
   */
  export type Hash = Opaque<"RoadHash", string>;

  /**
   * Create a hash for a road, useful for indexing.
   *
   * @param road the road to hash
   * @returns the hash code
   */
  export const hashCode = (road: Road): Hash =>
    road.map((step) => Coordinate.hashCode(step).toString()).join("$") as Hash;

  /**
   * Type of a circular road hash.
   */
  export type CircularHash = Opaque<"CircularRoadHash", string>;

  /**
   * Create a circular, i.e. valid for forward/backward, hash for a road.
   *
   * @param road the road to hash
   * @returns the hash code
   * @see hashCode
   */
  export const circularHashCode = (road: Road): CircularHash => {
    const reverse = road.slice(0);
    reverse.reverse();
    // dirty cast works here
    return (hashCode(
      (road.concat(reverse) as any) as Road,
    ) as any) as CircularHash;
  };

  export type Type = Opaque<"RoadType", number>;
  export const isType = (value: any): value is Type =>
    typeof value === "number" && value > 0 && (value & 0b111111) === value;
  export const toType = (value: number): Type => {
    if (isType(value)) {
      return value;
    } else {
      throw new Error(
        `RoadError: provided value is not a road type! (value: ${value})`,
      );
    }
  };

  export const type = (...faces: readonly Coordinate.FaceIndex[]): Type =>
    toType(
      faces.reduce(
        (acc: number, face: Coordinate.FaceIndex) => acc | (1 << face),
        0,
      ),
    );

  export const allTypes: readonly Type[] = [...Array(Math.pow(2, 6)).keys()]
    .slice(1)
    .map(toType);
}
