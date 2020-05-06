import { RexUIScene } from "./common";
import { addMenu, Menu } from "./menu";
import { BuildingMaterials, ProductionGoods, Weapons } from "../../core/Goods";
import { IconSprites } from "../sprites/IconSprites";
import { WarehouseGoods } from "../../core/tiles/WarehouseInternal";
import { Dictionary } from "ts-essentials";
import { TileInstance, TileInstanceFor } from "../../core/tiles/Tile";
import { Warehouse } from "../../core/tiles/Warehouse";
import Phaser from "phaser";
import { Territory } from "../../core/Territory";
import { AssertionError } from "assert";

const tabs: Dictionary<readonly WarehouseGoods[]> = {
  Build: BuildingMaterials,
  Prod: ProductionGoods,
  Weap: Weapons,
};

export interface WarehouseInfoMenu {
  showInfoMenu(tileInstance?: TileInstance): void;

  hideInfoMenu(): void;

  close(): void;
}

export const addWarehouseMenu = (
  scene: RexUIScene,
): //todo get better types
WarehouseInfoMenu => {
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
    const numWarehouses = territory.warehouses().length;
    menu = addMenu(
      scene,
      Object.fromEntries<Menu>(
        (Object.keys(tabs) as (keyof typeof tabs)[]).map((tab) => [
          tab,
          tabs[tab].map((good) => ({
            icon: () => IconSprites.add(scene, 0, 0, good),
            text: `${territory.state[good]}/${Warehouse.consumes[good] *
              numWarehouses}`,
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
