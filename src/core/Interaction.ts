import {
  createEventCompanion,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Event,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EventCompanion,
  EventOf,
  Observable,
} from "./Observable";
import { Coordinate } from "./Coordinate";
import { ConstructableTileKeys, isConstructableTileKey } from "./tiles";

export const ContextEvent = createEventCompanion("context");
export type _ContextEvent<C> = EventOf<typeof ContextEvent, { context: C }>;
export type RoadContextEvent = _ContextEvent<"road">;

export interface BuildContextEvent extends _ContextEvent<"build"> {
  tile: ConstructableTileKeys;
}

export type SelectContextEvent = _ContextEvent<"select">;
type Context =
  | RoadContextEvent["context"]
  | BuildContextEvent["context"]
  | SelectContextEvent["context"];
export type ContextEvent = _ContextEvent<Context>;

export function assertBuildContextEvent(
  event: any,
): asserts event is BuildContextEvent {
  if (event.event === "build" && !isConstructableTileKey(event.tile)) {
    throw new Error(
      `TypeAssertionError: ${event.tile} is not a constructable tile key!`,
    );
  }
}

/**
 * Companion object for interaction events
 *
 * @property select a coordinate is selected
 * @property hover a coordinate is hovered
 * @see EventCompanion
 */
export const InteractionEvent = createEventCompanion("select", "hover");
/**
 * Basic interaction events, e.g. "select" a tile
 *
 * @property coordinate the coordinate that triggered the event
 * @see Event
 * @see Coordinate
 */
export type InteractionEvent = EventOf<
  typeof InteractionEvent,
  {
    coordinate: Coordinate;
    context: Context;
  }
>;

export interface InteractionView
  extends Observable<InteractionEvent | ContextEvent> {}

export class Interaction extends Observable<InteractionEvent | ContextEvent>
  implements InteractionView {
  private hovered: Coordinate | null = null;
  private context: Context = "select";

  public hover(coordinate: Coordinate, debounce: boolean = true): void {
    if (
      debounce &&
      this.hovered != null &&
      Coordinate.equals(this.hovered, coordinate)
    ) {
      //nothing to do
      return;
    }
    this.hovered = coordinate;
    this.fire({ event: "hover", coordinate, context: this.context });
  }

  public select(coordinate: Coordinate): void {
    this.hovered = null;
    this.fire({ event: "select", coordinate, context: this.context });
  }

  public roadContext(): void {
    this.context = "road";
    const event: RoadContextEvent = {
      event: "context",
      context: this.context,
    };
    this.fire(event);
  }

  public buildContext(tile: ConstructableTileKeys): void {
    this.context = "build";
    const event: BuildContextEvent = {
      event: "context",
      context: this.context,
      tile,
    };
    this.fire(event);
  }

  public selectContext(): void {
    this.context = "select";
    const event: SelectContextEvent = {
      event: "context",
      context: this.context,
    };
    this.fire(event);
  }
}
