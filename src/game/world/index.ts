import * as Phaser from "phaser";
import { Coordinate, CoordinateIndexed } from "../../core/Coordinate";
import { configuration } from "../Configuration";
import { Clippy } from "../Clippy";
import {
  useInteraction,
  useInteractionView,
  useMapView,
  useTileDimensionsView,
} from "../../core/MatchContext";
import { roadVariant, TileSprites } from "../sprites/TileSprites";
import { MapEvent } from "../../core/WorldMap";
import { InteractionContext } from "./InteractionContext";
import { SelectionContext } from "./SelectionContext";
import { BuildContext } from "./BuildContext";
import { RoadContext } from "./RoadContext";
import { RoadNetworkEvent } from "../../core/RoadNetwork";
import Pointer = Phaser.Input.Pointer;
import {
  assertBuildContextEvent,
  ContextEvent,
  InteractionEvent,
} from "../../core/Interaction";

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: true,
  visible: true,
  key: "World",
};

export class WorldScene extends Phaser.Scene {
  private controls?: Phaser.Cameras.Controls.FixedKeyControl;
  private clippy?: Clippy<Phaser.GameObjects.Image>;
  private readonly groundTiles: CoordinateIndexed<Phaser.GameObjects.Image>;
  private readonly unitTiles: CoordinateIndexed<Phaser.GameObjects.Image>;
  private readonly roadTiles: CoordinateIndexed<Phaser.GameObjects.Image>;
  private interactionContext: InteractionContext;

  public constructor() {
    super(sceneConfig);
    this.groundTiles = new CoordinateIndexed<Phaser.GameObjects.Image>();
    this.unitTiles = new CoordinateIndexed<Phaser.GameObjects.Image>();
    this.roadTiles = new CoordinateIndexed<Phaser.GameObjects.Image>();
    this.interactionContext = new SelectionContext(
      this,
      this.groundTiles,
      this.unitTiles,
    );
  }

  public static addSelf(game: Phaser.Game) {
    game.scene.add(sceneConfig.key as string, WorldScene);
  }

  private buildMap() {
    useMapView().forEach((tileInstance, coord) => {
      const frame = tileInstance.tile.tag; // === "Water" ? "Water" : "Grass";
      const [wx, wy] = Coordinate.toWorld(coord);
      const wz =
        frame === "Water" ? -0.02 * useTileDimensionsView().width() : 0;
      const tile = TileSprites.add(this, wx, wy - wz, frame);
      tile.setDepth(wy + wz);
      tile.setActive(false);
      tile.setVisible(false);
      this.groundTiles.set(coord, tile);
    });
  }

  private setupMap() {
    this.buildMap();

    useMapView().listen(({ event, coord, tile }: MapEvent) => {
      if (event === "delete" || event === "update") {
        const tile = this.unitTiles.get(coord);
        if (tile != null) {
          this.unitTiles.del(coord, (tile) => tile.destroy());
        }
        if (event === "delete") {
          return;
        }
      }
      const [wx, wy] = Coordinate.toWorld(coord);
      const added = TileSprites.add(this, wx, wy, tile);
      added.depth = wy;
      this.unitTiles.set(coord, added);
    }, MapEvent.all);

    useMapView().roadNetwork.listen(({ event, coord, roadNetwork }) => {
      this.roadTiles.del(coord, (tile) => {
        tile.destroy();
      });
      if (event === "delete") {
        return;
      }

      const roadType = roadNetwork.getRoadType(coord);
      if (roadType) {
        const [wx, wy] = Coordinate.toWorld(coord);
        const added = TileSprites.add(
          this,
          wx,
          wy,
          "Road",
          roadVariant(roadType),
        );
        added.depth = wy + 1;
        this.roadTiles.set(coord, added);
      }
    }, RoadNetworkEvent.all);
  }

  private setupCamera() {
    const main = this.cameras.main;
    main.setRoundPixels(true);
    main.setSize(window.innerWidth, window.innerHeight);
    const [width, height] = useTileDimensionsView().mapDimensions();
    const { start } = configuration.camera.pan;
    main.setBounds(
      -TileSprites.frameWidth,
      -TileSprites.frameHeight,
      width + TileSprites.frameWidth,
      height + TileSprites.frameHeight,
    );
    main.zoomTo(configuration.camera.zoom.start, 0);
    main.pan(width * start.x, height * start.y, 0);

    // cursor keys
    const cursors = this.input.keyboard.createCursorKeys();
    const controlConfig = {
      camera: main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      speed: configuration.camera.pan.speed / main.zoom,
    };
    this.controls = new Phaser.Cameras.Controls.FixedKeyControl(controlConfig);

    // touchpad pan and zoom

    const minZoom = Math.min(
      this.game.scale.width / main.getBounds().width,
      this.game.scale.height / main.getBounds().height,
    );
    this.input.on("wheel", (pointer: Pointer) => {
      if (pointer.event.ctrlKey) {
        const baseZoomSpeed = 0.02 * main.zoom;
        const zoom = Math.min(
          configuration.camera.zoom.max,
          Math.max(
            minZoom,
            main.zoom -
              Math.min(pointer.deltaY, 40) *
                baseZoomSpeed *
                configuration.camera.zoom.speed,
          ),
        );
        main.zoomTo(zoom, 10);
      } else {
        const basePanSpeed = 1.2;
        const panSpeed =
          (basePanSpeed * configuration.camera.pan.speed) / main.zoom;

        main.pan(
          main.worldView.centerX + pointer.deltaX * panSpeed,
          main.worldView.centerY + pointer.deltaY * panSpeed,
          0,
        );
      }
    });

    this.clippy = new Clippy(
      (tile, visible) => tile.visible !== visible && tile.setVisible(visible),
      this.groundTiles,
      main,
    );
  }

  private setupInteraction() {
    this.input.on("pointermove", (pointer: Pointer) => {
      const coord = Coordinate.fromWorld(pointer.worldX, pointer.worldY);
      useInteraction().hover(coord);
    });
    this.input.on("pointerup", (pointer: Pointer) => {
      const coord = Coordinate.fromWorld(pointer.worldX, pointer.worldY);
      useInteraction().select(coord);
    });
    const replaceContext = (newContext: InteractionContext) => {
      this.interactionContext.close();
      this.interactionContext = newContext;
    };
    const interaction = useInteractionView();
    interaction.listen<ContextEvent>((event) => {
      switch (event.context) {
        case "road":
          replaceContext(new RoadContext(this, this.groundTiles));
          break;
        case "select":
          replaceContext(
            new SelectionContext(this, this.groundTiles, this.unitTiles),
          );
          break;
        case "build":
          assertBuildContextEvent(event);
          replaceContext(new BuildContext(this, event.tile, this.groundTiles));
          break;
        default:
          throw new Error("UnhandledEventError: " + event.context);
      }
    }, ContextEvent.context);

    interaction.listen<InteractionEvent>(
      ({ event, coordinate }) => this.interactionContext[event](coordinate),
      InteractionEvent.all,
    );
  }

  public create() {
    this.setupMap();
    this.setupCamera();
    this.setupInteraction();
  }

  public update(time: number, delta: number) {
    this.controls?.update(delta);
  }
}
