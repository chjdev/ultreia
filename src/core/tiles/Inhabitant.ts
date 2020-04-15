import { StandardTile } from "./Tile";
import { Good, CostGood, Inhabitant, InventoryView } from "../Goods";
import { TileKey } from "./index";

export interface InhabitantTile<
  T extends TileKey & Inhabitant,
  Requires extends Good,
  Wants extends Good,
  Produces extends "Money" | "Prestige",
  Costs extends CostGood,
  Upgrade extends Good
> extends StandardTile<T, Requires | Wants, Produces, Costs> {
  readonly requires: InventoryView<Requires>;
  readonly wants: InventoryView<Requires | Wants>;
  readonly upgrade: InventoryView<Upgrade>;
  readonly maxInhabitants: number;
}
