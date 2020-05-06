import * as Phaser from "phaser";
import {
  COLOR_DARK,
  COLOR_LIGHT,
  COLOR_PRIMARY,
  createTabButton,
  RexUIScene,
} from "./common";
import { MarkOptional } from "ts-essentials";

type Label = {
  icon: (scene: RexUIScene) => Phaser.GameObjects.Image;
  text: string;
  onClick?: () => void;
};

/**
 * Either a text or an icon needs to be present
 */
export type MenuItem = Readonly<
  MarkOptional<Label, "icon"> | MarkOptional<Label, "text">
>;

export type Menu = readonly MenuItem[];
export type TabbedMenu = {
  readonly [tab: string]: Menu;
};
const isTabbedMenu = (value: Menu | TabbedMenu): value is TabbedMenu =>
  !Array.isArray(value);

export const addMenu = (
  scene: RexUIScene,
  menu: Menu | TabbedMenu,
  {
    columns = 4,
  }: Partial<{
    columns: number;
  }> = {},
): //todo get better types
Phaser.GameObjects.Container => {
  // https://codepen.io/rexrainbow/pen/BGKvXK
  const tabButtonWidth = isTabbedMenu(menu)
    ? Object.keys(menu).reduce(
        (acc, key) => (key.length > acc ? key.length : acc),
        0,
      ) * 12
    : 0;
  const marginLeft = 0.1 * scene.scale.width - tabButtonWidth;
  const marginTop = 0.1 * scene.scale.height;
  const scrollbarWidth = 20;
  const tableWidth = 0.8 * scene.scale.width + scrollbarWidth;
  const tableHeight = 0.8 * scene.scale.height;
  const cellHeight = tableHeight / columns;
  const iconHeight = 0.5 * cellHeight;
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

        // slider: {
        //   track: scene.rexUI.add
        //     .roundRectangle(0, 0, scrollbarWidth, 10, 10, COLOR_DARK)
        //     .setAlpha(0.5),
        //   thumb: scene.rexUI.add.roundRectangle(0, 0, 10, 50, 10, COLOR_LIGHT),
        // },
        //
        // scroller: true,

        createCellContainerCallback: (cell: any) => {
          const scene = cell.scene,
            width = cell.width,
            height = cell.height,
            item = cell.item;

          const icon = item.icon?.(scene);
          return scene.rexUI.add
            .label({
              width: width,
              height: height,
              orientation: "vertical",
              align: "center",
              background: scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10),
              icon: icon?.setDisplaySize(
                iconHeight * (icon.width / icon.height),
                iconHeight,
              ),
              // todo: set color not working?!
              text:
                item.text != null && item.text !== ""
                  ? scene.add.text(0, 0, item.text.trim()).setTint(0)
                  : undefined,
            })
            .setData("onClick", item.onClick)
            .setDepth(2);
        },
      }),

      leftButtons: isTabbedMenu(menu)
        ? Object.keys(menu).map((tab) =>
            createTabButton(scene, tab, {
              width: tabButtonWidth,
              data: { tab },
            }),
          )
        : undefined,

      space: {
        // leftButtonsOffset: 20,
        // leftButton: 10,
      },
    })
    .setOrigin(0, 0)
    .layout();
  // .drawBounds(this.add.graphics(), 0xff0000);

  !isTabbedMenu(menu) &&
    tabs
      .getElement("panel")
      .setItems(menu)
      .scrollToTop();

  let prevButton: any;
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
        .setItems(isTabbedMenu(menu) ? menu[button.getData("tab")] : menu)
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
    .on("cell.click", (cellContainer: any) =>
      cellContainer.getData("onClick")?.(),
    );

  tabs.emitButtonClick("left", 0);
  tabs.setVisible(false);
  tabs.setDepth(1);
  return tabs;
};
