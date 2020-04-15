import { TileAxis } from "../../core/TileDimensions";
import Phaser from "phaser";
import { Opaque } from "ts-essentials";

/**
 * Interface of sprite factories. These are utility objects with methods
 * handling their respective sprite classes.
 *
 * @param Tag uniquely tags this factory and it's created images
 * @param FrameArg what objects are allowed to be added and act as "key"
 */
export interface SpriteFactory<Tag extends string, FrameArg, Variant = void>
  extends Readonly<{
    frameWidth: number;
    frameHeight: number;
    width: TileAxis;
    height: TileAxis;
    cx: number;
    cy: number;
    margin: Readonly<{
      top: number;
      left: number;
      bottom: number;
      right: number;
    }>;

    /**
     * load all assets in to memory for the scene
     *
     * @param scene the scene to load into
     * @returns the scene
     */
    load: (scene: Phaser.Scene) => Phaser.Scene;

    /**
     * add a sprite (frame) to the scene
     *
     * @param scene the scene to add to
     * @param x world x coordinate to place the sprite at, top left excluding margin
     * @param y world y coordinate to place the sprite at, top left excluding margin
     * @param frame the frame arg to add
     * @param variant which drawing variant if any
     * @returns the uniquely tagged frame game object (image)
     */
    add: (
      scene: Phaser.Scene,
      x: number,
      y: number,
      frame: FrameArg,
      variant?: Variant,
    ) => Opaque<Tag, Phaser.GameObjects.Image>;

    /**
     * move a frame to a new position
     *
     * @param frame the uniquely tagged object to move
     * @param x world x coordinate to place the sprite at, top left excluding margin
     * @param y world y coordinate to place the sprite at, top left excluding margin
     * @returns the uniquely tagged frame game object (image)
     */
    moveTo: (
      frame: Opaque<Tag, Phaser.GameObjects.Image>,
      x: number,
      y: number,
    ) => Opaque<Tag, Phaser.GameObjects.Image>;
  }> {}

/**
 * Helper type to get the uniquely tagged image type of a SpriteFactory
 *
 * @see SpriteFactory
 */
export type SpriteImageFor<
  T extends SpriteFactory<any, any, any>
> = T extends SpriteFactory<infer Tag, any, any>
  ? Opaque<Tag, Phaser.GameObjects.Image>
  : never;

/**
 * Create an type caster for the uniquely tagged image of the SpriteFactory
 *
 * @returns a typecaster that takes a plain phaser image and applies the unique
 *  tag for this image type.
 *
 * @see SpriteFactory
 * @see SpriteImageFor
 */
export const asSpriteImage = <
  SI extends Opaque<string, Phaser.GameObjects.Image>
>() => (value: Phaser.GameObjects.Image): SI => value as SI;
