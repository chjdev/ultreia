import {
  AsPartialArgs,
  InternalGraphNode,
  mutable,
  node,
  Opts,
} from "./GraphNode";
import { SceneGraph } from "./SceneGraph";
import { defaults, isRectangle, rectangle, Rectangle } from "./Rectangle";
import { Opaque } from "ts-essentials";

export type Char = Opaque<"Char", string>;

// todo
export const isChar = (value: any): value is Char =>
  typeof value === "string" && value.length === 1;

export function assertChar(value: any): asserts value is Char {
  if (!isChar(value)) {
    throw new TypeError("value is not of type char: " + JSON.stringify(value));
  }
}

export const char = (value: string): Char => {
  assertChar(value);
  return value;
};

export interface Character
  extends Omit<
    Rectangle,
    "children" | "texture" | "x" | "y" | "width" | "height"
  > {
  readonly children: readonly [];
  texture: Char;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const isCharacter = (value: any): value is Text =>
  isChar(value.texture) && isRectangle(value);

export const character = (
  graph: SceneGraph,
  args: AsPartialArgs<Character> = {},
): Character => {
  assertChar(args.texture);
  return rectangle(graph, args) as Character;
};

export interface Text extends Omit<Rectangle, "children" | "width" | "height"> {
  fontSize: number;
  text: string;
  readonly children: readonly Character[];
  readonly width: number;
  readonly height: number;
}

export const isText = (value: any): value is Text =>
  typeof value.text === "string" && isRectangle(value);

const makeCharacterChildren = (
  graph: SceneGraph,
  {
    x,
    y,
    text,
    fontSize,
  }: {
    text: string;
    fontSize: number;
    x: number;
    y: number;
  },
): Character[] =>
  text.split("").map((char, idx) => {
    assertChar(char);
    return character(graph, {
      texture: char,
      x: x + idx * fontSize,
      y,
      width: fontSize,
      height: fontSize,
    });
  });

export const text = (
  graph: SceneGraph,
  args: AsPartialArgs<Text, "width" | "height"> = {},
): Text => {
  const { x = defaults.x, y = defaults.y, text = "", fontSize = 32 } = args;
  const width = text.length * fontSize;
  const height = fontSize;
  return node<Text>(
    graph,
    { ...defaults, ...args, text, fontSize, width, height },
    {
      forEach: Opts.multi(
        Opts.select("text", (text: string, target: Text): void => {
          if (text.length === target.children.length) {
            text.split("").forEach((char, idx) => {
              assertChar(char);
              target.children[idx].texture = char;
            });
          } else {
            console.log("set children");
            mutable(target).children = mutable(
              makeCharacterChildren(graph, { ...target, text }),
            );
            mutable<Rectangle>(target).width =
              target.children.length * target.fontSize;
          }
        }),
        Opts.select("fontSize", (fontSize: number, target: Text): void => {
          mutable<Rectangle>(target).height = fontSize;
          mutable<Rectangle>(target).width = target.children.length * fontSize;
          target.children.forEach((character, idx) => {
            mutable<Rectangle>(character).x = target.x + idx * fontSize;
            mutable<Rectangle>(character).width = fontSize;
            mutable<Rectangle>(character).height = fontSize;
          });
        }),
        Opts.select("x", (x: number, target: Text): void => {
          target.children.forEach((character, idx) => {
            mutable<Rectangle>(character).x = x + idx * target.fontSize;
          });
        }),
        Opts.select("y", (y: number, target: Text): void => {
          target.children.forEach((character) => {
            mutable<Rectangle>(character).y = y;
          });
        }),
      ),
    },
    ...makeCharacterChildren(graph, { x, y, text, fontSize }),
  );
};
