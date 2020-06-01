import { Buildable } from "ts-essentials";
import { Good, Inventory } from "../core/Goods";
import { AllTiles, TileKey, tileKeys } from "../core/tiles";
import {
  assertStatefulTile,
  isConsuming,
  isProducing,
  isStatefulTile,
  StatefulTile,
  Tile,
} from "../core/tiles/Tile";
import { Pioneer } from "../core/tiles/Pioneer";

const relevantTiles = <G extends Good>(
  required: readonly G[],
  tiles: readonly Tile[] = tileKeys.map((key) => AllTiles[key]),
): StatefulTile<any, G, any>[] =>
  tiles
    // .filter((tile) => tile.available({ Pioneer: corePioneer }))
    .filter(<P extends Good>(tile: Tile<any>): tile is StatefulTile<
      any,
      P,
      any
    > => required.some((good) => isProducing(tile, good)));

const dependencies = tileKeys
  .map((key) => AllTiles[key])
  .reduce((dependencies, tile) => {
    if (isStatefulTile(tile)) {
      const required = Inventory.goods(tile.consumes);
      dependencies[tile.tag] = relevantTiles(required);
    } else {
      dependencies[tile.tag] = [];
    }
    return dependencies;
  }, {} as Buildable<Record<TileKey, Tile[]>>);

type Combination = Record<TileKey, number>;
type Combinations = [Good, number, Combination[]];
const allCombinations = <G extends Good>(
  good: G,
  amount: number,
  tiles?: readonly StatefulTile<TileKey, G, any>[],
): Combinations => {
  const relevant = relevantTiles([good], tiles);
  if (relevant.length === 0) {
    return [good, amount, []];
  }
  const singles = relevant.map((tile) =>
    Math.ceil(amount / tile.produces[good]),
  );
  if (singles.length === 1) {
    return [
      good,
      amount,
      [{ [relevant[0].tag]: singles[0] }] as Combinations[2],
    ] as Combinations;
  }
  const combinable = relevant.flatMap((tile, idx): readonly StatefulTile<
    TileKey,
    G,
    any
  >[] => Array(singles[idx]).fill(tile));
  const { ranges } = singles.reduce(
    ({ pos, ranges }: { pos: number; ranges: number[] }, single) => {
      const newPos = pos + single;
      const pattern = ((1 << (pos + single)) - 1) & ~((1 << pos) - 1);
      ranges.push(pattern);
      return { pos: newPos, ranges };
    },
    { pos: 0, ranges: [] },
  );
  console.assert(combinable.length < 32);
  const unique = new Set();
  const allIndexedSubsets = [];
  for (let rangeIdx = 0; rangeIdx < ranges.length - 1; rangeIdx++) {
    const start = ranges[rangeIdx];
    const stop = ranges[rangeIdx + 1] + 1;
    for (let counter = start; counter < stop; counter++) {
      const subset = [];
      let highwater = 0;
      for (
        let shifts = 0;
        shifts <= Math.ceil(Math.log2(counter + 1));
        shifts++
      ) {
        if ((counter & (1 << shifts)) > 0) {
          subset.push(combinable[shifts]);
          highwater += combinable[shifts].produces[good];
          if (highwater >= amount) {
            break;
          }
        }
      }
      if (subset.length === 0) {
        continue;
      }
      const key = subset.map((tile) => tile.tag).join(";");
      if (unique.has(key)) {
        continue;
      }
      unique.add(key);
      const yields = subset.reduce((acc, tile) => acc + tile.produces[good], 0);
      const valid =
        yields >= amount &&
        (subset.length === 1 ||
          relevant.every((tile) => yields - tile.produces[good] < amount));
      if (valid) {
        const indexed = subset.reduce((acc, tile) => {
          const tag: TileKey = tile.tag;
          if (acc[tag] != null) {
            acc[tag] += 1;
          } else {
            acc[tag] = 1;
          }
          return acc;
        }, {} as Combination);
        allIndexedSubsets.push(indexed);
      }
    }
  }
  return [good, amount, allIndexedSubsets];
};

type CombinationNode = [Tile, number, readonly Good[], CombinationNode[] | []];
type CombinationTree = [Good, number, CombinationNode[][] | []];
export const walkCombinations = (
  [cGood, amount, combinations] = allCombinations("Cloth", 300),
  ingredients: readonly Good[] = [cGood],
  seen: Set<TileKey> = new Set<TileKey>(),
): CombinationTree => {
  return [
    cGood,
    amount,
    combinations.flatMap((combination): CombinationNode[][] => {
      return (Object.keys(combination) as TileKey[])
        .filter((key) => key !== "Warehouse")
        .map((key): CombinationNode[] => {
          console.assert(!seen.has(key));
          const subSeen = new Set(seen);
          subSeen.add(key);
          const numInstances = combination[key];
          const tile = AllTiles[key];
          assertStatefulTile(tile);
          type Produces = typeof tile extends StatefulTile<any, any, infer P>
            ? P
            : never;
          const subIngredientAlternatives = [tile.formula[cGood as Produces]]
            .flat()
            .map((formula) =>
              Inventory.goods<typeof formula[Produces]>(
                formula as typeof formula[Produces],
              ).filter(
                // todo not sure yet
                (good: typeof formula[Produces]) =>
                  good !== "Money" && good !== "Nothing",
              ),
            );
          console.assert(
            subIngredientAlternatives.every((produces) =>
              produces.every((p) => relevantTiles([p]).length > 0),
            ),
            "nothing produces:" +
              JSON.stringify(
                subIngredientAlternatives
                  .filter((produces) => relevantTiles(produces).length === 0)
                  .flat(2),
              ),
          );
          return subIngredientAlternatives.map((subIngredients) => [
            tile,
            numInstances,
            ingredients,
            subIngredients.flatMap((good): CombinationNode[] =>
              walkCombinations(
                allCombinations(good, numInstances * tile.consumes[good]),
                [...ingredients, ...subIngredients],
                subSeen,
              )[2].flat(),
            ),
          ]);
        });
    }),
  ];
};
const combinationTree = (
  good: Good,
  amount: number,
  tiles?: readonly StatefulTile<TileKey, any, any>[],
): CombinationTree => walkCombinations(allCombinations(good, amount, tiles));

type NodeList = [Tile, number, readonly Good[]][];
type List = [Good, number, NodeList[]];
const listTree = ([good, amount, alternatives]: CombinationTree): List => {
  if (alternatives.length === 0) {
    return [good, amount, []];
  }
  const acc: NodeList[] = [];
  for (const alternative of alternatives) {
    // const alternativeAcc: NodeList = alternative.map(
    //   ([tile, number, ingredients]) => [tile, number, ingredients],
    // );
    for (const [tile, number, ingredients, subTree] of alternative) {
      const combinationInfo: NodeList[0] = [tile, number, ingredients];
      const subLists = listTree([good, amount, [subTree]])[2];
      if (subLists.length === 0) {
        acc.push([combinationInfo]);
      } else {
        subLists.forEach((subList) => {
          acc.push([combinationInfo, ...subList]);
        });
      }
    }
  }
  return [good, amount, acc];
};

const turnsInto = <G extends Good>(good: G): Good[] =>
  tileKeys
    .map((key) => AllTiles[key])
    .filter((tile): tile is StatefulTile<any, G, any> =>
      isConsuming(tile, good),
    )
    .flatMap((tile) =>
      (Object.keys(
        tile.formula,
      ) as keyof typeof tile.formula).filter((produces: Good) =>
        [tile.formula[produces]]
          .flat()
          .some((ingredients) => good in ingredients),
      ),
    );

const mergeLists = (
  [goodA, , alternativesA]: List,
  [goodB, , alternativesB]: List,
): NodeList[] => {
  if (alternativesA.length === 0) {
    return alternativesB;
  } else if (alternativesB.length === 0) {
    return alternativesA;
  }
  const indexedAs: Record<TileKey, [number, Good[]]>[] = alternativesA.map(
    (alternativeA) =>
      Object.fromEntries(
        alternativeA.map(([tile, amount, ingredients]) => [
          tile.tag,
          [amount, ingredients],
        ]),
      ) as Record<TileKey, [number, Good[]]>,
  );
  const keysAs = indexedAs
    .map<TileKey[]>(Object.keys as (obj: unknown) => TileKey[])
    .map((keys: TileKey[]) => new Set<TileKey>(keys)) as Set<TileKey>[];

  const indexedBs: Record<TileKey, [number, Good[]]>[] = alternativesB.map(
    (alternativeB) =>
      Object.fromEntries(
        alternativeB.map(([tile, amount, ingredients]) => [
          tile.tag,
          [amount, ingredients],
        ]),
      ) as Record<TileKey, [number, Good[]]>,
  );
  const keysBs = indexedBs
    .map<TileKey[]>(Object.keys as (obj: unknown) => TileKey[])
    .map((keys: TileKey[]) => new Set<TileKey>(keys)) as Set<TileKey>[];

  const newAlternatives: NodeList[] = [];
  alternativesA.forEach((alternativeA, aIdx) => {
    const indexedA = indexedAs[aIdx];
    const keysA = keysAs[aIdx];
    alternativesB.forEach((alternativeB, bIdx) => {
      const newAlternative: NodeList = [];
      const indexedB = indexedBs[bIdx];
      const keysB = keysBs[bIdx];
      const allKeys = new Set<TileKey>([...keysA, ...keysB]);
      allKeys.forEach((key: TileKey) => {
        const a = indexedA[key];
        const b = indexedB[key];
        const tile = AllTiles[key];
        if (keysA.has(key) && !keysB.has(key)) {
          newAlternative.push([tile, a[0], a[1]]);
        } else if (!keysA.has(key) && keysB.has(key)) {
          newAlternative.push([tile, b[0], b[1]]);
        } else {
          console.assert(
            keysA.has(key) && keysB.has(key),
            "is present in both",
          );

          const mergedIngredients = [...new Set([...a[1], ...b[1]])];
          console.log(
            "check",
            tile.tag,
            goodA,
            JSON.stringify(a[1]),
            goodB,
            JSON.stringify(b[1]),
            a[1].some((good) => b[1].includes(good)),
          );
          const overlap = a[1]
            .filter((good) => b[1].includes(good))
            .filter((overlappingGood) => {
              const directGoods = new Set(turnsInto(overlappingGood));
              const aDirects = new Set(
                a[1].filter((good) => directGoods.has(good)),
              );
              const bDirects = new Set(
                b[1].filter((good) => directGoods.has(good)),
              );
              if (aDirects.size === bDirects.size) {
                for (const aDirect of aDirects) {
                  if (!bDirects.has(aDirect)) {
                    return false;
                  }
                }
                return true;
              }
              return false;
            });
          if (overlap.length > 0) {
            // resource is used by both: add instances counts
            newAlternative.push([tile, a[0] + b[0], mergedIngredients]);
          } else {
            // tile is shared but for different resource: just use max
            newAlternative.push([
              tile,
              Math.max(a[0], b[0]),
              mergedIngredients,
            ]);
          }
        }
      });
      newAlternatives.push(newAlternative);
    });
  });
  return newAlternatives;
};

type ProductionChain = Good[];
const chains = (
  good: Good,
  subChains: Record<Good, ProductionChain[] | null> = {} as Record<
    Good,
    ProductionChain[]
  >,
): ProductionChain[] => {
  console.assert(!(good in subChains), "no cycles!");
  const producing = relevantTiles([good]);
  subChains[good] = null;
  subChains[good] = producing.flatMap((producingTile): ProductionChain[] => {
    const formulas = [producingTile.formula[good]].flat();
    return formulas.flatMap((formula): Good[][] => {
      const formulaGoods = Inventory.goods(formula, true);
      if (formulaGoods.length <= 1 && !formulaGoods.includes("Money")) {
        return [[good]];
      }
      const dependsOn = formulaGoods
        // Money is to general, only interested in actual products
        .filter((good) => good !== "Money");
      return dependsOn.flatMap((dependsOnGood): ProductionChain[] => {
        console.assert(dependsOnGood !== good, "no cycles!");
        if (!(dependsOnGood in subChains)) {
          chains(dependsOnGood, subChains);
        }
        return (subChains[dependsOnGood] ?? []).map((chain) => [
          good,
          ...chain,
        ]);
      });
    });
  });
  console.assert(subChains[good] != null, "move to calculated state");
  return subChains[good] ?? [];
};

type ChainIntersection = readonly Good[];
const chainsIntersection = (
  chainsA: ProductionChain[],
  chainsB: ProductionChain[],
): ChainIntersection[] =>
  chainsA
    .map((chainA) => new Set<Good>(chainA))
    .flatMap((chainASet): ChainIntersection[] =>
      chainsB.map(
        (chainB): ChainIntersection =>
          chainB.filter((goodB) => chainASet.has(goodB)),
      ),
    );

const usedByAllChains = (
  tileKey: TileKey,
  chainIntersections: readonly ChainIntersection[],
): boolean =>
  chainIntersections.every((chainIntersection) =>
    relevantTiles(chainIntersection)
      .map((tile) => tile.tag)
      .includes(tileKey),
  );

const toString = (
  [good, amount, combinations]: CombinationTree,
  indent: number = 0,
): string => {
  let str = "";
  const indentStr =
    indent === 0
      ? ""
      : Array(indent)
          .fill("|--")
          .join("") + "> ";
  combinations.forEach((combination) => {
    combination.forEach(([tile, num, ingredients, subCombinations]) => {
      str += `${indentStr}${tile.tag}: ${num}${
        indent === 0
          ? ` (@${amount}x${good} for ${JSON.stringify(ingredients)})`
          : ""
      }\n`;
      str += toString([good, amount, [subCombinations]], indent + 1);
    });
    if (combinations.length > 1) {
      str += `${indentStr}===\n`;
    }
  });
  return str;
};

const listToString = ([, , list]: List): string =>
  list
    .flatMap((variant) => {
      const finalInventory = variant.reduce((acc, [tile, instances]) => {
        if (isStatefulTile(tile)) {
          Inventory.forEach((value, good) => {
            acc[good] != null
              ? (acc[good]! += instances * value)
              : (acc[good] = value);
          }, tile.produces);
          Inventory.forEach((value, good) => {
            acc[good] != null
              ? (acc[good]! -= instances * value)
              : (acc[good] = value);
          }, tile.consumes);
        }
        return acc;
      }, {} as Buildable<Inventory<Good>>);
      return [
        Inventory.goods(finalInventory)
          .map((good) => `${finalInventory[good]} x ${good}`)
          .join(", "),
        "\n",
        variant
          .map(([tile, instances]) => `${instances} x ${tile.tag}`)
          .join("\n"),
      ];
    })
    .join("\n\nor\n\n");

export const run = () => {
  const numPioneers = 16;
  const pioneer: Inventory<
    keyof Pioneer["consumes"],
    CombinationTree
  > = Inventory.map(
    (amount, good) => combinationTree(good, numPioneers * amount),
    Pioneer.consumes,
  );
  // const foodChains = chains("Food");
  // const leatherChains = chains("Leather");
  // console.log(foodChains, leatherChains);
  // const intersections = chainsIntersection(foodChains, leatherChains);
  // console.log(intersections, usedByAllChains("Hunter", intersections));

  // const treeA = pioneer.Food;
  // const treeB = pioneer.Leather;
  // console.log(treeA, listTree(treeA), listToString(listTree(treeA)));
  // console.log(treeB, listToString(listTree(treeB)));
  // console.log(
  //   "merged",
  //   listToString(["Nothing", 0, mergeLists(listTree(treeA), listTree(treeB))]),
  // );
  const pioneerLists = Inventory.map(listTree, pioneer);
  const fullList = Inventory.reduce<
    keyof Pioneer["consumes"],
    NodeList[],
    List
  >(
    (acc, list, good) => {
      acc = mergeLists(["Nothing", 0, acc], list);
      return acc;
    },
    [],
    pioneerLists,
  );
  console.log(fullList, listToString(["Nothing", 0, fullList]));
};
