import { clear, Primitives, retina } from "./RenderUtils";
import render = Primitives.Rectangle.render;

interface InternalGraphNode {
  graph: SceneGraph;
  pending: boolean;
  children: InternalGraphNode[];
}

interface GraphNode
  extends Omit<InternalGraphNode, "pending" | "children" | "graph"> {
  readonly graph: SceneGraph;
  readonly pending: boolean;
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

interface VisualNode extends GraphNode, Primitives.Primitive {}

interface Scene extends VisualNode {
  context: WebGL2RenderingContext;
}

const isScene = (value: any): value is Scene =>
  "context" in value && isGraphNode(value);

interface Rectangle extends VisualNode, Primitives.Rectangle {}

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

const addChildren = <T extends GraphNode>(
  node: T,
  ...children: readonly GraphNode[]
): T => {
  assertGraphParentage(node, ...children);
  node.children = [...node.children, ...children];
  return node;
};

const removeChildren = <T extends GraphNode>(
  node: T,
  ...children: readonly GraphNode[]
): T => {
  assertGraphParentage(node, ...children);
  node.children = node.children.filter((child) => !children.includes(child));
  return node;
};

class SceneGraph {
  private sceneIds = new Set<string>();
  private updateRequested: number = 0;
  private updateDebounced: boolean = false;
  private readonly internalRoot: InternalGraphNode;

  public constructor() {
    this.internalRoot = this.internalNode({});
  }

  public addChildren(...children: readonly GraphNode[]): GraphNode {
    return addChildren(this.root, ...children);
  }

  public removeChildren(...children: readonly GraphNode[]): GraphNode {
    return removeChildren(this.root, ...children);
  }

  public get root(): GraphNode {
    return this.internalRoot;
  }

  private update() {
    const renderPlan = new Map<
      string,
      {
        scene: Scene;
        pending: boolean;
        elements: Rectangle[];
      }
    >();
    const elements: [
      InternalGraphNode,
      number,
      WebGL2RenderingContext | null,
    ][] = this.internalRoot.children.map((child) => [child, 0, null]);
    let nextElement;
    while ((nextElement = elements.pop()) != null) {
      const [current, zIndex, context] = nextElement;
      if (isScene(current)) {
        const sceneCanvas = current.context.canvas as HTMLCanvasElement;
        renderPlan.set(sceneCanvas.id, {
          scene: current,
          pending: current.pending,
          elements: [],
        });
        if (sceneCanvas.style.zIndex !== zIndex.toString()) {
          sceneCanvas.style.zIndex = zIndex.toString();
        }
        // todo
        // sceneCanvas.style.background = current.backgroundColor;
        const visibility = current.visible ? "inherit" : "hidden";
        if (sceneCanvas.style.visibility !== visibility) {
          sceneCanvas.style.visibility = visibility;
        }
        elements.push(
          ...current.children.map((child): [
            InternalGraphNode,
            number,
            WebGL2RenderingContext,
          ] => [child, zIndex + 1, current.context]),
        );
        continue;
      }

      if (context == null) {
        //nothing to render
        console.debug("orphan node", current, zIndex);
        continue;
      }

      if (isRectangle(current) && current.visible) {
        const contextId = (context.canvas as HTMLCanvasElement).id;
        const subPlan = renderPlan.get(contextId);
        if (subPlan == null) {
          console.assert(
            subPlan != null,
            "this should not happen, elements array is set in scene",
          );
          continue;
        }
        // todo more fine grained that checks overlaps?!
        subPlan.pending = subPlan.pending || current.pending;
        subPlan.elements.push(current);
        elements.push(
          ...current.children.map((child): [
            InternalGraphNode,
            number,
            WebGL2RenderingContext,
          ] => [child, zIndex + 1, context]),
        );
        continue;
      }
    }

    for (const { scene, pending, elements } of renderPlan.values()) {
      if (!pending) {
        continue;
      }
      clear(scene.context);
      render(scene.context, ...elements);
      (([scene, ...elements] as unknown) as InternalGraphNode[]).forEach(
        (element) => (element.pending = false),
      );
    }

    this.internalRoot.pending = false;
  }

  public requestUpdate() {
    this.updateRequested++;
    if (!this.updateDebounced) {
      this.updateDebounced = true;
      const numUpdated = this.updateRequested;
      window.requestAnimationFrame(() => {
        this.update();
        this.updateRequested -= numUpdated;
        this.updateDebounced = false;
        // pick up stragglers
        if (this.updateRequested > 0) {
          this.requestUpdate();
        }
      });
    }
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
        graph: this,
        pending: true as boolean,
        children: [] as InternalGraphNode[],
      } as T & InternalGraphNode,
      {
        set: <P extends keyof T>(
          target: T & InternalGraphNode,
          prop: P,
          value: T[P],
        ): boolean => {
          // if (!(prop in target)) {
          //   console.error("Key not found in target: " + JSON.stringify(target));
          //   return false;
          // }
          (target as T)[prop] = value;
          if (prop !== "pending" && (target as T)[prop] !== false) {
            target.pending = true;
            target.graph.requestUpdate();
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
    addChildren(internalNode, ...children);
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
    { backgroundColor, visible = true }: AsPartialArgs<T> = {},
    ...children: readonly GraphNode[]
  ): T {
    return this.node(
      {
        backgroundColor,
        visible,
      },
      ...children,
    ) as T;
  }

  public scene<T extends Scene>(
    args: AsPartialArgs<T> = {},
    ...children: readonly GraphNode[]
  ): T {
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
    Object.assign(visual, { context });
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

export const run = () => {
  const g = new SceneGraph();
  const scene = g.scene();
  const rect = g.rectangle(
    {
      width: 600,
      height: 400,
      backgroundColor: { r: 1.0 },
      borderRadius: { tr: 0.25, tl: 0.25, bl: 0.25, br: -0.5 },
    },
    g.scene(
      {},
      g.rectangle(
        {
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          backgroundColor: { g: 1.0 },
        },
        g.rectangle({
          x: 12,
          y: 12,
          width: 20,
          height: 20,
          backgroundColor: { b: 1.0, a: 0.5 },
          borderRadius: { tr: 1.0, tl: 1.0, bl: 1.0, br: 1.0 },
        }),
      ),
    ),
    g.rectangle({
      x: 50,
      y: 50,
      width: 10,
      height: 10,
      backgroundColor: { g: 1.0 },
    }),
  );
  addChildren(scene, rect);
  g.addChildren(scene);
  const start = new Date().getTime();
  const fade = () =>
    window.requestAnimationFrame(() => {
      const color = rect.backgroundColor ?? {};
      const { b = 0 } = color;
      rect.x = ((new Date().getTime() - start) / 500) * 5;
      rect.width = 500 + Math.random() * 100;
      rect.borderRadius = {
        ...(rect.borderRadius ?? {}),
        br: Math.random(),
        tl: Math.random(),
      };
      rect.backgroundColor = { ...color, b: b + 0.01 };
      if (b < 1) {
        window.requestAnimationFrame(fade);
      } else {
        console.log("done");
      }
    });
  fade();
};
