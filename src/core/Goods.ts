/**
 * Helper type that prevents overlapping of enums.
 *
 * @example
 * type A = "a" | "b";
 * type B = "b" | "c";
 * type C = "c" | "d";
 * NoOverlap<A, B>; // never
 * NoOverlap<A, C>; // A
 * NoOverlap<A, B | C>; // never
 */
type NoOverlap<T, U> = Extract<T, U> extends never ? T : never;

/**
 * Useful to debug duplicate keys. Instead of never will have the type of the offending keys
 *
 * @see NoOverlap
 */
type DebugNoOverlap<T, U> = Extract<T, U> extends never ? T : Extract<T, U>;

const enumKeys = (value: any): string[] =>
  Object.keys(value).filter((key) => isNaN(Number(key)));

enum _NaturalGood {
  CoalRepo,
  CopperOreRepo,
  FreshWater,
  GemStoneRepo,
  IronOreRepo,
  MarbleRepo,
  SaltRepo,
  SilverOreRepo,
  StoneRepo,
  Whale,
  WildFish,
}
export type NaturalGood = keyof typeof _NaturalGood;
export const NaturalGoods = enumKeys(_NaturalGood) as readonly NaturalGood[];

enum _BuildingMaterial {
  Tool,
  Wood,
  Marble,
  Brick,
  Stone,
  Bells,
  Engineer,
}
export type BuildingMaterial = NoOverlap<
  keyof typeof _BuildingMaterial,
  NaturalGood
>;
export const BuildingMaterials = enumKeys(
  _BuildingMaterial,
) as readonly BuildingMaterial[];

enum _HarvestableGood {
  Cattle,
  CocoaPlant,
  CottonPlant,
  Ears,
  FlowerPlant,
  Game,
  Grape,
  HempPlant,
  HopsPlant,
  IndigoPlant,
  PeltAnimal,
  PotatoPlant,
  Sheep,
  SilkWorm,
  SpicePlant,
  SugarCanePlant,
  TobaccoPlant,
  Tree,
  UntamedHorse,
}
export type HarvestableGood = NoOverlap<
  keyof typeof _HarvestableGood,
  BuildingMaterial | NaturalGood
>;
export const HarvestableGoods = enumKeys(
  _HarvestableGood,
) as readonly HarvestableGood[];

enum _ProductionGood {
  Alcohol,
  Amber,
  Beer,
  Bees,
  Book,
  Bread,
  BronzeBar,
  Ceramic,
  Clay,
  Cloth,
  Clothes,
  Coal,
  Cocoa,
  CopperBar,
  CopperOre,
  Cotton,
  Finery,
  Fish,
  Flour,
  Flowers,
  Food,
  GemStone,
  GoldBar,
  Wheat,
  GunPowder,
  Hemp,
  Honey,
  Hops,
  Horse,
  Indigo,
  Ink,
  Instrument,
  IronBar,
  IronOre,
  Jewellery,
  LampOil,
  Leather,
  Meat,
  Paper,
  Pelt,
  Perfume,
  Pigment,
  Porcelain,
  Potato,
  RawHide,
  Rope,
  Sails,
  Salt,
  Silk,
  SilverBar,
  SilverOre,
  Slag,
  Spices,
  Spirit,
  Sugar,
  SugarCane,
  TinBar,
  Tobacco,
  TobaccoLeaf,
  WhaleTallow,
  Wine,
  Wool,
}
export type ProductionGood = NoOverlap<
  keyof typeof _ProductionGood,
  HarvestableGood | BuildingMaterial | NaturalGood
>;
export const ProductionGoods = enumKeys(
  _ProductionGood,
) as readonly ProductionGood[];

enum _Weapon {
  Pike,
  Sword,
  Armor,
  Musket,
  Cannon,
  Mortar,
  WarHorse,
}
export type Weapon = NoOverlap<
  keyof typeof _Weapon,
  ProductionGood | HarvestableGood | BuildingMaterial | NaturalGood
>;
export const Weapons = enumKeys(_Weapon) as readonly Weapon[];

enum _ImmaterialGood {
  Culture,
  Education,
  Faith,
  Hygiene,
  Money,
  Prestige,
}
export type ImmaterialGood = NoOverlap<
  keyof typeof _ImmaterialGood,
  Weapon | ProductionGood | HarvestableGood | BuildingMaterial | NaturalGood
>;
export const ImmaterialGoods = enumKeys(
  _ImmaterialGood,
) as readonly ImmaterialGood[];

enum _Inhabitant {
  Pioneer,
  Settler,
  Citizen,
  Merchant,
  Aristocrat,
}
export type Inhabitant = NoOverlap<
  keyof typeof _Inhabitant,
  | ImmaterialGood
  | Weapon
  | ProductionGood
  | HarvestableGood
  | BuildingMaterial
  | NaturalGood
>;
export const Inhabitants = enumKeys(_Inhabitant) as readonly Inhabitant[];

export type Good =
  | BuildingMaterial
  | NaturalGood
  | HarvestableGood
  | ProductionGood
  | ImmaterialGood
  | Inhabitant
  | Weapon
  | "Nothing";
export const Goods: readonly Exclude<Good, "Nothing">[] = [
  ...NaturalGoods,
  ...BuildingMaterials,
  ...HarvestableGoods,
  ...ProductionGoods,
  ...Weapons,
  ...ImmaterialGoods,
  ...Inhabitants,
];

export type CostGood = BuildingMaterial | "Money";
export const CostGoods: readonly CostGood[] = [...BuildingMaterials, "Money"];

export type Inventory<
  G extends Good = Exclude<Good, "Nothing">,
  T = number
> = Record<G, T>;
export type InventoryView<
  G extends Good = Exclude<Good, "Nothing">,
  T = number
> = Readonly<Inventory<G, T>>;

export namespace Inventory {
  export const goods = <G extends Good, T = number>(
    inventory: Partial<InventoryView<G, T>>,
    excludeNothing: boolean = false,
  ): G[] => {
    const goods = Object.keys(inventory) as G[];
    if (excludeNothing) {
      return goods.filter((good) => good !== "Nothing");
    } else {
      return goods;
    }
  };

  export function forEach<
    G extends Good,
    T = number,
    _I extends InventoryView<G, T> | Partial<InventoryView<G, T>> =
      | InventoryView<G, T>
      | Partial<InventoryView<G, T>>
  >(
    fun: (value: T, good: G, inventory: _I) => void,
    inventory: _I,
    excludeNothing: boolean = false,
  ): void {
    goods(inventory, excludeNothing).forEach(
      (good: G) =>
        inventory.hasOwnProperty(good) &&
        fun(inventory[good] as T, good, inventory),
    );
  }

  export const map = <G extends Good, R = number, T = number>(
    fun: (value: T, good: G, inventory: InventoryView<G, T>) => R,
    inventory: InventoryView<G, T>,
  ): Inventory<G, R> =>
    (Object.fromEntries<R>(
      goods(inventory).map((good: G): [G, R] => [
        good,
        fun(inventory[good], good, inventory),
      ]),
      //double cast to get rid of number/symbol
    ) as Partial<Inventory<G, R>>) as Inventory<G, R>;

  export const reduce = <G extends Good, R = number, T = number>(
    fun: (acc: R, value: T, good: G, inventory: InventoryView<G, T>) => R,
    zero: R,
    inventory: InventoryView<G, T>,
  ): R =>
    goods(inventory).reduce(
      (acc, good: G) => fun(acc, inventory[good], good, inventory),
      zero,
    );

  export const filter = <G extends Good, T = number>(
    fun: (value: T, good: G, inventory: InventoryView<G, T>) => boolean,
    inventory: InventoryView<G, T>,
  ): Partial<Inventory<G, T>> =>
    Object.fromEntries<T>(
      goods(inventory)
        .filter((good: G) => fun(inventory[good], good, inventory))
        .map((good) => [good, inventory[good]]),
    );

  export const some = <G extends Good, R = number, T = number>(
    fun: (value: T, good: G, inventory: InventoryView<G, T>) => boolean,
    inventory: InventoryView<G, T>,
  ): boolean =>
    goods(inventory).some((good: G) => fun(inventory[good], good, inventory));

  export const every = <G extends Good, R = number, T = number>(
    fun: (value: T, good: G, inventory: InventoryView<G, T>) => boolean,
    inventory: InventoryView<G, T>,
  ): boolean =>
    !some((value, good, inventory) => !fun(value, good, inventory), inventory);

  export const subtract = <G1 extends Good, G2 extends Good, T1 = number>(
    inventory1: InventoryView<G1, T1>,
    inventory2: InventoryView<G2, unknown>,
  ): Inventory<Exclude<G1, G1 & G2>, T1> => {
    const goods2 = new Set<string>(goods(inventory2));
    return filter(
      (_, good1: G1) => !goods2.has(good1),
      inventory1,
    ) as Inventory<Exclude<G1, G1 & G2>, T1>;
  };

  export const union = <
    G1 extends Good,
    G2 extends Good,
    T1 = number,
    T2 = number
  >(
    inventory1: InventoryView<G1, T1>,
    inventory2: InventoryView<G2, T2>,
  ): Inventory<G1 | G2, T1 | T2> =>
    (Object.fromEntries<T1 | T2>(
      (goods(inventory1) as (G1 | G2)[])
        .concat(goods(inventory2))
        .map((good) => [
          good,
          good in inventory2 ? inventory2[good as G2] : inventory1[good as G1],
        ]),
    ) as Partial<Inventory<G1 | G2, T1 | T2>>) as Inventory<G1 | G2, T1 | T2>;

  export const plus = <G1 extends Good, G2 extends Good>(
    inventory1: InventoryView<G1, number>,
    inventory2: InventoryView<G2, number>,
  ): Inventory<G1 | G2, number> =>
    (Object.fromEntries<number>(
      (goods(inventory1) as (G1 | G2)[])
        .concat(goods(inventory2))
        .map((good) => [
          good,
          (inventory1[good as G1] ?? 0) + (inventory2[good as G2] ?? 0),
        ]),
    ) as Partial<Inventory<G1 | G2, number>>) as Inventory<G1 | G2, number>;

  export const minus = <G1 extends Good, G2 extends Good>(
    inventory1: InventoryView<G1, number>,
    inventory2: InventoryView<G2, number>,
  ): Inventory<G1 | G2, number> =>
    (Object.fromEntries<number>(
      (goods(inventory1) as (G1 | G2)[])
        .concat(goods(inventory2))
        .map((good) => [
          good,
          (inventory1[good as G1] ?? 0) - (inventory2[good as G2] ?? 0),
        ]),
    ) as Partial<Inventory<G1 | G2, number>>) as Inventory<G1 | G2, number>;

  export const difference = <
    G1 extends Good,
    G2 extends Good,
    T1 = number,
    T2 = number
  >(
    inventory1: InventoryView<G1, T1>,
    inventory2: InventoryView<G2, T2>,
  ): Inventory<Exclude<G1 | G2, G1 & G2>, T1 | T2> =>
    Inventory.union<Exclude<G1, G1 & G2>, Exclude<G2, G1 & G2>, T1, T2>(
      Inventory.subtract(inventory1, inventory2),
      Inventory.subtract(inventory2, inventory1),
    );

  export const NOTHING: InventoryView<"Nothing"> = { Nothing: 0 };

  export const isNothing = (
    value: InventoryView<any>,
  ): value is InventoryView<"Nothing"> =>
    value === NOTHING || Object.hasOwnProperty("Nothing");
}
