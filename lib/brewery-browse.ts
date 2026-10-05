const PREFIX = "pivnik:brewery-browse:";
export const BROWSE_TTL = 2 * 60 * 60 * 1000;
const MAX_LISTS = 8;
const MAX_IDS = 5000;
type StorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
export type BreweryBrowse = { ownerId: string; ids: number[]; returnHref: string; label: string; createdAt: number };
const validToken = (token: string) => /^[a-zA-Z0-9-]{1,80}$/.test(token);

export function isBrowseReturnHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return false;
  const url = new URL(href, "https://pivnik.invalid");
  return url.origin === "https://pivnik.invalid" &&
    /^(\/stats(?:\/(?:country|packaging)\/[^/]+)?|\/breweries|\/activity|\/|\/profiles\/[^/]+)$/.test(url.pathname);
}

export function saveBreweryBrowse(storage: StorageLike, token: string, list: Omit<BreweryBrowse, "createdAt">, now = Date.now()) {
  if (!validToken(token) || !list.ownerId || !isBrowseReturnHref(list.returnHref) || list.ids.length > MAX_IDS) return false;
  const ids = [...new Set(list.ids.filter(id => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return false;
  try {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string => Boolean(key?.startsWith(PREFIX)));
    const recent: Array<{ key: string; createdAt: number }> = [];
    for (const key of keys) {
      try {
        const old = JSON.parse(storage.getItem(key) ?? "null");
        if (!old || old.ownerId !== list.ownerId || !Number.isFinite(old.createdAt) || now - old.createdAt > BROWSE_TTL) storage.removeItem(key);
        else recent.push({ key, createdAt: old.createdAt });
      } catch { storage.removeItem(key); }
    }
    recent.sort((a, b) => b.createdAt - a.createdAt);
    for (const old of recent.slice(MAX_LISTS - 1)) storage.removeItem(old.key);
    storage.setItem(PREFIX + token, JSON.stringify({ ...list, ids, label: list.label.slice(0, 100), createdAt: now }));
    return true;
  } catch { return false; }
}

export function readBreweryBrowse(storage: StorageLike, token: string, ownerId: string, now = Date.now()): BreweryBrowse | null {
  if (!validToken(token)) return null;
  try {
    const raw = storage.getItem(PREFIX + token);
    if (!raw || raw.length > 80000) return null;
    const data = JSON.parse(raw);
    if (data?.ownerId !== ownerId || !Number.isFinite(data.createdAt) || data.createdAt > now || now - data.createdAt > BROWSE_TTL ||
      typeof data.returnHref !== "string" || !isBrowseReturnHref(data.returnHref) || typeof data.label !== "string" ||
      !Array.isArray(data.ids) || !data.ids.length || data.ids.length > MAX_IDS ||
      !data.ids.every((id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0) || new Set(data.ids).size !== data.ids.length) return null;
    return data;
  } catch { return null; }
}

export function getBreweryNeighbours(list: BreweryBrowse, breweryId: number) {
  const index = list.ids.indexOf(breweryId);
  if (index < 0) return null;
  return { index, total: list.ids.length, previous: list.ids[index - 1] ?? null, next: list.ids[index + 1] ?? null };
}

export function breweryBrowseHref(breweryId: number, token: string) {
  return `/breweries/${breweryId}?browse=${encodeURIComponent(token)}`;
}

export function withBreweryBrowse(href: string, token: unknown) {
  if (typeof token !== "string" || !validToken(token)) return href;
  const url = new URL(href, "https://pivnik.invalid");
  url.searchParams.set("browse", token);
  return url.pathname + url.search + url.hash;
}

// Local filter state is captured only when leaving a list, without fetching it again.
export function browseReturnHref(pathname: string, query: string, filters: Record<string, string>) {
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value); else params.delete(key);
  }
  return pathname + (params.size ? `?${params}` : "");
}
