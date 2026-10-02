export const LOGO_BACKGROUND = { r: 23, g: 19, b: 15 };

/** Only public brewery assets on our own Storage origin can use the image endpoint. */
export function isStoredBreweryLogo(src: string, storageOrigin: string) {
  try {
    const url = new URL(src);
    return url.origin === new URL(storageOrigin).origin &&
      url.protocol === "https:" && !url.username && !url.password &&
      /^\/storage\/v1\/object\/public\/brewery-logos\/\d+\/logo$/.test(url.pathname) &&
      [...url.searchParams.keys()].every(key => key === "v") &&
      (!url.searchParams.has("v") || /^\d{1,20}$/.test(url.searchParams.get("v")!));
  } catch {
    return false;
  }
}

/** Analyse a small RGBA raster without stretching it. Uncertain edges are never removed. */
export function getLogoLayout(pixels: Uint8Array, width: number, height: number) {
  const offset = (x: number, y: number) => (y * width + x) * 4;
  const edge: number[] = [];
  for (let x = 0; x < width; x++) edge.push(offset(x, 0), offset(x, height - 1));
  for (let y = 1; y < height - 1; y++) edge.push(offset(0, y), offset(width - 1, y));
  const transparent = edge.filter(i => pixels[i + 3] < 32).length / edge.length > 0.6;
  const opaque = edge.filter(i => pixels[i + 3] > 240);
  const median = (channel: number) => {
    const values = opaque.map(i => pixels[i + channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  const candidate = { r: median(0), g: median(1), b: median(2) };
  const difference = (i: number) => Math.max(
    Math.abs(pixels[i] - candidate.r), Math.abs(pixels[i + 1] - candidate.g),
    Math.abs(pixels[i + 2] - candidate.b),
  );
  const uniform = !transparent && opaque.length / edge.length > 0.95 &&
    opaque.filter(i => difference(i) < 24).length / opaque.length > 0.95;
  let background = uniform ? candidate : LOGO_BACKGROUND;
  if (transparent) {
    let light = 0, weight = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 32) continue;
      const alpha = pixels[i + 3] / 255;
      light += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) * alpha;
      weight += alpha;
    }
    // Dark ink needs a light backing; transparent white artwork keeps the app's dark backing.
    if (weight > 0 && light / weight < 85) background = { r: 240, g: 235, b: 226 };
  }
  const isContent = (i: number) => transparent ? pixels[i + 3] > 16 :
    uniform ? pixels[i + 3] > 16 && difference(i) > 28 : true;

  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!isContent(offset(x, y))) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) return { background, left: 0, top: 0, width, height, radius: Math.hypot(width, height) / 2 };
  // Keep antialiasing and a small halo around the detected artwork.
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  right = Math.min(width - 1, right + 2); bottom = Math.min(height - 1, bottom + 2);
  const cropWidth = right - left + 1, cropHeight = bottom - top + 1;
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  let radius = 1;
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    if (isContent(offset(x, y))) radius = Math.max(radius, Math.hypot(x - cx, y - cy) + 2);
  }
  return { background, left, top, width: cropWidth, height: cropHeight, radius };
}
