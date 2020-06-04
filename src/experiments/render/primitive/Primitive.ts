export interface Primitive {
  backgroundColor?: Readonly<{
    r?: number;
    g?: number;
    b?: number;
    a?: number;
  }>;
  texture?: string;
  visible: boolean;
}
