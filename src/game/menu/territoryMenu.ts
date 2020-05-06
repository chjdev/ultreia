import Phaser from "phaser";
import { RexUIScene } from "./common";
import { addMenu, Menu } from "./menu";
import {
  BuildingMaterials,
  Good,
  HarvestableGoods,
  ImmaterialGoods,
  Inhabitants,
  NaturalGoods,
  ProductionGoods,
  Weapons,
} from "../../core/Goods";
import { IconSprites } from "../sprites/IconSprites";
import { TileInstance, TileInstanceFor } from "../../core/tiles/Tile";
import { Warehouse } from "../../core/tiles/Warehouse";
import { Territory } from "../../core/Territory";
import { AssertionError } from "assert";

const tabs: Record<string, readonly Exclude<Good, "Nothing">[]> = {
  Building: BuildingMaterials,
  Immaterial: ImmaterialGoods,
  Harvestable: HarvestableGoods,
  Production: ProductionGoods,
  Weapons,
  Inhabitants,
  Natural: NaturalGoods,
};

export interface TerritoryInfoMenu {
  showInfoMenu(tileInstance?: TileInstance): void;

  hideInfoMenu(): void;

  close(): void;
}

export const addTerritoryMenu = (
  scene: RexUIScene,
): //todo get better types
TerritoryInfoMenu => {
  let menu:
    | (Phaser.GameObjects.Container & {
        clear: (destroy?: boolean) => void;
      })
    | null
    | undefined;
  const hideInfoMenu = () => {
    if (menu) {
      menu.clear(true);
    }
    menu = null;
  };
  const showInfoMenu = (warehouseInstance?: TileInstanceFor<Warehouse>) => {
    hideInfoMenu();
    const territory =
      warehouseInstance == null
        ? Territory.global()
        : Territory.from(warehouseInstance);
    if (territory == null) {
      throw new AssertionError({ message: "territory shouldn't be null here" });
    }
    menu = addMenu(
      scene,
      Object.fromEntries<Menu>(
        (Object.keys(tabs) as (keyof typeof tabs)[]).map((tab) => [
          tab,
          tabs[tab].map((good) => ({
            icon: () => IconSprites.add(scene, 0, 0, good),
            text: `${territory.state[good]}`,
          })),
        ]),
      ),
      { columns: 8 },
    ).setVisible(true) as Phaser.GameObjects.Container & {
      clear: (destroy?: boolean) => void;
    };
  };
  return {
    showInfoMenu,
    hideInfoMenu,
    close: () => {
      hideInfoMenu();
    },
  };
};
