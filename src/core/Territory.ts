import { isWarehouseGood, Warehouse } from "./tiles/WarehouseInternal";
import {
  isProducing,
  StatefulTileInstance,
  TileInstance,
  TileInstanceFor,
} from "./tiles/Tile";
import { MapEvent, MapView } from "./WorldMap";
import { Coordinate, CoordinateIndexed } from "./Coordinate";
import { RemoveListener } from "./Observable";
import { useMapView } from "./MatchContext";
import { isWarehouse } from "./tiles/checkers";
import { Inventory } from "./Goods";

type WarehouseInstanceView = Readonly<TileInstanceFor<Warehouse>>;

export interface Territory {
  readonly state: Inventory;

  warehouses(): WarehouseInstanceView[];

  has(warehouse: WarehouseInstanceView): boolean;

  influence(): Coordinate[];
  forEach(fun: (coord: Coordinate) => void): void;
  map<U>(fun: (coord: Coordinate) => U): U[];
  reduce<R>(fun: (acc: R, coord: Coordinate) => R, zero: R): R;
  filter(fun: (coord: Coordinate) => boolean): Coordinate[];
}

export abstract class Territory implements Territory {
  public influence(): Coordinate[] {
    const coordSet = new Set<Coordinate.Hash>();
    return this.warehouses().flatMap((warehouse) => {
      const influence = Warehouse.influence(
        warehouse.coordinate,
      ).filter((coord) => coordSet.has(Coordinate.hashCode(coord)));
      influence
        .map(Coordinate.hashCode)
        .forEach((coord) => coordSet.add(coord));
      return influence;
    });
  }
  public forEach(fun: (coord: Coordinate) => void): void {
    this.influence().forEach(fun);
  }
  public map<U>(fun: (coord: Coordinate) => U): U[] {
    return this.influence().map(fun);
  }
  public reduce<R>(fun: (acc: R, coord: Coordinate) => R, zero: R): R {
    return this.influence().reduce(fun, zero);
  }
  public filter(fun: (coord: Coordinate) => boolean): Coordinate[] {
    return this.influence().filter(fun);
  }
  private current(good: keyof Inventory): number {
    if (isWarehouseGood(good)) {
      return this.warehouses().reduce(
        (acc: number, warehouse: WarehouseInstanceView) => {
          acc += warehouse.state[good];
          return acc;
        },
        0,
      );
    } else {
      return this.map((coord) => useMapView().get(coord))
        .filter(
          (instance): instance is StatefulTileInstance<any, typeof good, any> =>
            instance != null && isProducing(instance, good),
        )
        .reduce((sum, instance) => sum + instance.state[good], 0);
    }
  }

  public readonly state = new Proxy(
    // we're not working on an object
    ({} as any) as Inventory,
    {
      get: (_: Inventory, good: keyof Inventory) => this.current(good),
      set: (_: Inventory, good: keyof Inventory, value: number): boolean => {
        const current = this.current(good);
        let difference = Math.abs(current - value);
        if (difference === 0) {
          return true;
        }
        const isSubtract = current - value > 0;
        const instances = (isWarehouseGood(good)
          ? this.warehouses()
          : this.map((coord) => useMapView().get(coord)).filter(
              (
                instance,
              ): instance is StatefulTileInstance<any, typeof good, any> =>
                instance != null && isProducing(instance, good),
            )) as readonly StatefulTileInstance<any, keyof Inventory, any>[];
        for (const instance of instances) {
          const warehouseValue = instance.state[good];
          if (
            (isSubtract && warehouseValue <= 0) ||
            (!isSubtract && warehouseValue >= instance.tile.consumes[good])
          ) {
            continue;
          }
          if (isSubtract) {
            const fromWarehouse = Math.min(difference, warehouseValue);
            instance.state[good] -= fromWarehouse;
            difference -= fromWarehouse;
          } else {
            const room = instance.tile.consumes[good] - instance.state[good];
            const toWarehouse = Math.min(difference, room);
            instance.state[good] += toWarehouse;
            difference -= toWarehouse;
          }
          if (difference === 0) {
            // done
            return true;
          }
        }
        return false;
      },
    },
  );
}

export namespace Territory {
  export const findAllWarehouses = (
    coord: Coordinate,
  ): TileInstanceFor<Warehouse>[] =>
    Warehouse.influence(coord)
      .map((coord) => useMapView().get(coord))
      .filter(isWarehouse);

  export const findWarehouse = (
    coord: Coordinate,
  ): TileInstanceFor<Warehouse> | undefined =>
    Warehouse.influence(coord)
      .map((coord) => useMapView().get(coord))
      .find(isWarehouse);

  export const hasWarehouse = (coord: Coordinate): boolean =>
    !!findWarehouse(coord);

  const bfsWarehouses = (warehouse: WarehouseInstanceView) => {
    const warehouses: WarehouseInstanceView[] = [];
    const warehouseSet = new Set([warehouse]);
    let next = warehouse;
    while (next) {
      const reachableWarehouses = findAllWarehouses(next.coordinate);
      const unvisitedWarehouses = reachableWarehouses.filter(
        (warehouse: WarehouseInstanceView) => !warehouseSet.has(warehouse),
      );
      unvisitedWarehouses.forEach((warehouse: WarehouseInstanceView) =>
        warehouseSet.add(warehouse),
      );
      warehouses.push(...unvisitedWarehouses);
      next = warehouses.shift() as WarehouseInstanceView;
    }
    return warehouseSet;
  };

  class ReachableTerritory extends Territory {
    private readonly removeMapListener: RemoveListener;
    private warehouseSet: Set<WarehouseInstanceView>;

    private readonly manageWarehouses = ({ event, tile }: MapEvent) => {
      if (!isWarehouse(tile)) {
        return;
      }
      if (event === "delete" && this.warehouseSet.has(tile)) {
        this.warehouseSet.delete(tile);
      }
      if (this.warehouseSet.size > 0) {
        // todo inefficient
        this.warehouseSet = bfsWarehouses(
          this.warehouseSet.values().next().value,
        );
      }
    };

    public constructor(warehouse: WarehouseInstanceView) {
      super();
      this.warehouseSet = bfsWarehouses(warehouse);
      this.removeMapListener = useMapView().listen(
        this.manageWarehouses,
        MapEvent.all,
      );
    }

    public close(): void {
      this.removeMapListener();
    }

    public has(warehouse: WarehouseInstanceView) {
      return this.warehouseSet.has(warehouse);
    }

    public warehouses(): WarehouseInstanceView[] {
      return [...this.warehouseSet];
    }
  }

  export const from = (
    thing: WarehouseInstanceView | TileInstance | Coordinate,
  ): Territory | undefined => {
    let warehouse: WarehouseInstanceView | undefined;
    if (Coordinate.isCoordinate(thing)) {
      warehouse = findWarehouse(thing);
    } else {
      if (isWarehouse(thing)) {
        warehouse = thing;
      } else {
        warehouse = findWarehouse(thing.coordinate);
      }
    }
    if (warehouse == null) {
      return undefined;
    }
    return new ReachableTerritory(warehouse);
  };

  class GlobalTerritory extends Territory {
    private readonly removeMapListener: RemoveListener;
    private readonly indexedWarehouses: CoordinateIndexed<
      WarehouseInstanceView
    >;

    private readonly manageWarehouses = ({ event, coord, tile }: MapEvent) => {
      if (!isWarehouse(tile)) {
        return;
      }
      if (event === "delete") {
        this.indexedWarehouses.del(coord);
      } else {
        this.indexedWarehouses.set(coord, tile);
      }
    };

    public constructor(initialScan = true) {
      super();
      this.removeMapListener = useMapView().listen(
        this.manageWarehouses,
        MapEvent.all,
      );
      if (initialScan) {
        this.indexedWarehouses = useMapView().filter(isWarehouse);
      } else {
        this.indexedWarehouses = new CoordinateIndexed();
      }
    }

    public close(): void {
      this.removeMapListener();
    }

    public has(warehouse: WarehouseInstanceView): boolean {
      return this.indexedWarehouses.get(warehouse.coordinate) === warehouse;
    }

    public warehouses(): WarehouseInstanceView[] {
      return this.indexedWarehouses.values();
    }
  }

  let globalTerritoryInstance: {
    map: MapView;
    territory: GlobalTerritory;
  } | null = null;
  export const global = (): GlobalTerritory => {
    const map = useMapView();
    if (globalTerritoryInstance?.map !== map) {
      globalTerritoryInstance = {
        map,
        territory: new GlobalTerritory(),
      };
    }
    return globalTerritoryInstance.territory;
  };
}
