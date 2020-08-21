import { Opaque } from "ts-essentials";

export const retina = 2;

export type VertexShaderSource = Opaque<"VertexShader", string>;
export type FragmentShaderSource = Opaque<"FragmentShader", string>;

export function compileShader(
  context: WebGL2RenderingContext,
  shaderSource: VertexShaderSource,
  shaderType: WebGL2RenderingContext["VERTEX_SHADER"],
): WebGLShader;
export function compileShader(
  context: WebGL2RenderingContext,
  shaderSource: FragmentShaderSource,
  shaderType: WebGL2RenderingContext["FRAGMENT_SHADER"],
): WebGLShader;
export function compileShader(
  context: WebGL2RenderingContext,
  shaderSource: VertexShaderSource | FragmentShaderSource,
  shaderType: GLenum,
): WebGLShader {
  const shader = context.createShader(shaderType);
  if (shader == null) {
    throw new Error("couldn't create shader " + shaderType);
  }
  context.shaderSource(shader, shaderSource);
  context.compileShader(shader);

  const success = context.getShaderParameter(shader, context.COMPILE_STATUS);
  if (!success) {
    throw new Error(
      "could not compile shader:" + context.getShaderInfoLog(shader),
    );
  }

  return shader;
}

export const createProgram = (
  context: WebGL2RenderingContext,
  vertexShaderSource: VertexShaderSource,
  fragmentShaderSource: FragmentShaderSource,
): WebGLProgram => {
  const program = context.createProgram();
  if (program == null) {
    throw new Error("failed to create program");
  }

  const vertexShader = compileShader(
    context,
    vertexShaderSource,
    context.VERTEX_SHADER,
  );
  const fragmentShader = compileShader(
    context,
    fragmentShaderSource,
    context.FRAGMENT_SHADER,
  );

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);

  const success = context.getProgramParameter(program, context.LINK_STATUS);
  if (!success) {
    throw new Error(
      "program failed to link:" + context.getProgramInfoLog(program),
    );
  }

  return program;
};
