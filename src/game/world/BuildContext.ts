import { InteractionContext } from "./InteractionContext";
import * as Phaser from "phaser";
import { Coordinate, CoordinateIndexed } from "../../core/Coordinate";
import { constructableTile, ConstructableTileKeys } from "../../core/tiles";
import {
  useInteraction,
  useMap,
  useTileDimensionsView,
} from "../../core/MatchContext";
import { TileSprite, TileSprites } from "../sprites/TileSprites";
import { Sounds } from "../Sounds";
import { CostGood, Inventory, InventoryView } from "../../core/Goods";
import { Territory } from "../../core/Territory";

const canAfford = <C extends CostGood>(
  coord: Coordinate,
  costs: InventoryView<C>,
): boolean => {
  const territory = Territory.from(coord);
  // todo confusing
  if (territory == null) {
    return Territory.global().warehouses().length === 0;
  }
  // todo short circuit
  return Inventory.reduce(
    (acc: boolean, cost, good: C) => acc && cost <= territory.state[good],
    true,
    costs,
  );
};

export class BuildContext implements InteractionContext {
  private buildImage: TileSprite | null = null;
  private influence: readonly Coordinate[] | null = null;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly tileKey: ConstructableTileKeys,
    private readonly groundTiles: CoordinateIndexed<Phaser.GameObjects.Image>,
  ) {
    const buildImageDepth = useTileDimensionsView().mapDimensions()[1];
    this.buildImage = TileSprites.add(this.scene, 0, 0, this.tileKey).setDepth(
      buildImageDepth,
    );
  }

  public hover(coord: Coordinate): void {
    if (this.buildImage == null) {
      console.warn("build context closed");
      return;
    }
    TileSprites.moveTo(this.buildImage, ...Coordinate.toWorld(coord));
    Sounds.raster(this.scene);
    this.clearInfluence();
    const tile = constructableTile(this.tileKey);
    const affordable = canAfford(coord, tile.costs);
    this.influence = tile.influence(coord);
    this.influence.forEach((coordinate: Coordinate) => {
      this.groundTiles
        .get(coordinate)
        ?.setTint(
          tile.allowed(coord) ? (affordable ? 0x00aa00 : 0xff9900) : 0xaa0000,
        );
    });
  }

  public select(coord: Coordinate): void {
    if (this.buildImage == null) {
      console.warn("build context closed");
      return;
    }
    const territory = Territory.from(coord);
    const tile = constructableTile(this.tileKey);
    if (
      tile.allowed(coord) &&
      ((territory == null && Territory.global().warehouses().length === 0) ||
        canAfford(coord, tile.costs))
    ) {
      if (territory != null) {
        // todo should this be done here? seems like a core game mechanic
        Inventory.forEach(
          (cost, good: CostGood) => (territory.state[good] -= cost),
          tile.costs,
        );
      }
      useMap().create(coord, tile);
      Sounds.confirm(this.scene);
    } else {
      Sounds.cancel(this.scene);
    }
    this.clearInfluence();
    useInteraction().selectContext();
  }

  private clearInfluence() {
    if (this.influence != null) {
      this.influence.forEach((coord) =>
        this.groundTiles.get(coord)?.clearTint(),
      );
    }
    this.influence = null;
  }

  public close(): void {
    this.clearInfluence();
    this.buildImage?.destroy();
    this.buildImage = null;
  }
}
