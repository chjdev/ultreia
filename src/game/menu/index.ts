import * as Phaser from "phaser";
import { addResourceMenu } from "./resourceMenu";
import {
  addProductionInfoMenu,
  CloseProductionInfoMenu,
} from "./productionInfoMenu";
import { addBuildMenu } from "./buildMenu";
import { addActionMenu } from "./actionMenu";
import { useClock, useInteraction } from "../../core/MatchContext";

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

  private closeProductionInfoMenu: CloseProductionInfoMenu | null = null;
  private resourceMenu: Phaser.GameObjects.Group | null = null;
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private actionMenu: Phaser.GameObjects.Container | null = null;

  private readonly flipVisible = () => {
    const flip = this.actionMenu?.visible;
    this.actionMenu?.setVisible(!flip);
    this.buildMenu?.setVisible(!!flip);
  };

  public create() {
    this.resourceMenu = addResourceMenu(this);
    // todo no destructor possibilities?!
    this.closeProductionInfoMenu = addProductionInfoMenu(this);

    this.buildMenu = addBuildMenu(this, (evt) => {
      this.flipVisible();
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
        default:
          this.flipVisible();
      }
    });

    this.input.on("pointerdown", (_: unknown, elements: readonly unknown[]) => {
      if (elements.length === 0) {
        // clicked outside
        this.buildMenu?.visible && this.flipVisible();
      }
    });
  }

  // public update(time: number, delta: number) {}
}
