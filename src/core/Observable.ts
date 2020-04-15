/**
 * A basic event that is fired by observables.
 * Has at least an {@link Event.event} tag.
 *
 * @param Name the name tag for this event
 * @property event the name tag for this event
 * @example
 * interface SomeEvent extends Event<"something" | "other">,
 *   Readonly<{
 *     road: Road;
 *   }> {}
 */
export interface Event<Name extends string> {
  /** the name tag for this event */
  readonly event: Name;
}

/**
 * Helper type that extracts the keys of an Event type
 *
 * @param E the to extract from
 * @see Event
 */
type Keys<E extends Event<string>> = {
  [P in E["event"]]: P;
};

/**
 * Event helpers are companion objects that contain all the keys of an event
 * plus a special {@link EventCompanion.all} property that contains all event tags.
 * Recommended to use {@link createEventCompanion} and {@link EventOf} to create
 * events and their companions.
 *
 * @property all contains all event tags
 * @param E the event this object is a companion of
 * @see Keys
 * @see Event
 * @see createEventCompanion
 *
 * @example
 * interface SomeEvent extends Event<"something" | "other">,
 *   Readonly<{
 *     road: Road;
 *   }> {}
 * const SomeEvent: EventCompanion<SomeEvent> = {
 *  something: "something",
 *  other: "other",
 *  all: ["something", "other"],
 * };
 */
export type EventCompanion<E extends Event<string>> = Keys<E> & {
  readonly all: Readonly<E["event"][]>;
};

/**
 * Create an event companion object by providing unique event tags.
 * Can be used to create an event type using the {@link EventOf} helper type.
 *
 * @param e1-e9 event tags
 * @returns the EventCompanion
 * @see Event
 * @see EventCompanion
 * @see EventOf
 * @example
 * createEventCompanion("hello", "world"); // {event: "hello" | "world" }
 */
export function createEventCompanion<
  E1 extends string,
  E2 extends Exclude<string, E1> = never,
  E3 extends string = never,
  E4 extends string = never,
  E5 extends string = never,
  E6 extends string = never,
  E7 extends string = never,
  E8 extends string = never,
  E9 extends string = never
>(
  e1: E1,
  e2?: Exclude<E2, E1>,
  e3?: Exclude<E3, E2 | E1>,
  e4?: Exclude<E4, E3 | E2 | E1>,
  e5?: Exclude<E5, E4 | E3 | E2 | E1>,
  e6?: Exclude<E6, E5 | E4 | E3 | E2 | E1>,
  e7?: Exclude<E7, E6 | E5 | E4 | E3 | E2 | E1>,
  e8?: Exclude<E8, E7 | E6 | E5 | E4 | E3 | E2 | E1>,
  e9?: Exclude<E9, E8 | E7 | E6 | E5 | E4 | E3 | E2 | E1>,
): EventCompanion<Event<E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9>>;
/**
 * @param args rest style args for easier coding
 * @returns the EventCompanion
 */
export function createEventCompanion<E extends string>(
  ...args: readonly E[]
): EventCompanion<Event<E>> {
  return {
    ...args.reduce(
      (acc, arg) => ((acc[arg] = arg), acc),
      {} as Record<string, E>,
    ),
    all: args,
  } as EventCompanion<Event<E>>;
}

/**
 * Helper type to create an optionally data carrying event based on an
 * {@link EventCompanion}
 *
 * @param C the EventCompanion to infer from
 * @param T (optional) additional data properties that are merged into the event
 *  type as readonly properties
 * @example
 * const E = createEventCompanion("hello", "world");
 * type E = EventOf<typeof E, {a: string, b: string}>;
 * const e: E = ...; // {event: "hello" | "world", a: ..., b: ...}
 * E // { hello: "hello", world: "world", all: ["hello", "world"] }
 */
export type EventOf<
  C extends EventCompanion<Event<string>>,
  T = void
> = C extends EventCompanion<infer E>
  ? T extends void
    ? E
    : E & Readonly<T>
  : never;

interface Listener<E extends Event<string>> {
  (event: E): void;
}

export interface RemoveListener {
  (): void;
}

export abstract class Observable<E extends Event<string>> {
  private listeners?: Set<Listener<E>>;

  protected getListeners(): Set<Listener<E>> {
    if (this.listeners == null) {
      this.listeners = new Set();
    }
    return this.listeners;
  }

  public listen(fun: Listener<E>): RemoveListener;
  public listen<ES extends E>(
    fun: Listener<ES>,
    event: ES["event"],
    ...rest: Readonly<ES["event"][]>
  ): RemoveListener;
  public listen<ES extends E>(
    fun: Listener<ES>,
    events: Readonly<ES["event"][]>,
  ): RemoveListener;
  public listen(fun: Listener<E>, event?: any, rest?: any): RemoveListener {
    const events: E["event"][] =
      event == null ? [] : event instanceof Array ? event : [event];
    if (rest != null) {
      events.push(...rest);
    }

    // todo inefficient, create dedicated channels?!
    const listenFun = (event: E) =>
      events.includes(event.event) && fun && fun(event);
    this.getListeners().add(listenFun);
    return () => {
      if (this != null) {
        this.removeListener(listenFun);
      }
    };
  }

  public close() {
    // clean up
  }

  protected removeListener(fun: Listener<E>) {
    this.getListeners().delete(fun);
  }

  protected fire(event: E) {
    this.getListeners().forEach((fun) => fun(event));
  }
}
