import * as Phaser from "phaser";
import { ConstructableTileKeys, constructableTileKeys } from "../core/tiles";
import {
  isStatefulTileInstance,
  isTileInstance,
  TileInstance,
} from "../core/tiles/Tile";
import { Good, Inventory } from "../core/Goods";
import { Territory } from "../core/Territory";
import {
  useClock,
  useClockView,
  useInteraction,
  useInteractionView,
  useMap,
  useMapView,
} from "../core/MatchContext";
import { TileSprites } from "./sprites/TileSprites";
import { InteractionEvent } from "../core/Interaction";
import { IconSpriteKeys, IconSprites } from "./sprites/IconSprites";
import { TickEvent } from "../core/Tick";
import isNothing = Inventory.isNothing;
import { TileChecker } from "../core/tiles/TileChecker";

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: true,
  visible: true,
  key: "Menu",
};

type QuickResource = "Money" | "Wood" | "Tool";
const quickResources: readonly QuickResource[] = ["Money", "Wood", "Tool"];
type QuickResourceMenu = Inventory<QuickResource, Phaser.GameObjects.Group>;

// const COLOR_PRIMARY = 0x4e342e;
// const COLOR_LIGHT = 0x7b5e57;
// const COLOR_DARK = 0x260e04;
const COLOR_PRIMARY = 0xffffff;
const COLOR_LIGHT = 0x7777ff;
const COLOR_DARK = 0x999999;

const createTabButton = (
  scene: Phaser.Scene & { readonly rexUI: any },
  text: string,
  width: number = 50,
) =>
  scene.rexUI.add.label({
    width,
    height: 40,
    align: "center",
    background: scene.rexUI.add
      .roundRectangle(
        0,
        0,
        width,
        50,
        {
          tl: 10,
          bl: 10,
        },
        COLOR_DARK,
      )
      .setAlpha(0.9),
    text: scene.add.text(0, 0, text, {
      fontSize: "18pt",
    }),
    space: {
      left: 10,
    },
  });

const createUIButton = (
  scene: Phaser.Scene & { readonly rexUI: any },
  image: IconSpriteKeys,
  text: string,
  width: number = 180,
  height: number = 100,
) =>
  scene.rexUI.add.label({
    width,
    height,
    align: "center",
    orientation: "vertical",
    background: scene.rexUI.add
      .roundRectangle(
        0,
        0,
        width,
        height,
        {
          tl: 0.2 * Math.min(width, height),
          bl: 0.2 * Math.min(width, height),
        },
        COLOR_DARK,
      )
      .setAlpha(0.75),
    text: scene.add.text(0, 0, text, {
      fontSize: "16pt",
    }),
    icon: IconSprites.add(scene, 0, 0, image).setDisplaySize(
      0.5 * Math.min(width, height),
      0.5 * Math.min(width, height),
    ),
  });

const createResourceButton = (
  scene: Phaser.Scene & { readonly rexUI: any },
  good: QuickResource | "TurnMenu",
  text: string = "0",
  width: number = 180,
  height: number = 35,
) =>
  scene.rexUI.add.label({
    width,
    height,
    align: "left",
    orientation: "horizontal",
    background: scene.rexUI.add
      .roundRectangle(
        0,
        0,
        width,
        height,
        {
          bl: 0.2 * Math.min(width, height),
          br: 0.2 * Math.min(width, height),
        },
        COLOR_DARK,
      )
      .setAlpha(0.75),
    text: scene.add.text(0, 0, text, {
      fontSize: "18pt",
    }),
    icon: IconSprites.add(scene, 0, 0, good).setDisplaySize(
      0.75 * Math.min(width, height),
      0.75 * Math.min(width, height),
    ),
    space: {
      left: 7,
      icon: 5,
    },
  });

const createInfoView = (
  scene: Phaser.Scene & { readonly rexUI: any },
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
    if (!isNothing(tileInstance.tile.consumes)) {
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
    if (!isNothing(tileInstance.tile.produces)) {
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

export class MenuScene extends Phaser.Scene {
  // filled from plugin
  public readonly rexUI: any;

  public constructor() {
    super(sceneConfig);
  }

  public static addSelf(game: Phaser.Game) {
    game.scene.add(sceneConfig.key as string, MenuScene);
  }

  public preload() {
    this.load.scenePlugin({
      key: "rexuiplugin",
      url:
        "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexuiplugin.min.js",
      sceneKey: "rexUI",
    });
  }

  private setupResourceOverviewMenu() {
    const turnOverview = this.rexUI.add
      .buttons({
        anchor: {
          right: "right",
          top: "top",
        },

        orientation: "horizontal",

        buttons: createResourceButton(this, "TurnMenu", "1600 A.D."),

        space: 5,
      })
      .layout();
    useClockView().listen(({ turn }) => {
      turnOverview.getButton(0).setText(`${1600 + turn} A.D.`);
    }, TickEvent.tock);

    const buttons = this.rexUI.add
      .buttons({
        anchor: {
          left: "left",
          top: "top",
        },

        orientation: "horizontal",

        buttons: quickResources.map((good) => createResourceButton(this, good)),

        space: 5,
      })
      .layout();

    let territory: Territory = Territory.global();
    const refreshResourceMenu = () =>
      quickResources.forEach((good, idx) => {
        const button = buttons.getButton(idx);
        button.setText(territory.state[good].toString());
      });
    const setTerritory = (newTerritory: Territory) => {
      territory = newTerritory;
      refreshResourceMenu();
    };
    useInteractionView().listen<InteractionEvent>(({ coordinate }) => {
      const instance = useMap().at(coordinate);
      if (isStatefulTileInstance(instance)) {
        console.log("state", instance.tile.tag, instance.state);
      }

      const territory = Territory.from(coordinate);
      setTerritory(territory ?? Territory.global());
    }, InteractionEvent.select);
    useClockView().listen(refreshResourceMenu, "tock");
  }

  private setupInfoMenu() {
    // todo
    let infoContainer:
      | { clear: (destroy?: boolean) => void }
      | null
      | undefined;
    let tileInstance: TileInstance | null | undefined;
    const closeInfoMenu = () => {
      if (infoContainer) {
        infoContainer.clear(true);
        infoContainer = null;
      }
    };
    const showInfoMenu = () => {
      closeInfoMenu();
      if (
        isTileInstance(tileInstance) &&
        !TileChecker.create("Water", "Grass", "Mountain")(tileInstance)
      ) {
        infoContainer = createInfoView(this, tileInstance);
      }
    };
    useInteractionView().listen<InteractionEvent>(({ coordinate, context }) => {
      if (context !== "select") {
        return;
      }
      tileInstance = useMapView().get(coordinate);
      showInfoMenu();
    }, InteractionEvent.select);
    useClockView().listen(() => {
      if (infoContainer) {
        showInfoMenu();
      }
    }, TickEvent.tock);
  }

  public create() {
    // this.setupTurnMenu();
    this.setupResourceOverviewMenu();

    // https://codepen.io/rexrainbow/pen/BGKvXK
    const tabButtonWidth = 50;
    const marginLeft = 0.1 * this.scale.width - tabButtonWidth;
    const marginTop = 0.1 * this.scale.height;
    const scrollbarWidth = 20;
    const tableWidth = 0.8 * this.scale.width + scrollbarWidth;
    const tableHeight = 0.8 * this.scale.height;
    const columns = 4;
    const cellHeight = tableHeight / columns;
    const iconHeight = 0.5 * cellHeight;
    const iconWidth =
      (iconHeight * TileSprites.frameWidth) / TileSprites.frameHeight;
    const tabs = this.rexUI.add
      .tabs({
        x: marginLeft,
        y: marginTop,

        panel: this.rexUI.add.gridTable({
          background: this.rexUI.add
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
            track: this.rexUI.add
              .roundRectangle(0, 0, scrollbarWidth, 10, 10, COLOR_DARK)
              .setAlpha(0.5),
            thumb: this.rexUI.add.roundRectangle(0, 0, 10, 50, 10, COLOR_LIGHT),
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
                icon: TileSprites.add(this, 0, 0, item.id).setDisplaySize(
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
          createTabButton(this, "AA", tabButtonWidth),
          createTabButton(this, "BB", tabButtonWidth),
          createTabButton(this, "CC", tabButtonWidth),
          createTabButton(this, "DD", tabButtonWidth),
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
      .on("cell.over", (cellContainer: any, cellIndex: number) => {
        cellContainer.getElement("background").setFillStyle(COLOR_LIGHT, 0.8);
      })
      .on("cell.out", (cellContainer: any, cellIndex: number) => {
        cellContainer.getElement("background").setFillStyle(undefined, 0);
      });

    tabs.emitButtonClick("left", 0);
    tabs.setVisible(false);
    tabs.setDepth(1);

    const buttons = this.rexUI.add
      .buttons({
        anchor: {
          right: "right",
          bottom: "bottom",
        },

        orientation: "y",

        buttons: [
          createUIButton(this, "BuildMenu", "Build"),
          createUIButton(this, "ResearchMenu", "Research"),
          createUIButton(this, "DiplomacyMenu", "Diplomacy"),
          createUIButton(this, "PerformanceMenu", "Performance"),
          createUIButton(this, "TurnMenu", "Next Turn"),
        ],

        space: 5,
      })
      .layout();

    const flipVisible = () => {
      const flip = buttons.visible;
      buttons.setVisible(!flip);
      tabs.setVisible(flip);
    };

    buttons.on("button.click", (_: unknown, buttonIdx: number) => {
      switch (buttonIdx) {
        case 4:
          useClock().tick();
          break;
        default:
          flipVisible();
      }
    });

    tabs
      .getElement("panel")
      .on("cell.click", (cellContainer: any, cellIndex: number) => {
        flipVisible();
        const tile: "Road" | ConstructableTileKeys = cellContainer.getData(
          "tile",
        );
        if (tile === "Road") {
          useInteraction().roadContext();
        } else {
          useInteraction().buildContext(tile);
        }
      });

    this.input.on("pointerdown", (_: unknown, elements: readonly unknown[]) => {
      if (elements.length === 0) {
        // clicked outside
        tabs.visible && flipVisible();
      }
    });

    this.setupInfoMenu();
  }

  // public update(time: number, delta: number) {}
}
