import * as Phaser from "phaser";
import { PreloadScene } from "./Preload";

const gameConfig: Phaser.Types.Core.GameConfig = {
  title: "Ultreia",

  type: Phaser.WEBGL,

  scale: {
    width: window.innerWidth,
    height: window.innerHeight,
  },

  physics: {
    // default: "arcade",
    // arcade: {
    //   debug: true,
    // },
  },

  render: {
    pixelArt: true,
  },

  parent: "game",
  backgroundColor: "#000000",

  scene: [PreloadScene],
};

export const game = new Phaser.Game(gameConfig);

window.addEventListener("resize", () => {
  game.scale.setGameSize(window.innerWidth, window.innerHeight);
});
