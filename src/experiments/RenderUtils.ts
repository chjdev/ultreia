import moize from "moize";
import { Opaque } from "ts-essentials";

type VertexShaderSource = Opaque<string, "VertexShader">;
type FragmentShaderSource = Opaque<string, "FragmentShader">;

function compileShader(
  context: WebGL2RenderingContext,
  shaderSource: VertexShaderSource,
  shaderType: WebGL2RenderingContext["VERTEX_SHADER"],
): WebGLShader;
function compileShader(
  context: WebGL2RenderingContext,
  shaderSource: FragmentShaderSource,
  shaderType: WebGL2RenderingContext["FRAGMENT_SHADER"],
): WebGLShader;
function compileShader(
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

const createProgram = (
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

export const retina = 4;

export const clear = (context: WebGL2RenderingContext) => {
  context.clearColor(0, 0, 0, 0);
  context.clear(context.COLOR_BUFFER_BIT);
};

export namespace Primitives {
  export interface Primitive {
    backgroundColor?: Readonly<{
      r?: number;
      g?: number;
      b?: number;
      a?: number;
    }>;
    visible: boolean;
  }

  export interface Rectangle extends Primitive {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: Readonly<{
      tl?: number;
      tr?: number;
      br?: number;
      bl?: number;
    }>;
  }

  export namespace Rectangle {
    const vertexShader = `#version 300 es
precision highp int;
precision highp float;

in vec4 aPosition;
in vec4 aColor;
in vec4 aRadii;

uniform vec2 uResolution;
uniform float uRetina;

out vec2 vCoord;
flat out vec4 vColor;
flat out vec4 vRadii;
flat out float vAspect;

void main() {
   // pass on varyings
   vColor = aColor;
   vRadii = aRadii;
   // 1000 because corner info is encoded here since gl_VertexID is broken
   vAspect = mod(aPosition.w, 1000.);
   
   // scale the position vector to retina resolution;
   vec2 position = vec2(aPosition) * uRetina;
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = position / uResolution;
   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;
   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;
   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1.);
   
   // todo does not work for whatever reason
   // int corner = gl_VertexID % 4;
   // 1000 because corner info is encoded here since gl_VertexID is broken
   int corner = int(aPosition.w / 1000.);
   // set up the fragment coordinates in -1 -> 1 space
   // uses the quadrant definition in z
   switch (corner) {
     // bottom left
     case 0:
       vCoord = vec2(-1., -1.);
       break;
     // bottom right
     case 1:
       vCoord = vec2(1., -1.);
       break;
     // top left
     case 2:
       vCoord = vec2(-1., 1.);
       break;
     // top right
     case 3:
       vCoord = vec2(1., 1.);
       break;
   }
} 
` as VertexShaderSource;
    const fragmentShader = `#version 300 es 
precision highp int;
precision highp float;

const float AAEpsilon = 0.001;
const float AAOpacity = 0.25;

uniform float uRetina;

in vec2 vCoord;
flat in vec4 vColor;
flat in vec4 vRadii;
flat in float vAspect;

out vec4 fragmentColor;

void clip(float radiusRatio) {
   // if plain rectangle there is nothing to do
   if (radiusRatio == 0.) {
     fragmentColor = vColor;
     return;
   }
   // if the radius ratio is negative it signifies to use no aspect adjustment
   // if positive use the aspect ratio to correct the radii to make them circular
   float aspect = radiusRatio < 0. ? 1. : vAspect;
   // the circular radius is always the smaller possible radius, calculated 
   // by the aspect ratio in 0->1 space. (aspect > 1. means wide rectangle, < 1. narrow rectangle
   float radius = abs(radiusRatio) * (aspect < 1. ? aspect : 1./aspect);

   // a vector pointing to the aspect ratio adjusted corner of the rectangle, 0->1 space
   vec2 cornerVec = vec2(aspect < 1. ? aspect : 1., aspect < 1. ? 1. : 1. / aspect) ;
   // scale the fragment coords based on corner vector;
   vec2 scaledAbs = abs(vCoord * cornerVec);
   // clip off coordinates outside the radius area
   vec2 clipped = scaledAbs - (cornerVec - radius);
   // calcuate the distance of fragment within tha radius area, are we within the radius?
   float dist = sqrt(dot(clipped, clipped));
   // check if we are even in the radius area then check whether the distance is outside of the radius
   if (clipped.x > 0. && clipped.y > 0. && dist > radius) {
       // epsilon is a little over sample area used to smooth out the curvature
       float epsilon = AAEpsilon * uRetina;
       if (dist > radius + epsilon) {
           // if outside epsilon hard discard
           discard;
       } else {
           // else we are within epsilon, fade based on distance within epsilon area and original opacity
           fragmentColor = vec4(vec3(vColor), vColor.w * AAOpacity * (epsilon / (dist - radius)));
       }
   } else {
       // simple put the color
       fragmentColor = vColor;
   }
}

void main() {
   if (vCoord.x < 0. && vCoord.y < 0.) {
     // bottom left
     clip(vRadii.x);
   } else if (vCoord.x > 0. && vCoord.y < 0.) {
     // bottom right
     clip(vRadii.y);
   } else if (vCoord.x < 0. && vCoord.y > 0.) {
     // top left
     clip(vRadii.w);
   } else {
     // top right
     clip(vRadii.z);
   }
}  
` as FragmentShaderSource;

    const program = moize(
      (context: WebGL2RenderingContext): WebGLProgram =>
        createProgram(context, vertexShader, fragmentShader),
      { maxSize: 1024 },
    );

    const buffers = moize(
      (context: WebGL2RenderingContext) => ({
        positionBuffer: context.createBuffer(),
        positionIndexBuffer: context.createBuffer(),
        colorBuffer: context.createBuffer(),
        radiiBuffer: context.createBuffer(),
      }),
      { maxSize: 1024 },
    );

    type Tuple6<T> = [T, T, T, T, T, T];
    type Tuple2<T> = [T, T];

    export const render = (
      context: WebGL2RenderingContext,
      ...rectangles: readonly Readonly<Rectangle>[]
    ) => {
      const {
        positionBuffer,
        positionIndexBuffer,
        colorBuffer,
        radiiBuffer,
      } = buffers(context);

      const rectangleData = new Float32Array(rectangles.length * 4 * 4);
      const rectangleIndices = new Uint16Array(rectangles.length * 6);
      rectangles.forEach(({ x, y, width, height }, idx) => {
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;
        const z = 0;
        const aspect = width / height;
        const triangleIdx = idx * 4 * 4;
        // 1000s because corner info is encoded here since gl_VertexID is broken
        rectangleData.set(
          [
            [x1, y1, z, aspect],
            [x2, y1, z, aspect + 1000],
            [x1, y2, z, aspect + 2000],
            [x2, y2, z, aspect + 3000],
          ].flat(),
          triangleIdx,
        );
        const indexIdx = idx * 6;
        const quadIdx = idx * 4;
        // todo assert element index < 2^16
        rectangleIndices.set(
          [0, 1, 2, 2, 1, 3].map((vertIdx) => vertIdx + quadIdx),
          indexIdx,
        );
      });
      context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
      // todo use subData
      context.bufferData(
        context.ARRAY_BUFFER,
        rectangleData,
        context.DYNAMIC_DRAW,
      );
      context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, positionIndexBuffer);
      context.bufferData(
        context.ELEMENT_ARRAY_BUFFER,
        rectangleIndices,
        context.DYNAMIC_DRAW,
      );

      const rectangleColors = new Float32Array(
        rectangles
          .map(
            ({ backgroundColor }): Tuple6<[number, number, number, number]> => {
              const { r = 0, g = 0, b = 0, a = 1 } = backgroundColor ?? {};
              const c: [number, number, number, number] = [r, g, b, a];
              return [c, c, c, c, c, c];
            },
          )
          .flat(2),
      );
      context.bindBuffer(context.ARRAY_BUFFER, colorBuffer);
      context.bufferData(
        context.ARRAY_BUFFER,
        rectangleColors,
        context.DYNAMIC_DRAW,
      );

      const rectangleRadii = new Float32Array(
        rectangles
          .map(
            ({ borderRadius }): Tuple6<[number, number, number, number]> => {
              const { tl = 0, tr = 0, br = 0, bl = 0 } = borderRadius ?? {};
              const r: [number, number, number, number] = [tl, tr, br, bl];
              return [r, r, r, r, r, r];
            },
          )
          .flat(2),
      );
      context.bindBuffer(context.ARRAY_BUFFER, radiiBuffer);
      context.bufferData(
        context.ARRAY_BUFFER,
        rectangleRadii,
        context.DYNAMIC_DRAW,
      );

      // Tell it to use our program (pair of shaders)
      const prog = program(context);
      context.useProgram(prog);

      {
        // Bind the position buffer.
        context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const type = context.FLOAT; // the data is 32bit ints
        const normalize = false; // don't normalize the data
        const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0; // start at the beginning of the buffer
        const positionAttributeLocation = context.getAttribLocation(
          prog,
          "aPosition",
        );
        context.vertexAttribPointer(
          positionAttributeLocation,
          4,
          type,
          normalize,
          stride,
          offset,
        );
        context.enableVertexAttribArray(positionAttributeLocation);

        context.bindBuffer(context.ARRAY_BUFFER, colorBuffer);
        const colorAttributeLocation = context.getAttribLocation(
          prog,
          "aColor",
        );
        context.vertexAttribPointer(
          colorAttributeLocation,
          4,
          type,
          normalize,
          stride,
          offset,
        );
        context.enableVertexAttribArray(colorAttributeLocation);

        context.bindBuffer(context.ARRAY_BUFFER, radiiBuffer);
        const radiiAttributeLocation = context.getAttribLocation(
          prog,
          "aRadii",
        );
        context.vertexAttribPointer(
          radiiAttributeLocation,
          4,
          type,
          normalize,
          stride,
          offset,
        );
        context.enableVertexAttribArray(radiiAttributeLocation);

        const resolutionUniformLocation = context.getUniformLocation(
          prog,
          "uResolution",
        );

        context.uniform2f(
          resolutionUniformLocation,
          context.canvas.width,
          context.canvas.height,
        );
        const retinaUniformLocation = context.getUniformLocation(
          prog,
          "uRetina",
        );
        context.uniform1f(retinaUniformLocation, retina);
      }

      {
        // Draw the rectangle.
        const primitiveType = context.TRIANGLES;
        // const offset = 0;
        // const count = rectangleData.length / 4;
        // context.drawArrays(primitiveType, offset, count);
        const count = rectangleIndices.length;
        context.drawElements(primitiveType, count, context.UNSIGNED_SHORT, 0);
      }
    };
  }
}
