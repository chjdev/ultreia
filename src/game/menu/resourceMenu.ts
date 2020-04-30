import { Inventory } from "../../core/Goods";
import * as Phaser from "phaser";
import { COLOR_DARK, RexUIScene } from "./common";
import { IconSprites } from "../sprites/IconSprites";
import {
  useClockView,
  useInteractionView,
  useMap,
} from "../../core/MatchContext";
import { TickEvent } from "../../core/Tick";
import { Territory } from "../../core/Territory";
import { InteractionEvent } from "../../core/Interaction";
import { isStatefulTileInstance } from "../../core/tiles/Tile";

type QuickResource = "Money" | "Wood" | "Tool";
const quickResources: readonly QuickResource[] = ["Money", "Wood", "Tool"];
type QuickResourceMenu = Inventory<QuickResource, Phaser.GameObjects.Group>;

const createResourceButton = (
  scene: RexUIScene,
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

export const addResourceMenu = (
  scene: RexUIScene,
): Phaser.GameObjects.Group => {
  const turns = scene.rexUI.add
    .buttons({
      anchor: {
        right: "right",
        top: "top",
      },

      orientation: "horizontal",

      buttons: [createResourceButton(scene, "TurnMenu", "1600 A.D.")],

      space: 5,
    })
    .layout();

  // todo return a remover
  useClockView().listen(({ turn }) => {
    turns.getButton(0).setText(`${1600 + turn} A.D.`);
  }, TickEvent.tock);

  const resources = scene.rexUI.add
    .buttons({
      anchor: {
        left: "left",
        top: "top",
      },

      orientation: "horizontal",

      buttons: quickResources.map((good) => createResourceButton(scene, good)),

      space: 5,
    })
    .layout();

  let territory: Territory = Territory.global();
  const refreshResourceMenu = () =>
    quickResources.forEach((good, idx) => {
      const button = resources.getButton(idx);
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
  // todo return removelisteners
  return scene.add.group([resources, turns]);
};
