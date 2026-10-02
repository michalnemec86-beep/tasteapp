export type NewsSection = "activity" | "beers" | "breweries";
export type NavigationNews = {
  userId: string;
  snapshotAt: string;
  counts: Record<NewsSection, number>;
  since: Record<"beers" | "breweries", string>;
};
export const NEWS_REFRESH_MS = 60_000;

export function getNewsSection(pathname: string): NewsSection | null {
  // An entity detail/redirect does not mean the user visited the catalogue.
  return pathname === "/activity" ? "activity" : pathname === "/beers" ? "beers" : pathname === "/breweries" ? "breweries" : null;
}

export function isNewsTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value.slice(0, 10);
}

export function getNewsHref(section: NewsSection, news: NavigationNews | null) {
  if (section === "activity" || !news || news.counts[section] < 1) return `/${section}`;
  const params = new URLSearchParams({ newSince: news.since[section], newUntil: news.snapshotAt });
  return `/${section}?${params}`;
}

export function getNewsRange(since: unknown, until: unknown) {
  if (since === undefined && until === undefined) return null;
  if (!isNewsTimestamp(since) || !isNewsTimestamp(until) || Date.parse(since) > Date.parse(until)) throw new Error("Neplatný filtr novinek.");
  return { since, until };
}

/** Caches only three counts, coalesces focus/visibility requests and ignores stale responses. */
export class NavigationNewsController {
  snapshot: NavigationNews | null = null;
  private section: NewsSection | null | undefined;
  private generation = 0;
  private fetchedAt = -Infinity;
  private pending = false;
  private disposed = false;

  constructor(private readonly userId: string,
    private readonly fetchNews: (section: NewsSection | null, seenThrough: string | null) => Promise<NavigationNews | null>,
    private readonly onChange: (news: NavigationNews) => void,
    private readonly now = Date.now) {}

  visit(section: NewsSection | null, reopen = false, seenThrough?: string | null) {
    const changed = this.section !== section;
    this.section = section;
    return (changed || reopen) && section ? this.load(section, seenThrough) : this.refresh();
  }

  refresh() {
    if (this.pending || (this.snapshot && this.now() - this.fetchedAt < NEWS_REFRESH_MS)) return Promise.resolve();
    return this.load(null);
  }

  private async load(section: NewsSection | null, seenThrough?: string | null) {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.pending = true;
    try {
      const result = await this.fetchNews(section, section ? seenThrough ?? this.snapshot?.snapshotAt ?? null : null);
      if (this.disposed || generation !== this.generation || !result || result.userId !== this.userId) return;
      this.snapshot = result;
      this.fetchedAt = this.now();
      this.onChange(result);
    } catch (error) {
      // A failed background count must not block navigation or acknowledge it locally.
      console.error("Navigation news refresh failed:", error);
    } finally {
      if (generation === this.generation) this.pending = false;
    }
  }

  dispose() { this.disposed = true; }
}
