import Phaser from "phaser";
import { IconSpriteKeys, IconSprites } from "../sprites/IconSprites";

export type RexUIScene = Phaser.Scene & { readonly rexUI: any };

export const COLOR_PRIMARY = 0xffffff;
export const COLOR_LIGHT = 0x7777ff;
export const COLOR_DARK = 0x999999;

export const createTabButton = (
  scene: RexUIScene,
  text: string,
  { width = 50, data }: Partial<{ width: number; data: any }>,
) => {
  const button = scene.rexUI.add.label({
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
      left: 12,
      right: 10,
    },
  });
  if (data != null) {
    if (typeof data === "object") {
      Object.keys(data).forEach((key) => button.setData(key, data[key]));
    } else {
      button.setData("data", data);
    }
  }
  return button;
};

export const createUIButton = (
  scene: RexUIScene,
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
