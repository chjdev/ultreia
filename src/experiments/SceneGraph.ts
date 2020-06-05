import { Primitive } from "./render/primitive/Primitive";
import { Rectangle as RectanglePrimitive } from "./render/primitive/Rectangle";
import { retina } from "./render/utils";
import { Textures } from "./render/Textures";
import { SceneData } from "./SceneData";

interface InternalGraphNode {
  id: number;
  graph: SceneGraph;
  pending: boolean;
  children: InternalGraphNode[];
}

interface GraphNode
  extends Omit<InternalGraphNode, "id" | "pending" | "children" | "graph"> {
  readonly graph: SceneGraph;
  readonly pending: boolean;
  readonly id: number;
  children: readonly GraphNode[];
}

const isGraphNode = (value: any): value is GraphNode =>
  value.graph instanceof SceneGraph &&
  typeof value.pending === "boolean" &&
  Array.isArray(value.children);

type AsArgs<T extends GraphNode | InternalGraphNode> = Omit<
  T,
  "pending" | "children" | "graph"
>;
type AsPartialArgs<T extends GraphNode | InternalGraphNode> = Partial<
  AsArgs<T>
>;

interface VisualNode extends GraphNode, Primitive {}

interface Scene extends VisualNode {
  context: WebGL2RenderingContext;
  data: SceneData;
}

const isScene = (value: any): value is Scene =>
  "context" in value && isGraphNode(value);

interface Rectangle extends VisualNode, RectanglePrimitive {}

const isRectangle = (value: any): value is Rectangle =>
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  isGraphNode(value);

const checkGraphParentage = <T extends GraphNode>(
  node: T,
  ...children: readonly GraphNode[]
): boolean => {
  for (const child of children) {
    if (child.graph !== node.graph) {
      return false;
    }
    if (
      child.children.length !== 0 &&
      !checkGraphParentage(child, ...child.children)
    ) {
      return false;
    }
  }
  return true;
};

const assertGraphParentage = <T extends GraphNode>(
  node: T,
  ...children: readonly GraphNode[]
): void => {
  if (!checkGraphParentage(node, ...children)) {
    throw new Error("node has incorrect graph lineage");
  }
};

export const addChildren = (
  node: GraphNode,
  ...children: readonly GraphNode[]
): GraphNode => {
  assertGraphParentage(node, ...children);
  node.children = [...node.children, ...children];
  return node;
};

export const removeChildren = (
  node: GraphNode,
  ...children: readonly GraphNode[]
): GraphNode => {
  assertGraphParentage(node, ...children);
  node.children = node.children.filter((child) => !children.includes(child));
  return node;
};

class SceneGraph {
  private sceneIds = new Set<string>();
  private updateRequested: number = 0;
  private updateDebounced: boolean = false;
  // todo
  private internalRoot!: Scene;

  public get root(): Scene {
    return this.internalRoot;
  }

  public async init() {
    this.internalRoot = await this.scene();
  }

  private walkTo(id: number): GraphNode | undefined {
    if (id === -1) {
      return this.root;
    }
    const elements = this.root.children.slice(0);
    let current = null;
    let counter = 0;
    while ((current = elements.shift()) != null) {
      if (id === counter) {
        return current;
      }
      counter++;
      elements.unshift(...current.children);
    }
  }

  public at(
    x: number,
    y: number,
    fun: (node: GraphNode | undefined) => void,
  ): void {
    RectanglePrimitive.render(this.root.context, this.root.data, {
      x,
      y,
      onClick: (id: number) => {
        fun(this.walkTo(id));
      },
    });
  }

  private update() {
    RectanglePrimitive.render(this.root.context, this.root.data);
  }

  public requestUpdate() {
    this.updateRequested++;
    if (!this.updateDebounced) {
      this.updateDebounced = true;
      const numUpdated = this.updateRequested;
      //todo
      // window.requestAnimationFrame(() => {
      // seems smoother
      setTimeout(() => {
        this.update();
        this.updateRequested -= numUpdated;
        this.updateDebounced = false;
        // pick up stragglers
        if (this.updateRequested > 0) {
          this.requestUpdate();
        }
      }, 32); // 32 ~ 30fps, 16 ~ 60fps
    }
  }

  private reindex() {
    // todo only rectangles atm
    const elements = this.root.children.slice(0);
    const flat: GraphNode[] = [];
    let current = null;
    while ((current = elements.shift()) != null) {
      (current as InternalGraphNode).id = flat.length;
      flat.push(current);
      elements.unshift(...current.children);
    }

    flat.forEach((element, idx) => {
      this.root.data.setRectangle(idx, element as Rectangle);
      (element as InternalGraphNode).pending = false;
    });
    this.requestUpdate();
  }

  private internalNode<
    T extends Record<
      string,
      | string
      | number
      | boolean
      | undefined
      | Readonly<Record<string, string | number | boolean | undefined>>
    >
  >(target: T, ...children: readonly GraphNode[]): T & InternalGraphNode {
    const internalNode = new Proxy<T & InternalGraphNode>(
      {
        ...target,
        id: -1,
        graph: this,
        pending: true as boolean,
        children: children as InternalGraphNode[],
      } as T & InternalGraphNode,
      {
        set: <P extends keyof T>(
          target: T & InternalGraphNode,
          prop: P,
          value: T[P],
        ): boolean => {
          (target as T)[prop] = value;
          if (prop !== "pending") {
            target.pending = true;
          }

          if (prop === "children") {
            target.graph.reindex();
          } else if (target.pending) {
            // todo scene? only rectangles for now?
            if (isRectangle(target) && target.id >= 0) {
              target.graph.root.data.setRectangle(target.id, target);
            }
            target.graph.requestUpdate();
            target.pending = false;
          }
          return true;
        },
        defineProperty: () => {
          throw new Error("not supported");
        },
        deleteProperty: () => {
          throw new Error("not supported");
        },
      },
    );
    return internalNode;
  }

  public node<
    T extends Record<
      string,
      | string
      | number
      | boolean
      | undefined
      | Readonly<Record<string, string | number | boolean | undefined>>
    >
  >(target: T, ...children: readonly GraphNode[]): T & GraphNode {
    return this.internalNode(target, ...children);
  }

  public visualNode<T extends VisualNode>(
    { backgroundColor, texture, visible = true }: AsPartialArgs<T> = {},
    ...children: readonly GraphNode[]
  ): T {
    return this.node(
      {
        backgroundColor,
        texture,
        visible,
      },
      ...children,
    ) as T;
  }

  public async scene<T extends Scene>(
    args: AsPartialArgs<T> = {},
    ...children: readonly GraphNode[]
  ): Promise<T> {
    const visual = this.visualNode(args, ...children) as T;
    const canvas = document.createElement("canvas");
    do {
      canvas.id = Math.random()
        .toString()
        .slice(2);
    } while (this.sceneIds.has(canvas.id));
    this.sceneIds.add(canvas.id);
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
    const [texture, textureMap] = await Textures.loadTextures(context);
    Object.assign(visual, {
      context,
      data: new SceneData(texture, textureMap),
    });
    return visual;
  }

  public rectangle(
    args: AsPartialArgs<Rectangle> = {},
    ...children: readonly GraphNode[]
  ): Rectangle {
    const { x = 0, y = 0, width = 0, height = 0, borderRadius } = args;
    const visual = this.visualNode(args, ...children) as Rectangle;
    Object.assign(visual, {
      x,
      y,
      width,
      height,
      borderRadius,
    });
    return visual;
  }
}

export const run = async () => {
  const g = new SceneGraph();
  await g.init();
  const rect = g.rectangle(
    {
      width: 256,
      height: 384,
      backgroundColor: { r: 1.0 },
      borderRadius: { tr: 0.25, tl: 0.25, bl: 0.25, br: -0.5 },
      texture: "Pioneer",
    },
    g.rectangle(
      {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        backgroundColor: { g: 1.0 },
        texture: "Hunter",
      },
      g.rectangle({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        backgroundColor: { b: 1.0, a: 0.5 },
        borderRadius: { tr: 1.0, tl: 1.0, bl: 1.0, br: 1.0 },
        texture: "Water",
      }),
    ),
    g.rectangle({
      x: 50,
      y: 50,
      width: 30,
      height: 30,
      backgroundColor: { g: 0.75 },
      borderRadius: { tr: 1.0 },
      texture: "Tanner",
    }),
  );
  addChildren(g.root, rect);
  const start = new Date().getTime();
  const fade = () => {
    const color = rect.backgroundColor ?? {};
    const { b = 0 } = color;
    rect.x = (new Date().getTime() - start) / 50;
    rect.borderRadius = { ...rect.borderRadius, br: Math.random() };
    rect.backgroundColor = { ...color, b: b + 0.001 };
    if (b < 1) {
      window.requestAnimationFrame(fade);
    } else {
      console.log("done");
    }
  };
  fade();
  window.onclick = ({ clientX, clientY }: MouseEvent) => {
    g.at(clientX, clientY, (node) => {
      if (node == null) {
        return;
      }
      (node as Rectangle).borderRadius = {
        tl: Math.random(),
        tr: Math.random(),
        br: Math.random(),
        bl: Math.random(),
      };
      console.log(node);
    });
  };
};
