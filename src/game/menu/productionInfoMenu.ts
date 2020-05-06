import * as Phaser from "phaser";
import {
  isStatefulTileInstance,
  isTileInstance,
  TileInstance,
} from "../../core/tiles/Tile";
import { COLOR_DARK, RexUIScene } from "./common";
import { TileSprites } from "../sprites/TileSprites";
import { Good, Inventory } from "../../core/Goods";
import { IconSprites } from "../sprites/IconSprites";
import { TileChecker } from "../../core/tiles/TileChecker";
import { useClockView } from "../../core/MatchContext";
import { TickEvent } from "../../core/Tick";

const createProductionInfoView = (
  scene: RexUIScene,
  tileInstance: TileInstance,
) => {
  const infoContainer = scene.rexUI.add.sizer({
    // x: 0,
    // y: 0,
    anchor: {
      left: "left",
      top: "top+50",
    },
    width: 400,
    height: 200,
    orientation: 0,
  });

  infoContainer.addBackground(
    scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10, COLOR_DARK).setAlpha(0.9),
  );

  infoContainer.add(
    TileSprites.add(scene, 0, 0, tileInstance).setScale(0.4),
    0,
    "top",
    10,
  );

  const info = scene.rexUI.add.sizer({
    orientation: 1,
    height: 200,
    space: 10,
  });

  info.add(
    scene.add.text(0, 0, tileInstance.tile.tag, {
      fontSize: "14pt",
    }),
  );

  if (isStatefulTileInstance(tileInstance)) {
    const consumptionRow = scene.rexUI.add.sizer({
      orientation: 0,
    });
    if (!Inventory.isNothing(tileInstance.tile.consumes)) {
      Inventory.forEach((value, good: Exclude<Good, "Nothing">) => {
        consumptionRow.add(
          scene.rexUI.add.label({
            orientation: 1,
            align: "center",
            icon: IconSprites.add(scene, 0, 0, good),
            text: scene.add.text(
              0,
              0,
              `${tileInstance.state[good]}/${tileInstance.tile.consumes[good]}`,
              {
                fontSize: "12pt",
              },
            ),
          }),
          0,
          "center",
          10,
        );
      }, tileInstance.tile.consumes);
    } else {
      consumptionRow.add(
        scene.add.text(0, 0, "Nothing", {
          fontSize: "14pt",
        }),
      );
    }

    consumptionRow.layout();
    info.add(consumptionRow, 1);

    info.add(
      scene.rexUI.add.label({
        align: "center",
        icon: IconSprites.add(scene, 0, 0, "TurnMenu"),
        text: scene.add.text(
          0,
          0,
          "Productivity: " +
            Math.round(
              Math.min(
                1,
                tileInstance.tile.baseProductivity(tileInstance.coordinate) *
                  tileInstance.tile.productivity(tileInstance),
              ) * 100,
            ) +
            "%",
          {
            fontSize: "14pt",
          },
        ),
        space: {
          icon: 10,
        },
      }),
      1,
    );

    const productionRow = scene.rexUI.add.sizer({
      orientation: 0,
    });
    if (!Inventory.isNothing(tileInstance.tile.produces)) {
      Inventory.forEach((value, good: Exclude<Good, "Nothing">) => {
        productionRow.add(
          scene.rexUI.add.label({
            orientation: 1,
            align: "center",
            icon: IconSprites.add(scene, 0, 0, good),
            text: scene.add.text(
              0,
              0,
              `${tileInstance.state[good]}/${tileInstance.tile.produces[good]}`,
              {
                fontSize: "12pt",
              },
            ),
          }),
          0,
          "center",
          10,
        );
      }, tileInstance.tile.produces);
    } else {
      productionRow.add(
        scene.add.text(0, 0, "Nothing", {
          fontSize: "14pt",
        }),
      );
    }

    productionRow.layout();
    info.add(productionRow, 1);
  }

  info.layout();
  infoContainer.add(info, 1, "center", { top: 5, bottom: 5 });

  infoContainer.layout();
  return infoContainer;
};

export interface ProductionInfoMenu {
  showInfoMenu(tileInstance: TileInstance): void;

  hideInfoMenu(): void;

  close(): void;
}

export const addProductionInfoMenu = (
  scene: RexUIScene,
  close?: (
    popup: Phaser.GameObjects.GameObject & {
      clear: (destroy?: boolean) => void;
    },
  ) => void,
): ProductionInfoMenu => {
  // todo
  let infoContainer:
    | (Phaser.GameObjects.GameObject & {
        clear: (destroy?: boolean) => void;
      })
    | null
    | undefined;
  let tileInstance: TileInstance | null | undefined;
  const hideInfoMenu = () => {
    if (infoContainer != null) {
      if (close != null) {
        close(infoContainer);
      } else {
        infoContainer.clear(true);
      }
      infoContainer = null;
    }
  };
  const showInfoMenu = (tileInstance: TileInstance) => {
    hideInfoMenu();
    if (
      isTileInstance(tileInstance) &&
      !TileChecker.create("Water", "Grass", "Mountain")(tileInstance)
    ) {
      infoContainer = createProductionInfoView(scene, tileInstance);
    }
  };

  const removeListeners = [
    useClockView().listen(() => {
      if (infoContainer && tileInstance) {
        showInfoMenu(tileInstance);
      }
    }, TickEvent.tock),
  ];

  return {
    showInfoMenu,
    hideInfoMenu,
    close: () => {
      hideInfoMenu();
      removeListeners.forEach((removeListener) => removeListener());
    },
  };
};
