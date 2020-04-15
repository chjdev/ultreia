import { InteractionContext } from "./InteractionContext";
import { Coordinate, CoordinateIndexed } from "../../core/Coordinate";
import * as Phaser from "phaser";
import { useMapView } from "../../core/MatchContext";
import { isConstructableTile } from "../../core/tiles/Tile";
import { Sounds } from "../Sounds";

export class SelectionContext implements InteractionContext {
  private hovered: Coordinate | null = null;
  private selected: Coordinate | null = null;
  private influence: readonly Coordinate[] | null = null;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly groundTiles: CoordinateIndexed<Phaser.GameObjects.Image>,
    private readonly unitTiles: CoordinateIndexed<Phaser.GameObjects.Image>,
  ) {}

  public hover(coord: Coordinate): void {
    this.clearHover();
    this.hovered = coord;
    this.unitTiles.get(coord)?.setTint(0xdddddd);
  }

  private clearHover(): void {
    if (this.hovered != null) {
      this.unitTiles.get(this.hovered)?.clearTint();
    }
    this.hovered = null;
  }

  public select(coord: Coordinate): void {
    if (this.selected && Coordinate.equals(coord, this.selected)) {
      this.clearAll();
      this.selected = null;
      return;
    }

    this.clearHover();
    this.selected = coord;
    const cleared = this.clearInfluence();
    const tileInstance = useMapView().at(coord);
    if (isConstructableTile(tileInstance.tile)) {
      this.influence = tileInstance.tile.influence(coord);
      this.influence.forEach((coordinate: Coordinate) => {
        this.groundTiles.get(coordinate)?.setTint(0x00aa00);
      });
      Sounds.select(this.scene);
    } else if (cleared) {
      Sounds.cancel(this.scene);
    }
  }

  private clearInfluence(): boolean {
    let cleared = false;
    if (this.influence != null) {
      this.influence.forEach((coord) =>
        this.groundTiles.get(coord)?.clearTint(),
      );
      cleared = true;
    }
    this.influence = null;
    return cleared;
  }

  private clearAll() {
    this.clearHover();
    this.clearInfluence();
  }

  public close(): void {
    this.clearAll();
  }
}
