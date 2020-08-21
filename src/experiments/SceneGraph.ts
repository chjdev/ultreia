import { scene, Scene } from "./Scene";
import { addChildren, AsPartialArgs, GraphNode, mutable } from "./GraphNode";
import { rectangle, Rectangle } from "./Rectangle";
import { Rectangle as RectanglePrimitive } from "./render/primitive/Rectangle";
import { text, Text } from "./Text";

export class SceneGraph {
  private updateRequested: number = 0;
  private updateDebounced: boolean = false;

  private constructor(public readonly root: Scene) {}

  public static async init(
    ...children: readonly GraphNode[]
  ): Promise<SceneGraph> {
    const s = await scene(...children);
    const sceneGraph = new SceneGraph(s);
    mutable(s).graph = sceneGraph;
    return sceneGraph;
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

  public at(x: number, y: number): Promise<GraphNode | undefined>;
  public at(
    x: number,
    y: number,
    fun?: (node: GraphNode | undefined) => void,
  ): Promise<GraphNode | undefined> | void {
    if (fun == null) {
      return new Promise((resolve) => {
        RectanglePrimitive.render(this.root.context, this.root.data, {
          x,
          y,
          onClick: (id: number) => {
            resolve(this.walkTo(id));
          },
        });
      });
    } else {
      RectanglePrimitive.render(this.root.context, this.root.data, {
        x,
        y,
        onClick: (id: number) => {
          fun(this.walkTo(id));
        },
      });
    }
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

  public reindex(after?: GraphNode["id"]) {
    // todo only rectangles atm
    const elements = this.root.children.slice(0);
    const flat: GraphNode[] = [];
    let current: GraphNode | undefined;
    let found: boolean = after == null;
    let foundIdx: number = -1;
    while ((current = elements.shift()) != null) {
      // unindexed child kick off indexing from here
      if (!found && current.id == null) {
        found = true;
        foundIdx++;
      }
      if (found) {
        flat.push(current);
      } else {
        found = after === current.id;
        foundIdx++;
      }
      elements.unshift(...current.children);
    }

    this.root.data.resize(flat.length + foundIdx + 1);
    flat.forEach((element, idx) => {
      // this.root.data.setRectangle(idx, element as Rectangle);
      // sets the whole rectangle anyway
      mutable(element).id = idx + foundIdx + 1;
    });
  }

  public addChildren(...children: readonly GraphNode[]) {
    addChildren(this.root, ...children);
  }

  public rectangle(
    args: AsPartialArgs<Rectangle> = {},
    ...children: readonly GraphNode[]
  ): Rectangle {
    return rectangle(this, args, ...children);
  }

  public text(args: AsPartialArgs<Text> = {}): Text {
    return text(this, args);
  }
}

export const run = async () => {
  const g = await SceneGraph.init();
  const text = g.text({
    text: "hello-",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    backgroundColor: { r: 1, b: 1, a: 0.5 },
    borderRadius: { tr: 0.25, tl: 0.25, bl: 0.25, br: 0.25 },
  });
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
      text,
    ),
    g.rectangle({
      x: 50,
      y: 50,
      width: 30,
      height: 30,
      backgroundColor: { g: 0.75 },
      borderRadius: { tr: 1.0 },
      texture: "3",
    }),
  );
  g.addChildren(rect);
  const start = new Date().getTime();
  const fade = () => {
    const color = rect.backgroundColor ?? {};
    const { b = 0 } = color;
    rect.x = Math.floor((new Date().getTime() - start) / 50);
    rect.borderRadius = { ...rect.borderRadius, br: Math.random() };
    rect.backgroundColor = { ...color, b: b + 0.001 };
    text.text = `hello-${new Date().getSeconds()}`;
    text.fontSize += 0.05;
    text.x = rect.x + 10;
    text.y += 0.1;
    if (b < 1) {
      window.requestAnimationFrame(fade);
    } else {
      console.log("done");
    }
  };
  fade();
  window.onclick = async ({ clientX, clientY }: MouseEvent) => {
    const node = await g.at(clientX, clientY);
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
  };
};
