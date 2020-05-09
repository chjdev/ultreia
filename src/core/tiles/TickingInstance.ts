import { Tick } from "../Tick";
import { Coordinate } from "../Coordinate";
import { RemoveListener } from "../Observable";
import { useClockView, useMapView } from "../MatchContext";
import { TileKey } from "./index";
import { CostGood, Good, Inventory, InventoryView } from "../Goods";
import {
  isProducing,
  isTileInstance,
  StandardTile,
  StandardTileInstance,
  StatefulTile,
  StatefulTileInstance,
  TileInstance,
} from "./Tile";
import { Constructor1 } from "../../utils";
import { MapView } from "../WorldMap";
import { Territory } from "../Territory";
import { isWarehouse } from "./checkers";

/**
 * Helper method to progress (or "Tick") a stateful tile instance.
 * Will look at all the tiles within its influence and consume/produce goods
 * according to its formula.
 *
 * @param instance the stateful tile instance to auto tick
 * @param map (optional) auto tick on which map? (default: from match context)
 */
export const autoTick = <T extends TileKey, C extends Good, P extends Good>(
  instance: StatefulTileInstance<T, C, P>,
  map: MapView = useMapView(),
) => {
  // produce as much goods as possible with the state (after consumption)
  if (!Inventory.isNothing(instance.tile.produces)) {
    const instanceState = instance.state as Inventory<C | P>;
    while (
      Inventory.reduce(
        (stillProducing, value, good: P) => {
          if (instanceState[good] < value) {
            const formula = instance.tile.formula[good];
            const formulas = formula instanceof Array ? formula : [formula];
            return formulas.reduce((stillProducing, formula) => {
              if (
                Inventory.isNothing(formula) ||
                Inventory.every(
                  (value, good: C) => instanceState[good] >= value,
                  formula,
                )
              ) {
                if (!Inventory.isNothing(formula)) {
                  Inventory.forEach((value, good: C) => {
                    instanceState[good] -= value;
                  }, formula);
                }
                instanceState[good] += Number(
                  (
                    instance.tile.baseProductivity(instance.coordinate) *
                    instance.tile.productivity(instance)
                  ).toPrecision(2),
                );
                return true;
              }
              return stillProducing || false;
            }, stillProducing);
          }
          return stillProducing || false;
        },
        false,
        instance.tile.produces,
      )
    );
  }

  // assemble all reachable, i.e. within its influence and connected, tiles
  const reachableTiles: readonly TileInstance[] = instance.tile
    .influence(instance.coordinate)
    .map((coord) => map.get(coord))
    .filter(
      (tileInstance): tileInstance is TileInstance =>
        tileInstance != null &&
        map.roadNetwork.isConnected(
          instance.coordinate,
          tileInstance.coordinate,
        ),
    );

  // get all the goods that are not topped up in the tile instance
  if (!Inventory.isNothing(instance.tile.consumes)) {
    type UnfilledGoods = Partial<InventoryView<C>>;
    const unfilledGoods: UnfilledGoods = Inventory.filter(
      (value, good: C) => (instance.state as InventoryView<C>)[good] < value,
      instance.tile.consumes,
    );

    // consumption closure: takes the amount from "from" and adds it to "instance"
    const consume = (amount: number, good: C) => (
      from: TileInstance | Territory,
    ): void => {
      if (
        (!isTileInstance(from) ||
          isProducing(from, good) ||
          isWarehouse(from)) &&
        good in from.state
      ) {
        const instanceState: UnfilledGoods = instance.state as UnfilledGoods;
        const fromState: UnfilledGoods = from.state;
        const instanceGood: number | undefined = instanceState[good];
        const fromGood: number | undefined = fromState[good];
        if (instanceGood == null || fromGood == null) {
          return;
        }
        const diff = amount - instanceGood;
        if (diff > fromGood) {
          instanceState[good] = instanceGood + fromGood;
          fromState[good] = 0;
        } else {
          instanceState[good] = instanceGood + diff;
          fromState[good] = fromGood - diff;
        }
      }
    };

    // consume as much missing goods as possible
    // money is a special case:
    //   money is only handed out by and delivered to warehouses
    //   hand outs don't need a road deliveries however do
    Inventory.forEach((amount: number, good: C) => {
      const consumeAmountGood = consume(amount, good);
      if (good === "Money" && !isWarehouse(instance)) {
        const territory = Territory.from(instance);
        if (territory) {
          consumeAmountGood(territory);
        }
      } else {
        reachableTiles.forEach((from: TileInstance) => consumeAmountGood(from));
      }
    }, unfilledGoods);
  }
};

// todo can't seem to combine them even though they should be able to
/**
 * Create a ticking standard tile instance, i.e. listen for the global clock
 * and perform the `tick` function.
 *
 * @param tile a standard tile
 * @param auto (optional) use generic auto tick (default: true)
 * @returns a ticking standard tile instance base class
 */
export function StandardTickingInstance<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good,
  Costs extends CostGood | "Nothing"
>(
  tile: StandardTile<T, Consumes, Produces, Costs>,
  auto: boolean = true,
): Constructor1<
  Coordinate,
  StandardTileInstance<T, Consumes, Produces, Costs> & Tick
> {
  return class extends StandardTileInstance(tile) implements Tick {
    private readonly removeTicker: RemoveListener;

    public constructor(coordinate: Coordinate) {
      super(coordinate);
      this.removeTicker = useClockView().listenTick(this);
    }

    public close() {
      this.removeTicker();
    }

    public tick(): void {
      if (auto) {
        autoTick(this);
      }
    }
  };
}

/**
 * Create a ticking stateful tile instance, i.e. listen for the global clock
 * and perform the `tick` function.
 *
 * @param tile a standard tile
 * @param auto (optional) use generic auto tick (default: true)
 * @returns a ticking stateful tile instance base class
 */
export function StatefulTickingInstance<
  T extends TileKey,
  Consumes extends Good,
  Produces extends Good
>(
  tile: StatefulTile<T, Consumes, Produces>,
  auto: boolean = true,
): Constructor1<
  Coordinate,
  StatefulTileInstance<T, Consumes, Produces> & Tick
> {
  return class extends StatefulTileInstance(tile) implements Tick {
    private readonly removeTicker: RemoveListener;

    public constructor(coordinate: Coordinate) {
      super(coordinate);
      this.removeTicker = useClockView().listenTick(this);
    }

    public close() {
      this.removeTicker();
    }

    public tick(): void {
      if (auto) {
        autoTick(this);
      }
    }
  };
}
