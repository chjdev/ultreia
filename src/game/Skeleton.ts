import * as Phaser from "phaser";

type DirectionKey =
  | "west"
  | "northWest"
  | "north"
  | "northEast"
  | "east"
  | "southEast"
  | "south"
  | "southWest";

interface Direction {
  offset: number;
  x: number;
  y: number;
  opposite: DirectionKey;
}

const directions: Record<DirectionKey, Direction> = {
  west: { offset: 0, x: -2, y: 0, opposite: "east" },
  northWest: { offset: 32, x: -2, y: -1, opposite: "southEast" },
  north: { offset: 64, x: 0, y: -2, opposite: "south" },
  northEast: { offset: 96, x: 2, y: -1, opposite: "southWest" },
  east: { offset: 128, x: 2, y: 0, opposite: "west" },
  southEast: { offset: 160, x: 2, y: 1, opposite: "northWest" },
  south: { offset: 192, x: 0, y: 2, opposite: "north" },
  southWest: { offset: 224, x: -2, y: 1, opposite: "northEast" },
};

const anims = {
  idle: {
    startFrame: 0,
    endFrame: 4,
    speed: 0.2,
  },
  walk: {
    startFrame: 4,
    endFrame: 12,
    speed: 0.15,
  },
  attack: {
    startFrame: 12,
    endFrame: 20,
    speed: 0.11,
  },
  die: {
    startFrame: 20,
    endFrame: 28,
    speed: 0.2,
  },
  shoot: {
    startFrame: 28,
    endFrame: 32,
    speed: 0.1,
  },
};

type Motion = keyof typeof anims;
type Animation = typeof anims[Motion];
type Frame = Animation["startFrame"];

export class Skeleton extends Phaser.GameObjects.Image {
  private readonly distance: number;
  private readonly motion: Motion;
  private readonly speed: number;
  private startX: number;
  private startY: number;
  private anim: Animation;
  private direction: Direction;
  private frameIdx: Frame;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    motion: Motion,
    directionKey: DirectionKey,
    distance: number,
  ) {
    const direction = directions[directionKey];
    const anim = anims[motion];
    const frame = anim.startFrame;
    super(scene, x, y, "skeleton", direction.offset + frame);

    this.startX = x;
    this.startY = y;
    this.distance = distance;
    this.motion = motion;
    this.anim = anim;
    this.direction = direction;
    this.speed = 0.15;
    this.frameIdx = frame;
    this.depth = y + 64;
    scene.time.delayedCall(this.anim.speed * 1000, this.changeFrame, [], this);
  }

  public changeFrame() {
    this.frameIdx++;

    if (this.frameIdx === this.anim.endFrame) {
      let delay = 0;
      switch (this.motion) {
        case "walk":
          break;
        case "attack":
          delay = Math.random() * 2;
          break;
        case "idle":
          delay = 0.5 + Math.random();
          break;
        case "die":
          delay = 6 + Math.random() * 6;
          break;
      }
      this.scene.time.delayedCall(delay * 1000, this.resetAnimation, [], this);
    } else {
      this.frame = this.texture.get(this.direction.offset + this.frameIdx);
      this.scene.time.delayedCall(
        this.anim.speed * 1000,
        this.changeFrame,
        [],
        this,
      );
    }
  }

  public resetAnimation() {
    this.frameIdx = this.anim.startFrame;
    this.frame = this.texture.get(this.direction.offset + this.frameIdx);
    this.scene.time.delayedCall(
      this.anim.speed * 1000,
      this.changeFrame,
      [],
      this,
    );
  }

  public update() {
    if (this.motion === "walk") {
      this.x += this.direction.x * this.speed;

      if (this.direction.y !== 0) {
        this.y += this.direction.y * this.speed;
        this.depth = this.y + 64;
      }

      //  Walked far enough?
      if (
        Phaser.Math.Distance.Between(
          this.startX,
          this.startY,
          this.x,
          this.y,
        ) >= this.distance
      ) {
        this.direction = directions[this.direction.opposite];
        this.frameIdx = this.anim.startFrame;
        this.frame = this.texture.get(this.direction.offset + this.frameIdx);
        this.startX = this.x;
        this.startY = this.y;
      }
    }
  }
}
