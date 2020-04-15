import {
  Coordinate,
  CoordinateIndexed,
  CoordinateIndexedView,
} from "./Coordinate";
import { applyMixins } from "../utils";
import {
  createEventCompanion,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Event,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EventCompanion,
  EventOf,
  Observable,
} from "./Observable";
import { Road } from "./Road";
import { ShortestPath } from "./ShortestPath";

/**
 * Event companion for events fired by the road network
 *
 * @property create new road created
 * @property update existing road updated
 * @property delete existing road deleted
 * @see EventCompanion
 */
export const RoadNetworkEvent = createEventCompanion(
  "create",
  "update",
  "delete",
);

/**
 * Events fired by the road network
 *
 * @property coord the {@link Coordinate} that triggered the event
 * @property road the {@link Road} that triggered the event
 * @property roadNetwork the road network
 * @see Event
 * @see Road
 */
export type RoadNetworkEvent = EventOf<
  typeof RoadNetworkEvent,
  { road: Road; coord: Coordinate; roadNetwork: RoadNetworkView }
>;

/**
 * Readonly view of the road network.
 *
 * @see CoordinateIndexedView
 * @see Observable
 */
export interface RoadNetworkView
  extends CoordinateIndexedView<readonly Road[]> {
  /**
   * Get the type of road at this coordinate, i.e. which faces are connected
   *
   * @param coord
   * @returns the road type or undefined if no road exists at this coordinate
   */
  getRoadType(coord: Coordinate): Road.Type | undefined;

  /**
   * Does this road network contain this road?
   *
   * @param road the road to check
   * @returns contains road?
   */
  hasRoad(road: Road): boolean;

  /**
   * Check whether two coordinates are connected by any road or directly touching
   *
   * @param from
   * @param to
   */
  isConnected(from: Coordinate, to: Coordinate): boolean;
}

/**
 * The road network.
 *
 * @see RoadNetworkView
 */
export interface RoadNetwork
  extends RoadNetworkView,
    CoordinateIndexed<readonly Road[]> {
  /**
   * Create a new road in the network. Convenience method that merges
   * the new road with the current roads automatically.
   *
   * @param road the road to merge
   * @returns the road
   */
  createRoad(road: Road): Road;

  /**
   * Remove a road from the network. Convenience method that merges
   * the new state with the current roads automatically.
   *
   * @param road the road to delete
   * @returns the old road if it was deleted or undefined
   */
  delRoad(road: Road): Road | undefined;
}

class RoadNetworkImplementation extends CoordinateIndexed<readonly Road[]>
  implements RoadNetwork {
  private roads: Set<Road.CircularHash> = new Set();

  public constructor(elements: [Coordinate, readonly Road[]][] = []) {
    super(elements);
  }

  public getRoadType(coord: Coordinate): Road.Type | undefined {
    const roads = this.get(coord);
    if (roads == null || roads.length === 0) {
      return undefined;
    }
    return Road.type(
      ...roads
        // get the relevant road segments
        .map((road) => {
          const coordIndex = road.findIndex((step) =>
            Coordinate.equals(step, coord),
          );
          console.assert(
            coordIndex >= 0,
            "if the road exists here, the coordinate needs to exist as well",
          );
          return [road[coordIndex - 1], road[coordIndex], road[coordIndex + 1]];
        })
        // get all touching faces
        .flatMap((steps) => {
          const faces: Coordinate.FaceIndex[] = [];
          if (steps[0] != null) {
            faces.push(Coordinate.touchingFace(steps[1], steps[0]));
          }
          if (steps[2] != null) {
            faces.push(Coordinate.touchingFace(steps[1], steps[2]));
          }
          return faces;
        }),
    );
  }

  public set(coord: Coordinate, roads: readonly Road[]) {
    if (roads.length === 0) {
      this.del(coord);
      return true;
    }
    const currentRoads = this.get(coord) ?? [];
    const currentRoadHashes = new Set<Road.CircularHash>(
      currentRoads.map(Road.circularHashCode),
    );
    const roadHashes = new Set<Road.CircularHash>(
      roads.map(Road.circularHashCode),
    );
    const [updatedRoads, newRoads] = roads.reduce(
      (acc, road) => {
        const [updatedRoads, newRoads] = acc;
        if (currentRoadHashes.has(Road.circularHashCode(road))) {
          updatedRoads.push(road);
        } else {
          newRoads.push(road);
        }
        return acc;
      },
      [[], []] as [Road[], Road[]],
    );

    super.set(coord, [...newRoads, ...updatedRoads]);
    newRoads.forEach((road) =>
      this.fire({ event: "create", road, coord, roadNetwork: this }),
    );
    updatedRoads.forEach((road) =>
      this.fire({ event: "update", road, coord, roadNetwork: this }),
    );

    const deletedRoads = currentRoads.filter(
      (road) => !roadHashes.has(Road.circularHashCode(road)),
    );
    deletedRoads.forEach((road) => this.delRoad(road));

    return true;
  }

  public isConnected(from: Coordinate, to: Coordinate): boolean {
    if (Coordinate.manhattan(from, to) === 1) {
      return true;
    }
    return (
      ShortestPath.search(
        from,
        to,
        (step: Coordinate) =>
          (this.get(step) ?? []).flatMap((road) => {
            const stepIdx = road.findIndex((roadStep) =>
              Coordinate.equals(roadStep, step),
            );
            return [road[stepIdx - 1], road[stepIdx + 1]].filter(
              (roadStep) => roadStep != null,
            );
          }),
        Coordinate.equals,
        () => 1,
        Coordinate.manhattan,
        Coordinate.hashCode,
      ).length >= 2
    );
  }

  public hasRoad(road: Road): boolean {
    const hash = Road.circularHashCode(road);
    return this.roads.has(hash);
  }

  /**
   * Merge a road with the current state at the coordinate
   *
   * @param coord the coordinate at which to merge
   * @param road the road to merge
   */
  private union(coord: Coordinate, road: Road): void {
    this.set(coord, [road, ...(this.get(coord) ?? [])]);
  }

  public createRoad(road: Road): Road {
    if (this.hasRoad(road)) {
      // road already exists, nothing to do
      return road;
    }
    road.forEach((step) => this.union(step, road));
    this.roads.add(Road.circularHashCode(road));
    return road;
  }

  public del(
    coord: Coordinate,
    destructor?: (element: readonly Road[]) => void,
  ): readonly Road[] | undefined {
    const currentRoads = this.get(coord);
    if (currentRoads == null) {
      // nothing to do;
      return undefined;
    } else if (currentRoads.length === 0) {
      super.del(coord, destructor);
    }
    currentRoads.forEach((road) => {
      this.delRoad(road);
    });
    return super.del(coord, destructor);
  }

  /**
   * Remove a road from the current state and delete the coord if empty.
   *
   * @param coord the coordinate to remove from
   * @param road the road to remove
   */
  private subtract(coord: Coordinate, road: Road): void {
    const hash = Road.circularHashCode(road);
    const subtracted = (this.get(coord) ?? []).filter(
      (currentRoad) => Road.circularHashCode(currentRoad) !== hash,
    );
    if (subtracted.length === 0) {
      this.del(coord);
    } else {
      this.set(coord, subtracted);
    }
  }

  public delRoad(road: Road): Road | undefined {
    if (!this.hasRoad(road)) {
      // road doesn't exist, nothing to do
      return undefined;
    }
    // make sure other del don't see the road any more in recursion
    this.roads.delete(Road.circularHashCode(road));
    road.forEach((step) => {
      this.subtract(step, road);
      this.fire({ event: "delete", road, coord: step, roadNetwork: this });
    });
    return road;
  }

  public close() {
    Observable.prototype.close.bind(this)();
  }
}

export interface RoadNetworkView extends Observable<RoadNetworkEvent> {}

// merge interfaces to get observable in scope
interface RoadNetworkImplementation extends RoadNetwork {}

// mix in the observable implementation
applyMixins(RoadNetworkImplementation, [Observable]);

/**
 * @returns a new empty road network
 */
export const createRoadNetwork = (): RoadNetwork =>
  new RoadNetworkImplementation();
