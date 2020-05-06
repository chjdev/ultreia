import { TileSprites } from "../sprites/TileSprites";
import { RexUIScene } from "./common";
import { ConstructableTileKeys } from "../../core/tiles";
import { addMenu, TabbedMenu } from "./menu";
import { Dictionary, DictionaryValues } from "ts-essentials";

type MenuItem = "Road" | ConstructableTileKeys;
type MenuItems = readonly MenuItem[];
const Civics: MenuItems = [
  "Road",
  "Warehouse",
  "Chapel",
  "FoodMarket",
  "Inn",
  "Pioneer",
];
const Farms: MenuItems = [
  "Fisher",
  "Forest",
  "Lumberjack",
  "Hunter",
  "PotatoField",
  "PotatoFarm",
  "SheepPasture",
  "SheepFarm",
];
const Crafts: MenuItems = ["Tanner", "Distillery", "Weaver"];

const tabs: Dictionary<MenuItems> = { Civics, Farms, Crafts };

export const addBuildMenu = (
  scene: RexUIScene,
  actions?: (evt: "Road" | ConstructableTileKeys) => void,
): //todo get better types
Phaser.GameObjects.Container =>
  addMenu(
    scene,
    Object.fromEntries<DictionaryValues<TabbedMenu>>(
      Object.keys(tabs).map((tab) => [
        tab,
        tabs[tab].map((key) => ({
          text: key,
          icon: (scene: RexUIScene) => TileSprites.add(scene, 0, 0, key),
          onClick: () => actions?.(key),
        })),
      ]),
    ),
  );
