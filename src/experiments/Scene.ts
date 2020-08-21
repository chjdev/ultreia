import { SceneData } from "./SceneData";
import { retina } from "./render/utils";
import { Textures } from "./render/Textures";
import { GraphNode, isGraphNode, node } from "./GraphNode";

export interface Scene extends GraphNode {
  context: WebGL2RenderingContext;
  data: SceneData;
}

export const isScene = (value: any): value is Scene =>
  "context" in value && isGraphNode(value);

const sceneIds = new Set<string>();

export const scene = async (
  ...children: readonly GraphNode[]
): Promise<Scene> => {
  const canvas = document.createElement("canvas");
  do {
    canvas.id = Math.random()
      .toString()
      .slice(2);
  } while (sceneIds.has(canvas.id));
  sceneIds.add(canvas.id);
  canvas.width = document.body.clientWidth * retina;
  canvas.height = document.body.clientHeight * retina;
  canvas.style.zIndex = "0";
  document.body.appendChild(canvas);
  const context = canvas.getContext("webgl2");
  if (context == null) {
    throw new Error("could not create webgl context");
  }
  context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);
  context.enable(context.BLEND);

  const data = new SceneData(...(await Textures.loadTextures(context)));
  const visual = node<Scene>(null, { context, data }, {}, ...children);
  return visual;
};
