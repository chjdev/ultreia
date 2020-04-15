import * as Phaser from "phaser";
import { deepReadonly } from "../../utils";
import { TileAxis } from "../../core/TileDimensions";
import { asSpriteImage, SpriteFactory, SpriteImageFor } from "./SpriteFactory";
import { Good, Goods } from "../../core/Goods";
import { Opaque } from "ts-essentials";

type IconAsset = Opaque<"IconAsset", string>;

enum _MenuKey {
  BuildMenu,
  TurnMenu,
  PerformanceMenu,
  ResearchMenu,
  TradeMenu,
  DiplomacyMenu,
}

type MenuKey = keyof typeof _MenuKey;
const MenuKeys = Object.keys(_MenuKey).filter((key) =>
  isNaN(Number(key)),
) as readonly MenuKey[];
type FrameKey = Exclude<Good, "Nothing"> | MenuKey;

/**
 * helper function to get the file path for a specific png
 *
 * @param key the name of the png
 * @returns the assets path
 */
const asset = (key: FrameKey): IconAsset =>
  `assets/Icons/${key}.png` as IconAsset;

/**
 * holds the file paths to the asset pngs
 */
const frames = Object.fromEntries(
  [...Goods, ...MenuKeys].map((key: FrameKey) => [key, asset(key)]),
) as Readonly<Record<FrameKey, IconAsset>>;

export type IconSpriteKeys = keyof typeof frames;

export type IconSprites = SpriteFactory<"IconSprites", IconSpriteKeys>;
export type IconSprite = SpriteImageFor<IconSprites>;
const asIconSprite = asSpriteImage<IconSprite>();

/**
 * IconSprites sprite factory
 */
export const IconSprites: IconSprites = {
  frameWidth: 34,
  frameHeight: 34,
  width: TileAxis.from(34),
  height: TileAxis.from(34),
  cx: 17,
  cy: 17,
  margin: deepReadonly({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),

  load: (scene: Phaser.Scene): Phaser.Scene => {
    (Object.keys(frames) as readonly IconSpriteKeys[]).forEach((icon) => {
      scene.load.image(icon, frames[icon]);
    });
    return scene;
  },

  add: (scene: Phaser.Scene, x: number, y: number, frame: IconSpriteKeys) =>
    asIconSprite(
      scene.add
        .image(x - IconSprites.margin.left, y - IconSprites.margin.top, frame)
        .setOrigin(0, 0),
    ),

  moveTo: (frame: IconSprite, x: number, y: number): IconSprite =>
    frame.setX(x - IconSprites.margin.left).setY(y - IconSprites.margin.top),
};
