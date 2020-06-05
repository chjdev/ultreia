import moize from "moize";
import {
  createProgram,
  FragmentShaderSource,
  VertexShaderSource,
} from "../utils";

export namespace Display {
  const vertexShader = `#version 300 es
precision highp int;
precision highp float;

in vec2 aPosition;

out vec2 vTexCoord;

void main() {
    gl_Position = vec4(aPosition, 0., 1.);
    vTexCoord = (vec2(gl_Position) + 1.) / 2.;
}    
` as VertexShaderSource;

  const fragmentShader = `#version 300 es
precision highp int;
precision highp float;

in vec2 vTexCoord;

uniform sampler2D uSampler;

out vec4 fragmentColor;

void main() {
    fragmentColor = texture(uSampler, vTexCoord); 
}    
` as FragmentShaderSource;

  const program = moize(
    (context: WebGL2RenderingContext): WebGLProgram =>
      createProgram(context, vertexShader, fragmentShader),
    { maxSize: 1024 },
  );

  const buffers = moize(
    (context: WebGL2RenderingContext) => {
      const positionBuffer = context.createBuffer();
      context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
      //todo only do this once
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1]),
        context.STATIC_DRAW,
      );
      context.bindBuffer(context.ARRAY_BUFFER, null);
      return {
        positionBuffer,
      };
    },
    { maxSize: 1024 },
  );

  export const display = (
    context: WebGL2RenderingContext,
    texture: WebGLTexture,
  ) => {
    const { positionBuffer } = buffers(context);
    const displayProg = program(context);
    context.bindFramebuffer(context.FRAMEBUFFER, null);
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, texture);
    context.useProgram(displayProg);
    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
    context.clearColor(0, 0, 0, 0);
    context.clear(context.COLOR_BUFFER_BIT);
    const positionAttribLocation = context.getAttribLocation(
      displayProg,
      "aPosition",
    );
    context.vertexAttribPointer(
      positionAttribLocation,
      2,
      context.FLOAT,
      false,
      0,
      0,
    );
    context.enableVertexAttribArray(positionAttribLocation);
    context.drawArrays(context.TRIANGLE_STRIP, 0, 5);
  };
}
