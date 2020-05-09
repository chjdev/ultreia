import { Water } from "./Water";
import { Grass } from "./Grass";
import { Forest } from "./Forest";
import { Chapel } from "./Chapel";
import { Warehouse } from "./Warehouse";
import { Lumberjack } from "./Lumberjack";
import { Pioneer } from "./Pioneer";
import { SheepPasture } from "./SheepPasture";
import { SheepFarm } from "./SheepFarm";
import { Weaver } from "./Weaver";
import { MechanicalWeaver } from "./MechanicalWeaver";
import { PotatoField } from "./PotatoField";
import { PotatoFarm } from "./PotatoFarm";
import { FoodMarket } from "./FoodMarket";
import { Hunter } from "./Hunter";
import { Tanner } from "./Tanner";
import { Inn } from "./Inn";
import { Distillery } from "./Distillery";
import { Mountain } from "./Mountain";
import { Fisher } from "./Fisher";
import { FishSchool } from "./FishSchool";
import { Quarry } from "./Quarry";
import {
  ConstructableTile,
  isConstructableTile,
  isTileInstance,
  Tile,
  TileInstance,
} from "./Tile";

/**
 * Map of all constructable tiles.
 * Used recursively to ensure tag safety within the tiles.
 */
export const ConstructableTiles = {
  Forest,
  Lumberjack,
  Chapel,
  Warehouse,
  Pioneer,
  SheepPasture,
  SheepFarm,
  Weaver,
  MechanicalWeaver,
  PotatoField,
  PotatoFarm,
  FoodMarket,
  Hunter,
  Tanner,
  Inn,
  Distillery,
  Fisher,
  Quarry,
};
/**
 * `ConstructableTiles` is used as the canonical mapping of string (`ConstructableTileKey`) to `Tile`.
 * This const is ensuring that this mapping is only containing `ConstructableTile`.
 */
const ConstructableTilesConstraint: Record<
  keyof typeof ConstructableTiles,
  ConstructableTile<any, any>
> = ConstructableTiles;

/**
 * Type for all the keys for constructable tiles.
 */
export type ConstructableTileKeys = keyof typeof ConstructableTilesConstraint;
/**
 * Array of all the keys for constructable tiles.
 */
export const constructableTileKeys: readonly ConstructableTileKeys[] = Object.keys(
  ConstructableTiles,
) as ConstructableTileKeys[];

export const isConstructableTileKey = (
  key: string,
): key is ConstructableTileKeys =>
  (constructableTileKeys as readonly string[]).includes(key);

/**
 * Helper method to safely get `ConstructableTile` from a `ConstructableTileKey`.
 *
 * @param key the `ConstructableTileKey`
 * @returns a `Tile`
 */
export const constructableTile = (key: ConstructableTileKeys) =>
  ConstructableTiles[key];

/**
 * Map of all "natural" `Tile`s like e.g. `Grass`.
 */
export const NaturalTiles = {
  Grass,
  FishSchool,
  Mountain,
  Water,
};

/**
 * Map of all `Tile`s.
 */
export const AllTiles = {
  ...NaturalTiles,
  ...ConstructableTiles,
};

/**
 * `AllTiles` is used as the canonical mapping of string (`TileKey`) to `Tile`.
 * This const is ensuring that this mapping is only containing `Tile`.
 */
const AllTilesConstraint: Record<keyof typeof AllTiles, Tile> = AllTiles;

/**
 * Type for all the keys for tiles.
 */
export type TileKey = keyof typeof AllTilesConstraint;
/**
 * Array of all the keys for tiles.
 */
export const tileKeys: readonly TileKey[] = Object.keys(AllTiles) as TileKey[];

/**
 * Helper method to safely get `Tile` from a `TileKey`.
 *
 * @param key the `ConstructableTileKey`
 * @returns a `Tile`
 */
export const tile = (key: TileKey) => AllTiles[key];

/**
 * Helper type to create maps over tile keys.
 *
 * @param T the value type
 * @param K (optional) the key type extending `TileKey`. (default: `TileKey`)
 * @param E (optional) extra string values allowed for this map. (default: `never`)
 */
export type TileMap<
  T,
  K extends TileKey = TileKey,
  Extra extends string = never
> = Record<K | Extra, T>;

/**
 * Readonly variant of `TileMap`
 */
export type TileMapView<
  T,
  K extends TileKey,
  Extra extends string = never
> = Readonly<TileMap<Readonly<T>, K, Extra>>;

/**
 * Get the tile lying "underneath" the current tile. e.g. there lies `Grass` under a `PotatoFarm`.
 * Used e.g. for destructing a tile.
 *
 * @param tile the tile or instance to get the base tile for
 * @returns base tile lying "underneath" tile
 */
export const baseTileFor = (tile: Tile | TileInstance): Tile => {
  if (isTileInstance(tile)) {
    tile = tile.tile;
  }
  if (tile === Grass || tile === Water) {
    return tile;
  }
  // better determination
  if (isConstructableTile(tile)) {
    return Grass;
  } else {
    return Water;
  }
};
