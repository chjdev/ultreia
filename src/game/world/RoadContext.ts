import * as Phaser from "phaser";
import { InteractionContext } from "./InteractionContext";
import { Coordinate, CoordinateIndexed } from "../../core/Coordinate";
import {
  useInteraction,
  useMap,
  useTileDimensionsView,
} from "../../core/MatchContext";
import { roadVariant, TileSprite, TileSprites } from "../sprites/TileSprites";
import { Sounds } from "../Sounds";
import { isRoadPoint } from "../../core/tiles/checkers";
import { Road } from "../../core/Road";

/**
 * An interaction context responsible for building roads between buildings.
 */
export class RoadContext implements InteractionContext {
  /** starting coordinate of new road */
  private from: Coordinate | null = null;
  /** currently building road */
  private road: Road | null = null;
  /** image sprites for the currently building road */
  private roadTiles: readonly TileSprite[] | null = null;

  /**
   * @param scene the Phaser scene to attach to
   * @param groundTiles the image sprites to manipulate while building roads
   */
  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly groundTiles: CoordinateIndexed<Phaser.GameObjects.Image>,
  ) {}

  public hover(coord: Coordinate): void {
    if (this.from == null) {
      // not started
      return;
    }

    Sounds.raster(this.scene);
    try {
      const maybeNewRoad = Road.search(this.from, coord);
      if (this.road != null && Road.equals(this.road, maybeNewRoad)) {
        // paths equal, nothing to do
        return;
      }
      this.clearRoad();
      this.road = maybeNewRoad;
    } catch (err) {
      // no road
      return;
    }

    // get the "zindex" for the draw tiles
    const roadImageDepth = useTileDimensionsView().mapDimensions()[1];

    // for each coordinate of the road draw a road sprite
    this.roadTiles = this.road.map((coord, idx, road) => {
      const [wx, wy] = Coordinate.toWorld(coord);
      /* fromFace -> toFace describes the road sprite to use
       * [][][x][][]
       *    ^   ^
       *    f   t   ... f: fromFace, t: toFace
       * if it's the first or last tile and thus not connecting two tiles a
       * stump is used.
       */

      // on the first tile it only looks what tile it connects to not from
      const fromFace =
        idx === 0
          ? Coordinate.touchingFace(coord, road[idx + 1])
          : Coordinate.touchingFace(coord, road[idx - 1]);
      // is fromFace on first and last tile since it's not a segment, only a stump
      const toFace =
        idx === 0 || idx === road.length - 1
          ? fromFace
          : Coordinate.touchingFace(coord, road[idx + 1]);
      return TileSprites.add(
        this.scene,
        wx,
        wy,
        "Road",
        roadVariant(fromFace, toFace),
      )
        .setDepth(roadImageDepth)
        .setTint(0x99ff99);
    });
    // tint the ground tiles
    this.road.forEach((coord) => {
      this.groundTiles.get(coord)?.setTint(0x00aa00);
    });
  }

  public select(coord: Coordinate): void {
    if (this.from != null) {
      // done
      if (this.road != null && isRoadPoint(coord)) {
        useMap().roadNetwork.createRoad(this.road);
        Sounds.confirm(this.scene);
      } else {
        Sounds.cancel(this.scene);
      }
      this.clearRoad();
      this.clearFrom();
      useInteraction().selectContext();
      return;
    }

    if (isRoadPoint(coord)) {
      // start the road building
      this.from = coord;
      Sounds.select(this.scene);
    } else {
      Sounds.cancel(this.scene);
    }
  }

  /**
   * Clear current drawings: road sprites, tints
   */
  private clearRoad() {
    this.road?.forEach((coord) => this.groundTiles.get(coord)?.clearTint());
    this.roadTiles?.forEach((tile) => tile.destroy());
    this.road = null;
    this.roadTiles = null;
  }

  /**
   * Reset the context and clear current drawings
   */
  private clearFrom() {
    this.clearRoad();
    this.from = null;
  }

  public close(): void {
    this.clearRoad();
    this.clearFrom();
  }
}
