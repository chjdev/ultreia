import { tiler } from "../../game/sprites/TileSprites";

export namespace Textures {
  const drawImage = async (
    context: CanvasRenderingContext2D,
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        context.drawImage(image, x, y, width, height);
        resolve();
      };
      image.onerror = reject;
    });
  };

  export type TextureMap = Record<string, [number, number]>;

  export const loadTextures = async (
    context: WebGL2RenderingContext,
  ): Promise<[WebGLTexture, TextureMap]> => {
    const height = 2048;
    const { frameWidth, frameHeight, tiles } = tiler(height);
    console.assert(
      frameWidth > 0 && frameHeight > 0,
      "frame width and height need to be > 0",
    );
    const canvas = document.createElement("canvas");
    canvas.width = tiles.length * frameWidth;
    canvas.height = height;
    const canvasContext = canvas.getContext("2d");
    if (canvasContext == null) {
      throw new Error();
    }
    const textureMapEntries: [string, [number, number]][] = await Promise.all(
      tiles.flatMap((row, idy) =>
        row.map(
          async (
            {
              x = 0,
              y = 0,
              width = frameWidth,
              height = frameHeight,
              key,
              url,
            },
            idx,
          ): Promise<[string, [number, number]]> => {
            console.assert(
              width > 0 && height > 0,
              "width and height need to be > 0",
            );
            const realX = idx * frameWidth;
            const drawX = realX + x;
            console.assert(
              drawX >= realX && drawX + width === (idx + 1) * frameWidth,
            );
            const realY = idy * frameHeight;
            const drawY = realY + y;
            console.assert(
              drawY >= realY && drawY + height === (idy + 1) * frameHeight,
            );
            await drawImage(canvasContext, url, drawX, drawY, width, height);
            return [key, [realX, realY]];
          },
        ),
      ),
    );
    const textureMap = Object.fromEntries(textureMapEntries);
    const texture = context.createTexture();
    if (texture == null) {
      throw new Error("could not create texture");
    }
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, texture);
    // todo mips?
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      canvas,
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
    return [texture, textureMap];
  };
}
