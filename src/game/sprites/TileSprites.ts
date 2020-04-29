import { TileKey, TileMapView } from "../../core/tiles";
import { Tile, TileInstance } from "../../core/tiles/Tile";
import * as Phaser from "phaser";
import { deepReadonly } from "../../utils";
import { TileAxis } from "../../core/TileDimensions";
import { asSpriteImage, SpriteFactory, SpriteImageFor } from "./SpriteFactory";
import { Coordinate } from "../../core/Coordinate";
import { Road } from "../../core/Road";

/**
 * helper function to get the file path for a specific png
 *
 * @param category the category of png
 * @param name the name of the png
 * @returns the assets path
 */
const asset = (
  category: "BaseTiles" | "Decor" | "Roads" | "Tiles",
  name: string,
): string => `assets/${category}/${name}.png`;

// todo Road is a decoration, how to handle best? revisit with next decoration
/**
 * holds the file paths to the asset pngs
 */
const frames: TileMapView<string | string[], TileKey, "Road"> = {
  Water: asset("BaseTiles", "hexOcean00"),
  Grass: [
    asset("BaseTiles", "hexPlains00"),
    asset("BaseTiles", "hexScrublands00"),
  ],
  Forest: asset("BaseTiles", "hexForestBroadleaf00"),
  FishSchool: asset("BaseTiles", "hexFishSchool00"),
  Chapel: asset("Tiles", "hexPlainsTemple00"),
  Lumberjack: [
    asset("Tiles", "hexForestBroadleafForester00"),
    asset("Tiles", "hexForestBroadleafForester01"),
  ],
  Warehouse: asset("Tiles", "hexDirtWarehouse00"),
  Pioneer: [
    asset("Tiles", "hexDirtVillageSmall00"),
    asset("Tiles", "hexDirtVillageSmall01"),
    asset("Tiles", "hexDirtVillageSmall02"),
    asset("Tiles", "hexDirtVillageSmall03"),
  ],
  SheepPasture: asset("Tiles", "hexPlainsFarm03"),
  SheepFarm: asset("Tiles", "hexPlainsInn00"),
  Weaver: asset("Tiles", "hexPlainsSmithy00"),
  MechanicalWeaver: asset("Tiles", "hexPlainsSmithy00"),
  PotatoField: asset("Tiles", "hexPlainsFarm02"),
  PotatoFarm: asset("Tiles", "hexPlainsInn00"),
  FoodMarket: asset("Tiles", "hexDirtMarket00"),
  Hunter: asset("Tiles", "hexForestBroadleafForester01"),
  Tanner: asset("Tiles", "hexPlainsSmithy00"),
  Fisher: asset("Tiles", "hexFisher00"),
  Inn: asset("Tiles", "hexPlainsInn00"),
  Distillery: asset("Tiles", "hexPlainsSmithy00"),
  Mountain: [
    asset("BaseTiles", "hexMountain00"),
    asset("BaseTiles", "hexHills00"),
    asset("BaseTiles", "hexHighlands00"),
    asset("Tiles", "hexMountainValley00"),
    asset("Tiles", "hexMountainCave00"),
    asset("Tiles", "hexMountainCave01"),
  ],
  // 5 because the last column is not a connection
  Road: Road.allTypes.map((roadType) => {
    const roadPattern = ("000000" + roadType.toString(2)).slice(-6);
    return asset("Roads", `hexRoad-${roadPattern}-00`);
  }),
};

/**
 * get the variant number for a road sprite based on the faces it connects.
 *
 * @param faceA first face
 * @param faceB second face, can be same as faceA for singular face
 * @param faces additional faces that are connected
 * @returns the road asset variant
 */
export function roadVariant(
  faceA: Coordinate.FaceIndex,
  faceB: Coordinate.FaceIndex,
  ...faces: readonly Coordinate.FaceIndex[]
): number;
/**
 * get the variant number for a road sprite based on its RoadType
 *
 * @param type which road type?
 * @returns the road asset variant
 */
export function roadVariant(type: Road.Type): number;
/**
 * @param args overlad compatible args
 * @returns the road asset variant
 */
export function roadVariant(...args: readonly number[]): number {
  return (
    (args.length === 1
      ? args[0]
      : (Road.type(...(args as Coordinate.FaceIndex[])) as number)) - 1
  );
}

/**
 * get the frame key for this object
 *
 * @param object the object to draw
 * @param variant which drawing variant if any
 * @returns the frame key to use when adding the frame to a scene
 */
const frameKey = (
  // todo decor extension Road
  object: "Road" | TileKey | Tile | TileInstance,
  variant?: number,
): string => {
  const key: TileKey =
    typeof object === "string"
      ? object
      : "tag" in object
      ? object.tag
      : object.tile.tag;
  if (frames[key] instanceof Array) {
    variant =
      variant == null
        ? frames[key].length * Math.random()
        : variant % frames[key].length;
    return key + Math.floor(variant);
  } else {
    return key + "0";
  }
};

export type TileSprites = SpriteFactory<
  "TileSprites",
  "Road" | TileKey | Tile | TileInstance,
  number
>;
export type TileSprite = SpriteImageFor<TileSprites>;
const asTileSprite = asSpriteImage<TileSprite>();

/**
 * TileSprites sprite factory
 */
export const TileSprites: TileSprites = {
  frameWidth: 256,
  frameHeight: 384,
  width: TileAxis.fromNumber(256),
  height: TileAxis.fromNumber(256),
  cx: 128,
  cy: 256,
  margin: deepReadonly({
    top: 128,
    right: 0,
    bottom: 0,
    left: 0,
  }),

  load: (scene: Phaser.Scene): Phaser.Scene => {
    (Object.keys(frames) as TileKey[]).forEach((tile) => {
      let images = frames[tile];
      if (!(images instanceof Array)) {
        images = [images as string];
      }
      scene.load.image(tile + "0", images[0]);
      images
        .slice(1)
        .forEach((image, idx) => scene.load.image(tile + (idx + 1), image));
    });
    return scene;
  },

  add: (
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: "Road" | TileKey | Tile | TileInstance,
    variant?: number,
  ): TileSprite =>
    asTileSprite(
      scene.add
        .image(
          x - TileSprites.margin.left,
          y - TileSprites.margin.top,
          frameKey(frame, variant),
        )
        .setOrigin(0, 0),
    ),

  moveTo: (frame: TileSprite, x: number, y: number): TileSprite =>
    frame.setX(x - TileSprites.margin.left).setY(y - TileSprites.margin.top),
};
