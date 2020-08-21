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

  export type TextureMap = Record<string, [number, number, number, number]>;

  const drawFonts = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    fontSize: number = 64,
    font: string = "monospace",
  ): TextureMap => {
    context.font = `${fontSize}px ${font}`;
    context.fillStyle = "white";
    context.textBaseline = "middle";
    context.textAlign = "center";
    const rows = Math.floor(height / fontSize);
    const glyphs = [];
    for (let charCode = 32; charCode <= 126; charCode++) {
      const char = String.fromCharCode(charCode);
      glyphs.push(char);
    }

    const glyphMap = {} as TextureMap;
    let columnX = x + fontSize / 2;
    while (glyphs.length > 0) {
      for (let row = 0; row < rows && glyphs.length > 0; row++) {
        const glyph = glyphs.pop();
        if (glyph == null) {
          break;
        }
        const rowY = y + fontSize * (row + 1 / 2);
        context.fillText(glyph, columnX, rowY, fontSize);
        glyphMap[glyph] = [
          columnX - fontSize / 2,
          rowY - fontSize / 2,
          fontSize,
          fontSize,
        ];
      }
      columnX += fontSize;
    }
    return glyphMap;
  };

  export const loadTextures = async (
    context: WebGL2RenderingContext,
  ): Promise<[WebGLTexture, TextureMap, number, number]> => {
    const height = 2048;
    const { frameWidth, frameHeight, tiles } = tiler(height);
    console.assert(
      frameWidth > 0 && frameHeight > 0,
      "frame width and height need to be > 0",
    );
    const canvas = document.createElement("canvas");
    // todo nah, get some parameters going
    canvas.width = tiles.length * frameWidth + 4 * 64;
    canvas.height = height;
    const canvasContext = canvas.getContext("2d");
    if (canvasContext == null) {
      throw new Error();
    }
    const tileMapEntries: [
      string,
      [number, number, number, number],
    ][] = await Promise.all(
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
          ): Promise<[string, [number, number, number, number]]> => {
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
            return [key, [realX, realY, frameWidth, frameHeight]];
          },
        ),
      ),
    );
    const tileMap = Object.fromEntries(tileMapEntries);

    // todo nah, get some parameters going
    const glyphX = canvas.width - 4 * 64;
    const glyphMap = drawFonts(canvasContext, glyphX, 0, height);

    const textureMap = { ...tileMap, ...glyphMap };
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
    return [texture, textureMap, canvas.width, canvas.height];
  };
}
