import seedrandom from "seedrandom";
import { Map, MapView } from "./WorldMap";
import { Coordinate } from "./Coordinate";
import { Grass } from "./tiles/Grass";
import { Water } from "./tiles/Water";
import { useMap } from "./MatchContext";
import { Forest } from "./tiles/Forest";
import { Mountain } from "./tiles/Mountain";
import { FishSchool } from "./tiles/FishSchool";
import { TileInstance } from "./tiles/Tile";
import { TileChecker } from "./tiles/TileChecker";

const rng = seedrandom("Christian");

const density = (map: MapView, area: readonly Coordinate[]): number =>
  area.filter((coord) => !TileChecker.check(map.at(coord).tile, Water)).length /
  area.length;

interface WorldBuilderParams {
  size?: Coordinate;
  stampSize?: number;
  islandSize?: number;
  islandThreshold?: number;
  islands?: number;
  worldThreshold?: number;
  margin?: number;
}

export const buildWorld = ({
  size = Coordinate.fromOffset(100, 100),
  stampSize = 3,
  islandThreshold = 0.85,
  islandSize = 20,
  worldThreshold = 0.4,
  margin = 10,
}: WorldBuilderParams = {}): Map => {
  const map = useMap();
  const [lastI, lastJ] = Coordinate.toOffset(size);
  console.assert(lastJ > stampSize);
  console.assert(lastI > stampSize);
  console.assert(stampSize > 0);
  for (let i = 0; i <= lastI; i++) {
    for (let j = 0; j <= lastJ; j++) {
      const coord = Coordinate.fromOffset(i, j);
      map.set(coord, Water.create(coord));
    }
  }

  const worldCoordinates = map.coordinates();
  const clamp = islandSize + stampSize + margin;
  while (density(map, worldCoordinates) < worldThreshold) {
    const start = Coordinate.fromOffset(
      Math.round(Math.max(clamp, Math.min(lastI - clamp, rng() * lastI))),
      Math.round(Math.max(clamp, Math.min(lastJ - clamp, rng() * lastJ))),
    );
    const islandArea = Coordinate.range(start, islandSize);
    while (density(map, islandArea) < islandThreshold) {
      const randomTileIdx = Math.round(rng() * (islandArea.length - 1));
      const randomTileCoord = islandArea[randomTileIdx];
      const ground = Coordinate.range(randomTileCoord, stampSize);
      ground.forEach((coord) => {
        const neighbourForest = Coordinate.neighbors(coord).reduce(
          (acc, inf) => acc + (TileChecker.check(map.get(inf), Forest) ? 1 : 0),
          0,
        );
        const neighbourMountain = Coordinate.neighbors(coord).reduce(
          (acc, inf) =>
            acc + (TileChecker.check(map.get(inf), Mountain) ? 1 : 0),
          0,
        );
        const Tile =
          rng() >
          Math.max(
            0.03,
            neighbourMountain /
              Coordinate.neighbors(Coordinate.ZERO).length /
              1.07,
          )
            ? neighbourMountain <= 2
              ? rng() >
                Math.max(
                  0.2,
                  neighbourForest /
                    (Coordinate.neighbors(Coordinate.ZERO).length / 1.15),
                )
                ? Grass
                : Forest
              : Forest
            : Mountain;
        map.set(coord, Tile.create(coord));
      });
    }
  }
  // populate fish schools on water tiles that have a land neighbor
  map
    .filter(
      (instance, coord): instance is TileInstance<"Water"> =>
        TileChecker.check(instance, Water) &&
        Coordinate.neighbors(coord).some(
          (neighbor) =>
            map.get(neighbor) && !TileChecker.check(neighbor, Water),
        ) &&
        rng() > 0.66,
    )
    .forEach((_, coord) => {
      map.set(coord, FishSchool.create(coord));
    });
  return map;
};
