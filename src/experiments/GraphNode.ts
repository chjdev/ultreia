import { SceneGraph } from "./SceneGraph";
import { Rectangle } from "./Rectangle";

export interface InternalGraphNode {
  graph: SceneGraph | null;
  id: number | null;
  pending: boolean;
  children: InternalGraphNode[];
}

export interface GraphNode
  extends Omit<InternalGraphNode, "id" | "pending" | "children" | "graph"> {
  readonly graph: SceneGraph | null;
  readonly pending: boolean;
  readonly id: number | null;
  children: readonly GraphNode[];
}

export const isGraphNode = (value: any): value is GraphNode =>
  value != null &&
  (typeof value.id === "number" || value.id === null) &&
  (typeof value.graph === "object" || value.graph === null) &&
  typeof value.pending === "boolean" &&
  Array.isArray(value.children);

export type AsArgs<
  T extends GraphNode | InternalGraphNode,
  Ex extends keyof T = never
> = Omit<T, "id" | "pending" | "children" | "graph" | Ex>;
export type AsPartialArgs<
  T extends GraphNode | InternalGraphNode,
  Ex extends keyof T = never
> = Partial<AsArgs<T, Ex>>;

export const checkGraphParentage = <T extends GraphNode>(
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

export type Opts<T extends InternalGraphNode | GraphNode> = {
  forEach?: <P extends keyof T>(
    value: Readonly<T[P]>,
    prop: P,
    target: T,
  ) => void;
  map?: <P extends keyof T>(
    value: Readonly<T[P]>,
    prop: P,
    target: Readonly<T>,
  ) => T[P];
  filter?: <P extends keyof T>(
    value: Readonly<T[P]>,
    prop: P,
    target: Readonly<T>,
  ) => boolean;
  assert?: <P extends keyof T>(
    value: Readonly<T[P]>,
    prop: P,
    target: Readonly<T>,
  ) => boolean;
};

export namespace Opts {
  export function select<
    T extends InternalGraphNode | GraphNode,
    P extends keyof T
  >(
    select: P,
    fun: (value: T[P], target: T) => void,
  ): (value: T[keyof T], prop: keyof T, target: T) => void;
  export function select<
    T extends InternalGraphNode | GraphNode,
    P extends keyof T
  >(
    select: P,
    fun: (value: T[P], target: T) => boolean,
  ): (value: T[keyof T], prop: keyof T, target: T) => boolean;
  export function select<
    T extends InternalGraphNode | GraphNode,
    P extends keyof T
  >(
    select: P,
    fun: (value: T[P], target: T) => void | boolean,
  ): (value: T[keyof T], prop: keyof T, target: T) => void | boolean {
    return (value: T[keyof T], prop: keyof T, target: T) => {
      if (prop === select) {
        return fun(value as T[P], target);
      }
    };
  }

  export function multi<T extends InternalGraphNode | GraphNode>(
    ...selectors: readonly (<P extends keyof T>(
      value: T[P],
      prop: P,
      target: T,
    ) => boolean)[]
  ): (value: T[keyof T], prop: keyof T, target: T) => boolean;
  export function multi<T extends InternalGraphNode | GraphNode>(
    ...selectors: readonly (<P extends keyof T>(
      value: T[P],
      prop: P,
      target: T,
    ) => void)[]
  ): (value: T[keyof T], prop: keyof T, target: T) => void;
  export function multi<T extends InternalGraphNode | GraphNode>(
    ...selectors: readonly (<P extends keyof T>(
      value: T[P],
      prop: P,
      target: T,
    ) => void | boolean)[]
  ): (value: T[keyof T], prop: keyof T, target: T) => boolean {
    return (value: T[keyof T], prop: keyof T, target: T) => {
      for (const selector of selectors) {
        if (!(selector(value, prop, target) ?? true)) {
          return false;
        }
      }
      return true;
    };
  }
}

const internalNode = <T extends InternalGraphNode>(
  graph: SceneGraph | null,
  target: AsArgs<T>,
  { filter, map, forEach, assert }: Opts<T>,
  ...children: readonly GraphNode[]
): T => {
  return new Proxy<T>(
    {
      ...target,
      id: null,
      graph,
      pending: true as boolean,
      children: children as InternalGraphNode[],
    } as T,
    {
      set: <P extends keyof T>(
        target: T,
        prop: P,
        value: T[P],
        receiver: any,
      ): boolean => {
        if (map != null) {
          value = map(value, prop, receiver);
        }

        if ((target as T)[prop] === value) {
          // nothing to do
          return true;
        }

        if (filter != null && !filter(value, prop, receiver)) {
          return true;
        }
        if (assert != null && !assert(value, prop, receiver)) {
          return false;
        }
        forEach?.(value, prop, receiver);

        (target as T)[prop] = value;
        if (prop !== "pending") {
          target.pending = true;
        }

        if (prop === "children") {
          target.graph?.reindex(target.id);
        } else if (target.pending) {
          // todo better check, only rectangles for now?
          if ("x" in target && target.id != null) {
            target.graph?.root.data.setRectangle(
              target.id,
              (target as unknown) as Rectangle,
            );
          }
          target.graph?.requestUpdate();
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
};

type Internal<T extends GraphNode> = Omit<T, keyof InternalGraphNode> &
  InternalGraphNode;

export const node = <T extends GraphNode>(
  graph: SceneGraph | null,
  target: AsArgs<T>,
  opts: Opts<T>,
  ...children: readonly GraphNode[]
): T => {
  // todo woof
  return (internalNode<Internal<T>>(
    graph,
    (target as unknown) as AsArgs<Internal<T>>,
    (opts as unknown) as Opts<Internal<T>>,
    ...children,
  ) as unknown) as T;
};

export function mutable<T extends GraphNode>(
  node: T,
): Omit<T, "id" | "pending" | "children" | "graph"> & InternalGraphNode;
export function mutable<T extends GraphNode>(
  node: readonly T[],
): (Omit<T, "id" | "pending" | "children" | "graph"> & InternalGraphNode)[];
export function mutable<T extends GraphNode>(node: T | readonly T[]) {
  return node;
}
