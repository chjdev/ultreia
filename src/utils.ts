import { DeepReadonly } from "ts-essentials";

export const deepReadonly = <T>(value: T): DeepReadonly<T> =>
  value as DeepReadonly<T>;

// http://www.typescriptlang.org/docs/handbook/mixins.html#mixin-sample
export const applyMixins = (derivedCtor: any, baseCtors: any[]) => {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!,
      );
    });
  });
};

export type Constructor<T = {}> = new () => T;
export type Constructor1<A0, T = {}> = new (a0: A0) => T;
export type Constructor2<A0, A1, T = {}> = new (a0: A0, a1: A1) => T;
export type ConstructorAny<T = {}> = new (...args: any[]) => T;

export const expect = <T>(value: T | null | undefined, msg?: string): T => {
  if (value == null) {
    msg =
      msg == null
        ? "expected value to not be" + typeof value === "undefined"
          ? "undefined"
          : "null"
        : msg;
    throw new TypeError(msg);
  }
  return value;
};
