import { Clock, ClockView } from "./Tick";
import { MapView, Map } from "./WorldMap";
import { Interaction, InteractionView } from "./Interaction";
import { TileDimensions, TileDimensionsView } from "./TileDimensions";

export interface Match
  extends Readonly<{
    map: Map;
    clock: Clock;
    interaction: Interaction;
    tileDimensions: TileDimensions;
  }> {}

export interface MatchView
  extends Readonly<{
    map: MapView;
    clock: ClockView;
    interaction: InteractionView;
    tileDimensions: TileDimensionsView;
  }> {}

let currentMatch: Match | undefined = undefined;
export const setMatch = (match: Match | undefined) => (currentMatch = match);

export const useMatch = (): Match => {
  if (currentMatch == null) {
    throw new Error("no match context active");
  }
  return currentMatch;
};

export const useMatchView = (): MatchView => useMatch();

export const useMap = (): Map => useMatch().map;
export const useMapView = (): MapView => useMap();

export const useClock = (): Clock => useMatch().clock;
export const useClockView = (): ClockView => useClock();

export const useInteraction = (): Interaction => useMatch().interaction;
export const useInteractionView = (): InteractionView => useInteraction();

export const useTileDimensions = (): TileDimensions =>
  useMatch().tileDimensions;
export const useTileDimensionsView = (): TileDimensionsView =>
  useTileDimensions();
