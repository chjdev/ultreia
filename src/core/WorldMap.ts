import {
  Coordinate,
  CoordinateIndexed,
  CoordinateIndexedView,
} from "./Coordinate";
import { isConstructableTile, Tile, TileInstance } from "./tiles/Tile";
import { baseTileFor } from "./tiles";
import { applyMixins } from "../utils";
import { createEventCompanion, EventOf, Observable } from "./Observable";
import { TileAxis } from "./TileDimensions";
import { createRoadNetwork, RoadNetwork, RoadNetworkView } from "./RoadNetwork";

export const MapEvent = createEventCompanion("create", "update", "delete");
export type MapEvent = EventOf<
  typeof MapEvent,
  {
    coord: Coordinate;
    tile: TileInstance;
    map: MapView;
  }
>;

export interface MapView extends CoordinateIndexedView<TileInstance> {
  readonly roadNetwork: RoadNetworkView;
  dimensions(tileWidth: TileAxis, tileHeight: TileAxis): [number, number];
}

export interface Map extends MapView, CoordinateIndexed<TileInstance> {
  readonly roadNetwork: RoadNetwork;
  create<T extends Tile, R extends TileInstance = ReturnType<T["create"]>>(
    coord: Coordinate,
    tile: T,
  ): R;
}

class MapImplementation extends CoordinateIndexed<TileInstance> implements Map {
  public constructor(
    private readonly defaultTileWidth: number = 1,
    private readonly defaultTileHeight: number = 1,
    public roadNetwork = createRoadNetwork(),
    elements: [Coordinate, TileInstance][] = [],
  ) {
    super(elements);
  }

  public set(coord: Coordinate, tile: TileInstance) {
    const current = this.get(coord);
    if (current != null) {
      this.del(coord);
    }
    if (super.set(coord, tile)) {
      this.fire({
        event: current == null ? "create" : "update",
        coord,
        tile,
        map: this,
      });
      return true;
    }
    return false;
  }

  public del(coord: Coordinate): TileInstance | undefined {
    const current = this.get(coord);
    // only delete if not a base tile, e.g. grass
    if (isConstructableTile(current)) {
      current.close();
      super.del(coord);
      this.fire({ event: "delete", coord, tile: current, map: this });
      this.create(coord, baseTileFor(current));
    }
    return current;
  }

  public create<
    T extends Tile,
    R extends TileInstance = ReturnType<T["create"]>
  >(coord: Coordinate, tile: T): R {
    const tileInstance = tile.create(coord) as R;
    if (!this.set(coord, tileInstance)) {
      throw new Error("could not create tile at coordinate");
    }
    return tileInstance;
  }

  public dimensions(
    tileWidth: TileAxis,
    tileHeight: TileAxis,
  ): [number, number] {
    const lastColumn = this.columns();
    const lastRow = this.rows();
    const lastCoordinate = Coordinate.fromOffset(lastColumn, lastRow);

    const [wx, wy] = Coordinate.toWorld(lastCoordinate, tileWidth, tileHeight);
    return [
      wx + tileWidth,
      wy +
        tileHeight +
        // if more than one column (usually) and even column, add the odd column offset
        (lastColumn > 0 && ~lastColumn & 1 ? Math.round(tileHeight / 2) : 0),
    ];
  }

  public close() {
    Observable.prototype.close.bind(this)();
    this.forEach((tile) => tile.close());
  }
}

export interface MapView extends Observable<MapEvent> {}

// merge interfaces to get observable in scope
interface MapImplementation extends Map {}

// mix in the observable implementation
applyMixins(MapImplementation, [Observable]);

export const createWorldMap = (): Map => new MapImplementation();
