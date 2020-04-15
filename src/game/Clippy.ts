import { Coordinate, CoordinateIndexed } from "../core/Coordinate";
import * as Phaser from "phaser";
import deepEqual from "fast-deep-equal";
import { useTileDimensionsView } from "../core/MatchContext";
import Camera = Phaser.Cameras.Scene2D.Camera;
import Zoom = Phaser.Cameras.Scene2D.Effects.Zoom;

interface ClipRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Helper class that performs actions on tiles switching their "clipped" state, i.e. tiles that are outside the camera.
 */
export class Clippy<E> {
  private oldVisible: ClipRectangle;

  /**
   * @param fun the action to be performed on tiles switching their clipped state, i.e. visibility is changing.
   *    fun takes the element changing state, it's visibility, the coordinate of the element and the underlying coordinate
   *    indexed collection.
   * @param indexed the underlying coordinate indexed collection of elements
   * @param camera the scene camera used to determine visibility
   * @param tileWidth (optional) the width of a tile (default: from context)
   * @param tileHeight (optional) the height of a tile (default: from context)
   */
  public constructor(
    private readonly fun: (
      element: E,
      visible: boolean,
      coord: Coordinate,
      collection: CoordinateIndexed<E>,
    ) => void,
    private readonly indexed: CoordinateIndexed<E>,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly tileWidth: number = useTileDimensionsView().width(),
    private readonly tileHeight: number = useTileDimensionsView().height(),
  ) {
    camera.on(Phaser.Cameras.Scene2D.Events.ZOOM_COMPLETE, this.updateNew);
    camera.on(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, this.updateNew);
    this.oldVisible = {
      x: camera.worldView.centerX,
      y: camera.worldView.centerY,
      width: 0,
      height: 0,
    };
    window.requestAnimationFrame(() =>
      this.clip(this.oldVisible, Clippy.rectangle(camera)),
    );
  }

  /**
   * cleanup actions
   */
  public close() {
    this.camera.removeListener(
      Phaser.Cameras.Scene2D.Events.ZOOM_COMPLETE,
      this.updateNew,
    );
    this.camera.removeListener(
      Phaser.Cameras.Scene2D.Events.PAN_COMPLETE,
      this.updateNew,
    );
  }

  /**
   * convert a scene camera into a world pixel rect outlining the visible area
   *
   * @param camera the scene camera to convert
   * @returns a world pixel rect
   */
  private static rectangle(camera: Camera) {
    return {
      x: camera.worldView.x,
      y: camera.worldView.y,
      width: camera.worldView.width,
      height: camera.worldView.height,
    };
  }

  /**
   * update clip on camera change
   *
   * @param _ (unused) the camera instance
   * @param camera the zoomed camera instance
   */
  private readonly updateNew = (_: Camera, { camera }: Zoom) => {
    const oldVisible = this.oldVisible;
    const newVisible = Clippy.rectangle(camera);
    if (!deepEqual(oldVisible, newVisible)) {
      window.requestAnimationFrame(() => {
        this.clip(oldVisible, newVisible);
      });
    }
  };

  /**
   * world from coordinate with pixel coordinate anchored in center
   *
   * @param coord the coordinate to convert
   * @returns pixel coordinates off tile center
   */
  private worldFromCoordinate(coord: Coordinate): [number, number] {
    const [tx, ty] = Coordinate.toWorld(coord, this.tileWidth, this.tileHeight);
    return [tx + this.tileWidth / 2, ty + this.tileHeight / 2];
  }

  /**
   * perform clip transition for all tile's changing visibility state, i.e.
   * all tiles not in the intersection of oldVisible and newVisible. E.g. all
   * tiles marked "x":
   * |--------------|
   * |xxxxxxxxxxxxxx|
   * |xxxx|--------------|
   * |xxxx|         |xxxx|
   * |xxxx|         |xxxx|
   * |----|---------|xxxx|
   *      |xxxxxxxxxxxxxx|
   *      |--------------|
   *
   * @param oldVisible old visible rectangle
   * @param newVisible new visible rectangle
   */
  private clip(oldVisible: ClipRectangle, newVisible: ClipRectangle): void {
    const tileWidth = this.tileWidth;
    const tileHeight = this.tileHeight;
    const renderMargin = 300;
    const total = {
      minX: Math.max(0, Math.min(newVisible.x, oldVisible.x) - renderMargin),
      minY: Math.max(0, Math.min(newVisible.y, oldVisible.y) - renderMargin),
      maxX:
        Math.max(
          newVisible.x + newVisible.width,
          oldVisible.x + oldVisible.width,
        ) + renderMargin,
      maxY:
        Math.max(
          newVisible.y + newVisible.height,
          oldVisible.y + oldVisible.height,
        ) + renderMargin,
    };
    const intersect = {
      minX: Math.max(newVisible.x, oldVisible.x),
      minY: Math.max(newVisible.y, oldVisible.y),
      maxX: Math.min(
        newVisible.x + newVisible.width,
        oldVisible.x + oldVisible.width,
      ),
      maxY: Math.min(
        newVisible.y + newVisible.height,
        oldVisible.y + oldVisible.height,
      ),
    };
    const start = Coordinate.fromWorld(
      total.minX,
      total.minY,
      tileWidth,
      tileHeight,
    );
    const stop = Coordinate.fromWorld(
      total.maxX,
      total.maxY,
      tileWidth,
      tileHeight,
    );
    this.indexed.slice(start, stop).forEach((element, coord) => {
      const [x, y] = this.worldFromCoordinate(coord);
      if (
        x >= intersect.minX &&
        x <= intersect.maxX &&
        y >= intersect.minY &&
        y <= intersect.maxY
      ) {
        //nothing todo;
        return;
      }
      this.fun(
        element,
        x >= newVisible.x - renderMargin &&
          x <= newVisible.x + newVisible.width + renderMargin &&
          y >= newVisible.y - renderMargin &&
          y <= newVisible.y + newVisible.height + renderMargin,
        coord,
        this.indexed,
      );
    });
    this.oldVisible = newVisible;
  }
}
