import { AllTiles, TileKey, tileKeys } from "../core/tiles";
import {
  assertStatefulTile,
  isConstructableTile,
  isStatefulTile,
  StatefulTile,
} from "../core/tiles/Tile";
import { Good, Inventory, InventoryView } from "../core/Goods";
import { isWarehouse } from "../core/tiles/checkers";

const StatefulTiles = tileKeys
  .map((key) => AllTiles[key])
  .filter(isStatefulTile)
  .filter((tile) => !isWarehouse(tile));
const LeafTiles = StatefulTiles.filter(
  (tile) =>
    (Inventory.isNothing(tile.consumes) ||
      Inventory.every((_, good) => good === "Money", tile.consumes)) &&
    !Inventory.isNothing(tile.produces) &&
    (!isConstructableTile(tile) || tile.prerequisite == null),
);

function notMoney(good: string): good is Exclude<Good, "Money">;
function notMoney<G extends Good>(good: G): good is Exclude<G, "Money"> {
  return good !== "Money";
}

type Input = Exclude<Good, "Money" | "Nothing">;
const inputs = (tile: StatefulTile<any, any, any>): Input[][] => {
  const produces = Object.keys(tile.formula) as Good[];
  return produces.flatMap((good): Input[][] => {
    const formulas = [tile.formula[good]].flat();
    return formulas.map(
      (formula): Input[] => Object.keys(formula).filter(notMoney) as Input[],
    );
  });
};

const relevantInputs = (
  inputs: readonly Input[][],
  goods: readonly Input[],
): Input[][] =>
  inputs.filter(
    (input) => input.length > 0 && input.every((good) => goods.includes(good)),
  );

// type Combination = Record<TileKey, number>;
// type Combinations = [Good, number, Combination[]];
// const allCombinations = <G extends Good>(
//   good: G,
//   amount: number,
//   tiles?: readonly StatefulTile<TileKey, G, any>[],
// ): Combinations => {
//   const relevant = relevantTiles([good], tiles);
//   if (relevant.length === 0) {
//     return [good, amount, []];
//   }
//   const singles = relevant.map((tile) =>
//     Math.ceil(amount / tile.produces[good]),
//   );
//   if (singles.length === 1) {
//     return [
//       good,
//       amount,
//       [{ [relevant[0].tag]: singles[0] }] as Combinations[2],
//     ] as Combinations;
//   }
//   const combinable = relevant.flatMap((tile, idx): readonly StatefulTile<
//     TileKey,
//     G,
//     any
//   >[] => Array(singles[idx]).fill(tile));
//   const { ranges } = singles.reduce(
//     ({ pos, ranges }: { pos: number; ranges: number[] }, single) => {
//       const newPos = pos + single;
//       const pattern = ((1 << (pos + single)) - 1) & ~((1 << pos) - 1);
//       ranges.push(pattern);
//       return { pos: newPos, ranges };
//     },
//     { pos: 0, ranges: [] },
//   );
//   console.assert(combinable.length < 32);
//   const unique = new Set();
//   const allIndexedSubsets = [];
//   for (let rangeIdx = 0; rangeIdx < ranges.length - 1; rangeIdx++) {
//     const start = ranges[rangeIdx];
//     const stop = ranges[rangeIdx + 1] + 1;
//     for (let counter = start; counter < stop; counter++) {
//       const subset = [];
//       let highwater = 0;
//       for (
//         let shifts = 0;
//         shifts <= Math.ceil(Math.log2(counter + 1));
//         shifts++
//       ) {
//         if ((counter & (1 << shifts)) > 0) {
//           subset.push(combinable[shifts]);
//           highwater += combinable[shifts].produces[good];
//           if (highwater >= amount) {
//             break;
//           }
//         }
//       }
//       if (subset.length === 0) {
//         continue;
//       }
//       const key = subset.map((tile) => tile.tag).join(";");
//       if (unique.has(key)) {
//         continue;
//       }
//       unique.add(key);
//       const yields = subset.reduce((acc, tile) => acc + tile.produces[good], 0);
//       const valid =
//         yields >= amount &&
//         (subset.length === 1 ||
//           relevant.every((tile) => yields - tile.produces[good] < amount));
//       if (valid) {
//         const indexed = subset.reduce((acc, tile) => {
//           const tag: TileKey = tile.tag;
//           if (acc[tag] != null) {
//             acc[tag] += 1;
//           } else {
//             acc[tag] = 1;
//           }
//           return acc;
//         }, {} as Combination);
//         allIndexedSubsets.push(indexed);
//       }
//     }
//   }
//   return [good, amount, allIndexedSubsets];
// };

type Level = Record<TileKey, number>;
const next = (
  level: Level,
  inventory: InventoryView = {} as InventoryView,
  possibleTiles: readonly StatefulTile<any, any, any>[] = StatefulTiles,
): Level[] => {
  const levelInventory = Inventory.plus(
    (Object.keys(level) as TileKey[]).reduce((inventory, key: TileKey) => {
      const tile = AllTiles[key] as StatefulTile<any, Good, Good>;
      assertStatefulTile(tile);
      Inventory.forEach(
        (amount, good: Exclude<Good, "Nothing">) => {
          inventory[good] != null
            ? (inventory[good]! += level[key] * amount)
            : (inventory[good] = level[key] * amount);
        },
        tile.produces,
        true,
      );
      return inventory;
    }, {} as Partial<Inventory>) as Inventory<Exclude<Good, "Nothing">>,
    inventory,
  ) as Inventory<Exclude<Good, "Nothing">>;
  const levelInventoryGoods = Inventory.goods(levelInventory, true).filter(
    (good) => good !== "Money",
  ) as Input[];
  // some formula where every good is present
  const nextLevelTiles = possibleTiles
    .filter(
      (tile) =>
        isConstructableTile(tile) &&
        Inventory.every(
          (amount: number, good) => (levelInventory[good] ?? 0) >= amount,
          (tile.prerequisite ?? {}) as InventoryView,
        ),
    )
    .filter(
      (tile) => relevantInputs(inputs(tile), levelInventoryGoods).length > 0,
    );

  const uncontestedNextTiles = nextLevelTiles.filter((tile) =>
    relevantInputs(inputs(tile), levelInventoryGoods).every((input) =>
      nextLevelTiles
        .filter((otherTile) => tile.tag !== otherTile.tag)
        .every((otherTile) =>
          inputs(otherTile).every((otherInput) =>
            input.every((good) => !otherInput.includes(good)),
          ),
        ),
    ),
  );
  const uncontestedKeys = new Set<TileKey>(
    uncontestedNextTiles.map((tile) => tile.tag),
  );
  // todo ?? other inputs which supports more instances and let one run dry??
  const uncontestedNextLevel: Level = uncontestedNextTiles.reduce(
    (obj, tile: StatefulTile<TileKey, any, any>) => {
      const supports = Math.min(
        ...relevantInputs(
          inputs(tile),
          levelInventoryGoods,
        ).map((input): number =>
          Math.min(
            ...input.map((good): number =>
              Math.floor(
                (levelInventory[
                  good as keyof typeof levelInventory
                ] as number) / tile.consumes[good],
              ),
            ),
          ),
        ),
      );
      obj[tile.tag] = supports;
      return obj;
    },
    {} as Level,
  );

  // modify levelinventory to reflect with uncontested tiles influence
  (Object.keys(uncontestedNextLevel) as TileKey[])
    .map((tileKey) => AllTiles[tileKey] as StatefulTile<any, any, any>)
    .forEach((tile) => {
      const numInstances =
        uncontestedNextLevel[tile.tag as keyof typeof uncontestedNextLevel];
      Inventory.forEach((amount, good) => {
        if (good in levelInventory) {
          levelInventory[good as keyof typeof levelInventory] -=
            numInstances * amount;
          if (levelInventory[good as keyof typeof levelInventory] <= 0) {
            delete levelInventory[good as keyof typeof levelInventory];
          }
        }
      }, tile.consumes);
    }, uncontestedNextLevel);

  const contestedNextLevelTiles = nextLevelTiles.filter(
    (tile) => !uncontestedKeys.has(tile.tag),
  );

  if (contestedNextLevelTiles.length === 0) {
    if (Object.keys(uncontestedNextLevel).length > 0) {
      return [uncontestedNextLevel];
    } else {
      return [];
    }
  } else {
    const alternatives: Level[] = [];
    const allGoods = new Set<Input>();
    const contestedGoods = new Set<Input>();
    contestedNextLevelTiles.forEach((tile) => {
      const tileInputs = relevantInputs(inputs(tile), levelInventoryGoods);
      tileInputs.forEach((tileInput) =>
        tileInput.forEach((input) => {
          if (allGoods.has(input)) {
            contestedGoods.add(input);
          } else {
            allGoods.add(input);
          }
        }),
      );
    });

    // todo start with first, rest is recursion!
    const tile = contestedNextLevelTiles[0];
    const tileInputs = relevantInputs(inputs(tile), levelInventoryGoods);
    const uncontestedTileInputs: Input[][] = [];
    const contestedTileInputs: Input[][] = [];
    for (const tileInput of tileInputs) {
      if (!tileInput.some((good) => contestedGoods.has(good))) {
        uncontestedTileInputs.push(tileInput);
      } else {
        contestedTileInputs.push(tileInput);
      }
    }
    // build up uncontested alternatives, this is a small optimization as not to recompute the downstream tile combinations on no inventory change
    const numUncontestedInstances = Math.max(
      ...uncontestedTileInputs.map((tileInput) =>
        Math.max(
          ...tileInput.map(
            (good) => Math.floor(levelInventory[good] / tile.consumes[good]), // ? added division
          ),
        ),
      ),
    );

    // calc downstream
    const downstreamPossibleTiles = possibleTiles.filter(
      (downstreamTile) => tile.tag !== downstreamTile.tag,
    );

    // combine uncontested with downstream combinations
    // added >=
    if (numUncontestedInstances >= 0) {
      const downstreamSubLevelInventory = { ...levelInventory };
      const uncontestedTileGoods = new Set(
        uncontestedTileInputs.flatMap((uncontestedTileInput) =>
          uncontestedTileInput.map((good) => good),
        ),
      );
      for (const uncontestedTileGood of uncontestedTileGoods) {
        downstreamSubLevelInventory[uncontestedTileGood] -=
          numUncontestedInstances * tile.consumes[uncontestedTileGood];
        if (downstreamSubLevelInventory[uncontestedTileGood] <= 0) {
          delete downstreamSubLevelInventory[uncontestedTileGood];
        }
      }
      // build downstream combinations based on downstreamSubLevelInventory
      const downstreamAlternatives: Level[] = next(
        {} as Level,
        downstreamSubLevelInventory,
        downstreamPossibleTiles,
      );
      // add the alternative
      if (downstreamAlternatives.length === 0) {
        alternatives.push({ [tile.tag]: numUncontestedInstances } as Record<
          TileKey,
          number
        >);
      } else {
        alternatives.push(
          ...downstreamAlternatives.map((downStreamAlternative) => ({
            // add the parent (this tile) to the downstream alternatives
            [tile.tag]: numUncontestedInstances,
            ...downStreamAlternative,
          })),
        );
      }
    }

    // build up contested alternatives
    for (const contestedTileInput of contestedTileInputs) {
      const subLevelInventory = { ...levelInventory };
      const maxNumContestedInstances = Math.min(
        ...contestedTileInput.map((good) =>
          Math.floor(subLevelInventory[good] / tile.consumes[good]),
        ),
      );
      for (
        let numContestedInstances = 0;
        numContestedInstances <= maxNumContestedInstances;
        numContestedInstances++
      ) {
        const downstreamSubLevelInventory = { ...subLevelInventory };
        contestedTileInput.forEach((good) => {
          downstreamSubLevelInventory[good] -=
            numContestedInstances * tile.consumes[good];
          if (downstreamSubLevelInventory[good] <= 0) {
            delete downstreamSubLevelInventory[good];
          }
        });
        // build downstream combinations based on downstreamSubLevelInventory
        const downstreamAlternatives: Level[] = next(
          {} as Level,
          downstreamSubLevelInventory,
          downstreamPossibleTiles,
        );

        if (downstreamAlternatives.length === 0) {
          alternatives.push({
            [tile.tag]: numContestedInstances,
          } as Record<TileKey, number>);
        } else {
          // add the alternative
          alternatives.push(
            ...downstreamAlternatives.map((downStreamAlternative) => ({
              // add the parent (this tile) to the downstream alternatives
              [tile.tag]: numContestedInstances,
              ...downStreamAlternative,
            })),
          );
        }
      }
    }
    // merge in the uncontested ones
    return alternatives.map((alternative) => ({
      ...alternative,
      ...uncontestedNextLevel,
    }));
  }
};

export const build = () => {
  const level0: Level = Object.fromEntries(
    LeafTiles.map((tile) => [tile.tag, 12]),
  );
  console.log("wtf level0", JSON.stringify(level0));

  const level1 = next(level0);
  level1.forEach((level) => {
    console.log("wtf level1\t", JSON.stringify(level));
  });
  // todo this is wrong, needs to include inventory spill over from previous levels
  const level2 = level1.map((level) => next(level));
  level2.forEach((levels, idx) => {
    idx > 0 && console.log("wtf level2\t-OR-");
    levels.forEach((level) => {
      console.log("wtf level2\t\t", JSON.stringify(level));
    });
  });
};
