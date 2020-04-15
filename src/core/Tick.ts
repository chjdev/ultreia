import {
  createEventCompanion,
  EventOf,
  Observable,
  RemoveListener,
} from "./Observable";

export interface Tick {
  tick(): void;
}

export const TickEvent = createEventCompanion("tick", "tock");
export type TickEvent = EventOf<typeof TickEvent, { turn: number }>;

export interface ClockView extends Observable<TickEvent> {
  listenTick(ticker: Tick): RemoveListener;
}

export class Clock extends Observable<TickEvent> implements ClockView, Tick {
  private turn: number = 0;

  public tick() {
    this.turn++;
    this.fire({ event: "tick", turn: this.turn });
    this.fire({ event: "tock", turn: this.turn });
  }

  public listenTick(ticker: Tick): RemoveListener {
    return this.listen(() => ticker.tick(), TickEvent.tick);
  }
}
