import { Rectangle as RectanglePrimitive } from "./render/primitive/Rectangle";
import { AsPartialArgs, GraphNode, isGraphNode, node } from "./GraphNode";
import { SceneGraph } from "./SceneGraph";

export interface Rectangle extends GraphNode, RectanglePrimitive {}

export const isRectangle = (value: any): value is Rectangle =>
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  isGraphNode(value);

export const defaults = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  borderRadius: {},
  backgroundColor: {},
  texture: undefined,
  visible: true,
};

export const rectangle = (
  graph: SceneGraph,
  args: AsPartialArgs<Rectangle>,
  ...children: readonly GraphNode[]
): Rectangle =>
  node<Rectangle>(graph, { ...defaults, ...args }, {}, ...children);
