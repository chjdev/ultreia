import { createWorldMap } from "./WorldMap";
import { Clock } from "./Tick";
import { buildWorld } from "./WorldBuilder";
import { Match, setMatch } from "./MatchContext";
import { Interaction } from "./Interaction";
import { TileDimensions } from "./TileDimensions";

let currentMatch: Match | undefined;
export const MatchManager = {
  start: () => {
    currentMatch = {
      map: createWorldMap(),
      clock: new Clock(),
      interaction: new Interaction(),
      tileDimensions: TileDimensions,
    };
    // beware of cyclic reference
    setMatch(currentMatch);
    buildWorld();
  },
  close: () => {
    if (currentMatch == null) {
      return;
    }
    currentMatch.map.close();
    currentMatch.clock.close();
    currentMatch.interaction.close();
    currentMatch = undefined;
    setMatch(currentMatch);
  },
  load: () => {
    throw new Error("not implemented");
  },
  save: () => {
    throw new Error("not implemented");
  },
};
