import { DeepReadonly, Opaque } from "ts-essentials";
import { MapView } from "./WorldMap";
import { useMapView } from "./MatchContext";

/**
 * Represents a number that's greater or equal to 1
 */
export type TileAxis = Opaque<"TileAxis", number>;

export namespace TileAxis {
  /**
   * Guard for correct tile dimensions.
   *
   * @param value a number greater or equal to 1
   * @returns value is valid TileAxis
   */
  export const isTileAxis = (value: any): value is TileAxis => {
    return typeof value === "number" && value >= 1;
  };

  /**
   * Assert value is valid TileAxis
   *
   * @param value a number greater or equal to 1
   * @throws TypeError
   */
  export function assertTileAxis(value: any): asserts value is TileAxis {
    if (!isTileAxis(value)) {
      throw new TypeError(`value is not a tile axis ${JSON.stringify(value)}`);
    }
  }

  /**
   * Convert number to tile axis
   *
   * @param dimension a number greater or equal to 1
   * @returns the tile axis value
   */
  export const fromNumber = (dimension: number): TileAxis => {
    assertTileAxis(dimension);
    return dimension;
  };
}

export type TileDimensions = Readonly<{
  size: [TileAxis, TileAxis];
  width: () => TileAxis;
  height: () => TileAxis;
  mapDimensions: (map?: MapView) => [number, number];
  setSize: (width: TileAxis, height: TileAxis) => void;
}>;

export const TileDimensions: TileDimensions = {
  size: [TileAxis.fromNumber(1), TileAxis.fromNumber(1)],
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
