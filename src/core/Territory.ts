import { Warehouse } from "./tiles/WarehouseInternal";
import { InventoryFor, TileInstance, TileInstanceFor } from "./tiles/Tile";
import { MapEvent, MapView } from "./WorldMap";
import { Coordinate, CoordinateIndexed } from "./Coordinate";
import { RemoveListener } from "./Observable";
import { useMapView } from "./MatchContext";
import { isWarehouse } from "./tiles/checkers";

type WarehouseInstanceView = Readonly<TileInstanceFor<Warehouse>>;

export interface Territory {
  readonly state: InventoryFor<Warehouse>;

  warehouses(): WarehouseInstanceView[];

  has(warehouse: WarehouseInstanceView): boolean;
}

export abstract class Territory {
  private current(prop: keyof InventoryFor<Warehouse>): number {
    return this.warehouses().reduce(
      (acc: number, warehouse: WarehouseInstanceView) => {
        acc += warehouse.state[prop];
        return acc;
      },
      0,
    );
  }

  public readonly state = new Proxy(Warehouse.initialState, {
    get: (_: InventoryFor<Warehouse>, prop: keyof InventoryFor<Warehouse>) =>
      this.current(prop),
    set: (
      _: InventoryFor<Warehouse>,
      prop: keyof InventoryFor<Warehouse>,
      value: number,
    ): boolean => {
      let diff = this.current(prop) - value;
      if (diff === 0) {
        return true;
      }
      const warehouses = this.warehouses();
      let nextWarehouse = warehouses.pop();
      while (diff > 0 && nextWarehouse != null) {
        const state = nextWarehouse.state;
        if (state[prop] >= diff) {
          state[prop] -= diff;
          diff = 0;
        } else {
          diff -= state[prop];
          state[prop] = 0;
        }
        nextWarehouse = warehouses.pop();
      }
      //todo positive number constraint?
      console.assert(diff === 0, `state would go negative! ${prop} ${value}`);
      return diff === 0;
    },
  });
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
