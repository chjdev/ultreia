import { TileSprites } from "../sprites/TileSprites";
import {
  COLOR_DARK,
  COLOR_LIGHT,
  COLOR_PRIMARY,
  createTabButton,
  RexUIScene,
} from "./common";
import { ConstructableTileKeys, constructableTileKeys } from "../../core/tiles";

export const addBuildMenu = (
  scene: RexUIScene,
  actions?: (evt: "Road" | ConstructableTileKeys) => void,
): //todo get better types
Phaser.GameObjects.Container => {
  // https://codepen.io/rexrainbow/pen/BGKvXK
  const tabButtonWidth = 50;
  const marginLeft = 0.1 * scene.scale.width - tabButtonWidth;
  const marginTop = 0.1 * scene.scale.height;
  const scrollbarWidth = 20;
  const tableWidth = 0.8 * scene.scale.width + scrollbarWidth;
  const tableHeight = 0.8 * scene.scale.height;
  const columns = 4;
  const cellHeight = tableHeight / columns;
  const iconHeight = 0.5 * cellHeight;
  const iconWidth =
    (iconHeight * TileSprites.frameWidth) / TileSprites.frameHeight;
  const tabs = scene.rexUI.add
    .tabs({
      x: marginLeft,
      y: marginTop,

      panel: scene.rexUI.add.gridTable({
        background: scene.rexUI.add
          .roundRectangle(
            0,
            0,
            20,
            10,
            { tl: 0, tr: 10, br: 10, bl: 10 },
            COLOR_PRIMARY,
          )
          .setAlpha(0.85),

        table: {
          width: tableWidth,
          height: tableHeight,

          // cellWidth: (0.8 * this.scale.width) / 4,
          cellHeight,
          columns,
          mask: {
            padding: 2,
          },
        },

        slider: {
          track: scene.rexUI.add
            .roundRectangle(0, 0, scrollbarWidth, 10, 10, COLOR_DARK)
            .setAlpha(0.5),
          thumb: scene.rexUI.add.roundRectangle(0, 0, 10, 50, 10, COLOR_LIGHT),
        },

        // scroller: true,

        createCellContainerCallback: (cell: any) => {
          const scene = cell.scene,
            width = cell.width,
            height = cell.height,
            item = cell.item;

          return scene.rexUI.add
            .label({
              width: width,
              height: height,
              orientation: "vertical",
              align: "center",
              background: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10),
              icon: TileSprites.add(scene, 0, 0, item.id).setDisplaySize(
                iconWidth,
                iconHeight,
              ),
              // todo: set color not working?!
              text: scene.add.text(0, 0, item.id).setTint(0),
            })
            .setData("tile", item.id)
            .setDepth(2);
        },
      }),

      leftButtons: [
        createTabButton(scene, "AA", tabButtonWidth),
        createTabButton(scene, "BB", tabButtonWidth),
        createTabButton(scene, "CC", tabButtonWidth),
        createTabButton(scene, "DD", tabButtonWidth),
      ],

      space: {
        // leftButtonsOffset: 20,
        // leftButton: 1,
      },
    })
    .setOrigin(0, 0)
    .layout();
  // .drawBounds(this.add.graphics(), 0xff0000);

  let prevButton: any;
  const items = ["Road", ...constructableTileKeys].map((id) => ({
    color: 0xff0000,
    id,
  }));
  tabs.on(
    "button.click",
    (button: any) => {
      if (prevButton) {
        prevButton.getElement("background").setFillStyle(COLOR_DARK);
        prevButton.getElement("text").setTint(COLOR_PRIMARY);
      }
      button.getElement("background").setFillStyle(COLOR_PRIMARY);
      button.getElement("text").setTint(COLOR_LIGHT);
      prevButton = button;

      tabs
        .getElement("panel")
        .setItems(items)
        .scrollToTop();
    },
    tabs,
  );

  // Grid table
  tabs
    .getElement("panel")
    .on("cell.over", (cellContainer: any) => {
      cellContainer.getElement("background").setFillStyle(COLOR_LIGHT, 0.8);
    })
    .on("cell.out", (cellContainer: any) => {
      cellContainer.getElement("background").setFillStyle(undefined, 0);
    })
    .on("cell.click", (cellContainer: any) => {
      const tile: "Road" | ConstructableTileKeys = cellContainer.getData(
        "tile",
      );
      actions?.(tile);
    });

  tabs.emitButtonClick("left", 0);
  tabs.setVisible(false);
  tabs.setDepth(1);
  return tabs;
};
