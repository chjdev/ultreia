import { Opaque } from "ts-essentials";

export namespace PriorityQueue {
  export type Element<T> = Opaque<"PriorityQueueElement", readonly [T, number]>;
  const asElement = <T>(element: readonly [T, number]): Element<T> =>
    element as Element<T>;

  /**
   * @returns empty priority queue
   */
  export const create = <T>(): PriorityQueue<T> => {
    return [];
  };

  /**
   * mutably add element to priority queue
   *
   * @param element the element to add
   * @param priority the elements priority
   * @param q the queue to add to
   * @returns the queue
   */
  export const put = <T>(
    element: T,
    priority: number,
    q: PriorityQueue<T>,
  ): PriorityQueue<T> => {
    const idx = q.findIndex(([, qPriority]) => priority < qPriority);
    if (idx < 0) {
      // all have lower priority or empty
      q.push(asElement([element, priority]));
      return q;
    }
    q.splice(idx, 0, asElement([element, priority]));
    return q;
  };

  /**
   * mutably remove highest priority element from queue and return it
   *
   * @param q the queue to take the value from
   * @returns highest priority element or undefined if there is none
   */
  export const next = <T>(q: PriorityQueue<T>): T | undefined => {
    return q.shift()?.[0];
  };
}

export type PriorityQueue<T> = PriorityQueue.Element<T>[];
