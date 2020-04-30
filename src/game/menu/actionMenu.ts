import { createUIButton, RexUIScene } from "./common";
import { MenuKey, MenuKeys } from "../sprites/IconSprites";

export const addActionMenu = (
  scene: RexUIScene,
  actions?: (evt: MenuKey) => void,
): // todo get better types
Phaser.GameObjects.Container => {
  const buttons = scene.rexUI.add
    .buttons({
      anchor: {
        right: "right",
        bottom: "bottom",
      },

      orientation: "y",

      buttons: MenuKeys.map((key) =>
        createUIButton(scene, key, key.replace("Menu", "")),
      ),

      space: 5,
    })
    .layout();

  buttons.on("button.click", (_: unknown, buttonIdx: number) => {
    if (buttonIdx >= MenuKeys.length) {
      throw new RangeError(`button index not in action menu ${buttonIdx}`);
    }
    actions?.(MenuKeys[buttonIdx]);
  });

  return buttons;
};
