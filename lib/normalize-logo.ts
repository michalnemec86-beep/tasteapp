import sharp from "sharp";
import { getLogoLayout } from "./logo-layout";

export async function normalizeLogo(input: Buffer) {
  const { data, info } = await sharp(input, { limitInputPixels: 16_000_000 })
    .rotate().resize(512, 512, { fit: "inside" }).ensureAlpha().toColourspace("srgb")
    .raw().toBuffer({ resolveWithObject: true });
  const layout = getLogoLayout(data, info.width, info.height);
  const size = 384;
  // Fit the actual artwork into a circle with 8% breathing room at either side.
  const scale = Math.min(size * 0.42 / layout.radius, size / layout.width, size / layout.height);
  const width = Math.max(1, Math.floor(layout.width * scale));
  const height = Math.max(1, Math.floor(layout.height * scale));
  const artwork = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: layout.left, top: layout.top, width: layout.width, height: layout.height })
    .resize(width, height).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: layout.background } })
    .composite([{ input: artwork, left: Math.floor((size - width) / 2), top: Math.floor((size - height) / 2) }])
    .webp({ quality: 90 }).toBuffer();
}
