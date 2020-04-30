import * as Phaser from "phaser";
import { WorldScene } from "./world";
import { MenuScene } from "./menu";
import { MatchManager } from "../core/MatchManager";
import { TileSprites } from "./sprites/TileSprites";
import { Sounds } from "./Sounds";
import { useTileDimensions } from "../core/MatchContext";
import { IconSprites } from "./sprites/IconSprites";

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: "Preload",
};

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super(sceneConfig);
  }

  public preload() {
    IconSprites.load(this);
    TileSprites.load(this);
    Sounds.load(this);
    MatchManager.start();
    useTileDimensions().setSize(TileSprites.width, TileSprites.height);
  }

  public create() {
    WorldScene.addSelf(this.game);
    MenuScene.addSelf(this.game);
  }

  // public update() {}
}
