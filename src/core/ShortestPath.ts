import { expect } from "../utils";
import { Opaque } from "ts-essentials";
import { PriorityQueue } from "./PriorityQueue";

type ShortestPath<T> = Opaque<"ShortestPath", readonly T[]>;
const asShortestPath = <T>(steps: readonly T[]): ShortestPath<T> =>
  steps as ShortestPath<T>;

export namespace ShortestPath {
  /**
   * Calculate the shortest path using Astar.
   *
   * @param origin starting element
   * @param goal end element
   * @param candidate get a single or multiple candidates for the next step
   * @param equals equality check of two elements
   * @param cost the cost of a candidate
   * @param heuristic the heuristic of the current step towards the goal
   * @param key a keying/hashing mechanism to generate unique elements
   * @returns the shortest path between origin and goal according to the configuration. [origin] means origin === goal, [] menas no path
   */
  export const search = <T, K extends PropertyKey>(
    origin: Readonly<T>,
    goal: Readonly<T>,
    candidate: (step: Readonly<T>) => Readonly<T> | readonly Readonly<T>[],
    equals: (stepA: Readonly<T>, stepB: Readonly<T>) => boolean,
    cost: (step: Readonly<T>) => number,
    heuristic: (step: Readonly<T>, goal: Readonly<T>) => number,
    key: (step: Readonly<T>) => Readonly<K>,
  ): ShortestPath<T> => {
    if (equals(origin, goal)) {
      return asShortestPath([origin]);
    }

    const frontier = PriorityQueue.create<T>();
    PriorityQueue.put(origin, 0, frontier);
    const cameFrom = new Map<K, T>();
    cameFrom.set(key(origin), origin);
    const costSoFar = new Map<K, number>();
    costSoFar.set(key(origin), 0);
    while (frontier.length > 0) {
      const current = expect(
        PriorityQueue.next(frontier),
        "frontier is not empty",
      );
      if (equals(current, goal)) {
        break;
      }
      [candidate(current)].flat().forEach((neighbor) => {
        const newCost = (costSoFar.get(key(current)) ?? 0) + cost(neighbor);
        if (
          !costSoFar.has(key(neighbor)) ||
          newCost <
            expect(
              costSoFar.get(key(neighbor)),
              "checked in previous condition",
            )
        ) {
          costSoFar.set(key(neighbor), newCost);
          const priority = newCost + heuristic(neighbor, goal);
          PriorityQueue.put(neighbor, priority, frontier);
          cameFrom.set(key(neighbor), current);
        }
      });
    }

    {
      // reconstruct path
      let current = goal;
      let previous = cameFrom.get(key(current));
      if (previous == null) {
        return asShortestPath([]);
      }
      const path = [current];
      // starting coordinate is from -> from in the map
      while (!equals(previous, current)) {
        current = previous;
        path.unshift(current);
        previous = cameFrom.get(key(current));
        if (previous == null) {
          return asShortestPath([]);
        }
      }
      return asShortestPath(path);
    }
  };
}
