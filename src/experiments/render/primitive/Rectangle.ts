import moize from "moize";
import { Primitive } from "./Primitive";
import {
  createProgram,
  FragmentShaderSource,
  retina,
  VertexShaderSource,
} from "../utils";
import { Display } from "./Display";
import { SceneData } from "../../SceneData";

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
in vec4 aTex;

uniform vec2 uResolution;
uniform float uRetina;

out vec2 vCoord;
flat out vec4 vTex;
flat out vec4 vColor;
flat out vec4 vRadii;
flat out float vAspect;
flat out int vClickId;

void main() {
   // pass on varyings
   vColor = aColor;
   vRadii = aRadii;
   // 1000 because corner info is encoded here since gl_VertexID is broken
   vAspect = mod(aPosition.w, 1000.);
   vTex = aTex;
   vClickId = gl_VertexID / 4 + 1;
   
   // scale the position vector to retina resolution;
   vec2 position = vec2(aPosition) * uRetina;
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = (position / uResolution);
   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;
   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1., -1.), aPosition.z, 1.);
   
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
uniform sampler2D uSampler;
uniform vec2 uTexDimensions;
uniform bool uClickMap;

in vec2 vCoord;
flat in vec4 vTex;
flat in vec4 vColor;
flat in vec4 vRadii;
flat in float vAspect;
flat in int vClickId;

layout(location = 0) out vec4 fragmentColor;
layout(location = 1) out vec4 clickMap;

void clip(float radiusRatio, vec4 color) {
   // if plain rectangle there is nothing to do
   if (radiusRatio == 0.) {
     fragmentColor = color;
     return;
   }
   // if the radius ratio is negative it signifies to use no aspect adjustment
   // if positive use the aspect ratio to correct the radii to make them circular
   float aspect = radiusRatio < 0. ? 1. : vAspect;
   // the circular radius is always the smaller possible radius, calculated 
   // by the aspect ratio in 0->1 space. (aspect > 1. means wide rectangle, < 1. narrow rectangle
   float radius = abs(radiusRatio) * (aspect < 1. ? aspect : 1./aspect);
   
   // a vector pointing to the aspect ratio adjusted corner of the rectangle, 0->1 space
   vec2 cornerVec = vec2(aspect < 1. ? aspect : 1., aspect < 1. ? 1. : 1. / aspect);
   // scale the fragment coords based on corner vector;
   vec2 scaledAbs = abs(vCoord * cornerVec);
   
   // clip off coordinates outside the radius area
   vec2 clipped = scaledAbs - (cornerVec - radius);
   // calcuate the distance of fragment within the radius area, are we within the radius?
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
           fragmentColor = vec4(vec3(color), color.w * AAOpacity * (epsilon / (dist - radius)));
       }
   } else {
       // simple put the color
       fragmentColor = color;
   }
}

void main() {
   vec4 color = vColor;
   if (vTex.x >= 0. && vTex.y >= 0.) {
       vec2 zeroToOne = (vec2(vCoord.x, vCoord.y) + 1.) / 2.;
       vec2 position = vec2(vTex) / uTexDimensions;
       vec2 offset = (zeroToOne * vec2(vTex.z, vTex.w)) / uTexDimensions;
       vec2 texCoord = position + offset;
       vec4 texel = texture(uSampler, texCoord);
       // color = texel.a < 0.05 ? color : vec4(1. - (1. - vec3(color)) * (1. - vec3(texel)), texel.w);
       color = texel.a < 0.05 ? color : color + texel;
   }

   float radius;
   if (vCoord.x < 0. && vCoord.y < 0.) {
     // bottom left
     radius = vRadii.x;
   } else if (vCoord.x > 0. && vCoord.y < 0.) {
     // bottom right
     radius = vRadii.y;
   } else if (vCoord.x < 0. && vCoord.y > 0.) {
     // top left
     radius = vRadii.w;
   } else {
     // top right
     radius = vRadii.z;
   }
   
   clip(radius, color);
   if (uClickMap && color.a > 0.) {
     //clickMap = vec4(vClickId >> 24, vClickId << 8 >> 24, vClickId << 16 >> 24, vClickId << 24 >> 24) / 255.;
     // todo seems to need a 1. as alpha so the blending of the color output doesn't mess up the index
     clickMap = vec4(vClickId << 8 >> 24, vClickId << 16 >> 24, vClickId << 24 >> 24, 255.) / 255.;
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
      fb: context.createFramebuffer(),
      out: context.createTexture(),
      click: context.createTexture(),
      positionBuffer: context.createBuffer(),
      positionIndexBuffer: context.createBuffer(),
      colorBuffer: context.createBuffer(),
      radiiBuffer: context.createBuffer(),
      texBuffer: context.createBuffer(),
    }),
    { maxSize: 1024 },
  );

  type Tuple6<T> = [T, T, T, T, T, T];
  type Tuple2<T> = [T, T];

  export interface ClickTrace {
    readonly x: number;
    readonly y: number;
    readonly onClick: (id: number) => void;
  }

  export const render = (
    context: WebGL2RenderingContext,
    data: SceneData,
    clickTrace?: ClickTrace,
  ) => {
    const {
      fb,
      out,
      click,
      positionBuffer,
      positionIndexBuffer,
      colorBuffer,
      radiiBuffer,
      texBuffer,
    } = buffers(context);

    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
    // todo use subData
    context.bufferData(
      context.ARRAY_BUFFER,
      data.position,
      context.DYNAMIC_DRAW,
    );
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, positionIndexBuffer);
    context.bufferData(
      context.ELEMENT_ARRAY_BUFFER,
      data.indices,
      context.DYNAMIC_DRAW,
    );

    context.bindBuffer(context.ARRAY_BUFFER, colorBuffer);
    context.bufferData(context.ARRAY_BUFFER, data.colors, context.DYNAMIC_DRAW);

    context.bindBuffer(context.ARRAY_BUFFER, radiiBuffer);
    context.bufferData(context.ARRAY_BUFFER, data.radii, context.DYNAMIC_DRAW);

    context.bindBuffer(context.ARRAY_BUFFER, texBuffer);
    context.bufferData(
      context.ARRAY_BUFFER,
      data.texCoords,
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
      const colorAttributeLocation = context.getAttribLocation(prog, "aColor");
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
      const radiiAttributeLocation = context.getAttribLocation(prog, "aRadii");
      context.vertexAttribPointer(
        radiiAttributeLocation,
        4,
        type,
        normalize,
        stride,
        offset,
      );
      context.enableVertexAttribArray(radiiAttributeLocation);

      context.bindBuffer(context.ARRAY_BUFFER, texBuffer);
      const texAttributeLocation = context.getAttribLocation(prog, "aTex");
      context.vertexAttribPointer(
        texAttributeLocation,
        4,
        type,
        normalize,
        stride,
        offset,
      );
      context.enableVertexAttribArray(texAttributeLocation);

      const resolutionUniformLocation = context.getUniformLocation(
        prog,
        "uResolution",
      );
      context.uniform2f(
        resolutionUniformLocation,
        context.canvas.width,
        context.canvas.height,
      );

      const retinaUniformLocation = context.getUniformLocation(prog, "uRetina");
      context.uniform1f(retinaUniformLocation, retina);

      const texDimensionsUniformLocation = context.getUniformLocation(
        prog,
        "uTexDimensions",
      );
      context.uniform2f(texDimensionsUniformLocation, 1280, 2048);

      const clickMapUniformLocation = context.getUniformLocation(
        prog,
        "uClickMap",
      );
      context.uniform1i(clickMapUniformLocation, clickTrace ? 1 : 0);
    }

    {
      // prep framebuffer
      const width = context.canvas.width;
      const height = context.canvas.height;
      context.bindFramebuffer(context.FRAMEBUFFER, fb);
      context.bindTexture(context.TEXTURE_2D, out);
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MAG_FILTER,
        context.LINEAR,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MIN_FILTER,
        context.LINEAR,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_S,
        context.CLAMP_TO_EDGE,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_T,
        context.CLAMP_TO_EDGE,
      );
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        width,
        height,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        null,
      );
      context.framebufferTexture2D(
        context.DRAW_FRAMEBUFFER,
        context.COLOR_ATTACHMENT0,
        context.TEXTURE_2D,
        out,
        0,
      );
      context.bindTexture(context.TEXTURE_2D, click);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        width,
        height,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        null,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MAG_FILTER,
        context.LINEAR,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_MIN_FILTER,
        context.LINEAR,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_S,
        context.CLAMP_TO_EDGE,
      );
      context.texParameteri(
        context.TEXTURE_2D,
        context.TEXTURE_WRAP_T,
        context.CLAMP_TO_EDGE,
      );
      context.framebufferTexture2D(
        context.DRAW_FRAMEBUFFER,
        context.COLOR_ATTACHMENT1,
        context.TEXTURE_2D,
        click,
        0,
      );
      context.drawBuffers([
        context.COLOR_ATTACHMENT0,
        context.COLOR_ATTACHMENT1,
      ]);

      context.activeTexture(context.TEXTURE2);
      context.bindTexture(context.TEXTURE_2D, data.texture);
      const samplerUniformLocation = context.getUniformLocation(
        prog,
        "uSampler",
      );
      context.uniform1i(samplerUniformLocation, 2);

      context.clearColor(0, 0, 0, 0);
      context.clear(context.COLOR_BUFFER_BIT);

      // Draw the rectangle.
      const primitiveType = context.TRIANGLES;
      const count = data.indices.length;
      context.drawElements(primitiveType, count, context.UNSIGNED_SHORT, 0);

      if (clickTrace) {
        context.readBuffer(context.COLOR_ATTACHMENT1);
        const buffer = new Uint8Array(4);
        context.readPixels(
          clickTrace.x * retina,
          context.canvas.height - clickTrace.y * retina,
          1,
          1,
          context.RGBA,
          context.UNSIGNED_BYTE,
          buffer,
        );
        const id = ((buffer[0] << 16) | (buffer[1] << 8) | buffer[2]) - 1;
        if (id >= 0) {
          clickTrace.onClick(id);
        }
      }

      Display.display(context, out!);
    }
  };
}
