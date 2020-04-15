import { StandardTickingInstance } from "./TickingInstance";
import { Warehouse as WarehouseTile } from "./WarehouseInternal";

export * from "./WarehouseInternal";

export type Warehouse = WarehouseTile;

export const Warehouse: Warehouse = {
  ...WarehouseTile,

  create: (coord) => new WarehouseInstance(coord),
};

class WarehouseInstance extends StandardTickingInstance(Warehouse) {}
