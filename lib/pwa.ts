export type PwaPlatform = "android" | "ios" | "desktop";

export function getPwaPlatform(userAgent: string, maxTouchPoints = 0): PwaPlatform {
  if (/iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function isInAppBrowser(userAgent: string) {
  return /FBAN|FBAV|Instagram|\bGSA\//i.test(userAgent);
}

export function getInstallUrl(origin: string) {
  return new URL("/install", origin).href;
}
