import { DeepReadonly, Opaque } from "ts-essentials";
import { MapView } from "./WorldMap";
import { useMapView } from "./MatchContext";
import { deepReadonly } from "../utils";

/**
 * Represents a number that's greater or equal to 1
 */
export type TileAxis = Opaque<"TileAxis", number>;

export const TileAxis = deepReadonly({
  /**
   * Guard for correct tile dimensions.
   *
   * @param dimension a number greater or equal to 1
   * @returns the checked tile dimension
   */
  from: (dimension: number): TileAxis => {
    if (dimension < 1) {
      throw new Error(
        `NumberFormatException: dimension ${dimension} is not greater than one`,
      );
    }
    return dimension as TileAxis;
  },
});

export type TileDimensions = Readonly<{
  size: [TileAxis, TileAxis];
  width: () => TileAxis;
  height: () => TileAxis;
  mapDimensions: (map?: MapView) => [number, number];
  setSize: (width: TileAxis, height: TileAxis) => void;
}>;

export const TileDimensions: TileDimensions = {
  size: [TileAxis.from(1), TileAxis.from(1)],
  width: () => TileDimensions.size[0],
  height: () => TileDimensions.size[1],
  mapDimensions: (map: MapView = useMapView()): [number, number] =>
    map.dimensions(...TileDimensions.size),
  setSize: (width: TileAxis, height: TileAxis): void => {
    TileDimensions.size[0] = width;
    TileDimensions.size[1] = height;
  },
};

export type TileDimensionsView = DeepReadonly<Omit<TileDimensions, "setSize">>;
export const TileDimensionsView: TileDimensionsView = TileDimensions;
