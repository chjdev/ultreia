import * as Phaser from "phaser";
import { addResourceMenu } from "./resourceMenu";
import {
  addProductionInfoMenu,
  ProductionInfoMenu,
} from "./productionInfoMenu";
import { addBuildMenu } from "./buildMenu";
import { addActionMenu } from "./actionMenu";
import {
  useClock,
  useInteraction,
  useInteractionView,
  useMapView,
} from "../../core/MatchContext";
import { InteractionEvent } from "../../core/Interaction";
import { isWarehouse } from "../../core/tiles/checkers";
import { addTerritoryMenu, TerritoryInfoMenu } from "./territoryMenu";

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: true,
  visible: true,
  key: "Menu",
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

  private productionInfoMenu: ProductionInfoMenu | null = null;
  private resourceMenu: Phaser.GameObjects.Group | null = null;
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private territoryMenu: TerritoryInfoMenu | null = null;
  private actionMenu: Phaser.GameObjects.Container | null = null;

  public create() {
    this.resourceMenu = addResourceMenu(this);
    this.productionInfoMenu = addProductionInfoMenu(this);
    this.territoryMenu = addTerritoryMenu(this);
    useInteractionView().listen<InteractionEvent>(({ coordinate, context }) => {
      if (context !== "select") {
        return;
      }
      const tileInstance = useMapView().get(coordinate);
      if (tileInstance) {
        this.buildMenu?.setVisible(false);
        this.productionInfoMenu?.hideInfoMenu();

        if (isWarehouse(tileInstance)) {
          this.actionMenu?.setVisible(false);
          this.territoryMenu?.showInfoMenu(tileInstance);
        } else {
          this.actionMenu?.setVisible(true);
          this.productionInfoMenu?.showInfoMenu(tileInstance);
        }
      }
    }, InteractionEvent.select);

    this.buildMenu = addBuildMenu(this, (evt) => {
      this.buildMenu?.setVisible(false);
      this.territoryMenu?.hideInfoMenu();
      this.actionMenu?.setVisible(true);
      this.productionInfoMenu?.hideInfoMenu();
      if (evt === "Road") {
        useInteraction().roadContext();
      } else {
        useInteraction().buildContext(evt);
      }
    });

    this.actionMenu = addActionMenu(this, (evt) => {
      switch (evt) {
        case "TurnMenu":
          useClock().tick();
          break;
        case "PerformanceMenu":
          this.buildMenu?.setVisible(false);
          this.productionInfoMenu?.hideInfoMenu();
          this.actionMenu?.setVisible(false);
          this.territoryMenu?.showInfoMenu();
          break;
        default:
          this.buildMenu?.setVisible(true);
          this.actionMenu?.setVisible(false);
          this.territoryMenu?.hideInfoMenu();
          this.productionInfoMenu?.hideInfoMenu();
      }
    });

    this.input.on("pointerdown", (_: unknown, elements: readonly unknown[]) => {
      if (elements.length === 0) {
        // clicked outside
        this.buildMenu?.setVisible(false);
        this.territoryMenu?.hideInfoMenu();
        this.actionMenu?.setVisible(true);
        this.productionInfoMenu?.hideInfoMenu();
      }
    });
  }

  // public update(time: number, delta: number) {}
}
