export function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function parseRating(value: FormDataEntryValue | null): number | null {
  if (value !== null && typeof value !== "string") throw new Error("Neplatné hodnocení.");
  const text = value?.trim() ?? "";
  if (value === null || text === "") return null;
  const rating = Number(text);
  if (!isRating(rating)) throw new Error("Hodnocení musí být od 1 do 5 hvězd, nebo nevyplněné.");
  return rating;
}

export type RatedTasting = {
  id: number;
  beerId: number;
  beerName: string;
  breweryId: number | null;
  breweryName: string;
  logoUrl: string | null;
  country: string;
  styleId: number | null;
  style: string;
  packaging: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  rating: number;
  ratedAt: string;
};

export type RatingFilters = { country: string; style: string; packaging: string; beer: string };
export type RatingGroup = "beer" | "country" | "style" | "packaging";
export type RatingRank = { id: string; name: string; average: number; count: number; tasting: RatedTasting };

export function filterRatings(rows: RatedTasting[], filters: RatingFilters) {
  return rows.filter(row => isRating(row.rating) &&
    (!filters.country || row.country === filters.country) &&
    (!filters.style || row.style === filters.style) &&
    (!filters.packaging || row.packaging === filters.packaging) &&
    (!filters.beer || String(row.beerId) === filters.beer));
}

/** Each tasting counts once, independently of the number of beers consumed. */
export function rankRatings(rows: RatedTasting[], group: RatingGroup, worst = false): RatingRank[] {
  const buckets = new Map<string, { sum: number; count: number; name: string; tasting: RatedTasting }>();
  for (const row of rows) {
    if (!isRating(row.rating)) continue;
    const id = group === "beer" ? String(row.beerId) : row[group];
    const name = group === "beer" ? row.beerName : row[group];
    const bucket = buckets.get(id);
    if (bucket) { bucket.sum += row.rating; bucket.count++; }
    else buckets.set(id, { sum: row.rating, count: 1, name, tasting: row });
  }
  return [...buckets].map(([id, value]) => ({ id, name: value.name, count: value.count,
    average: value.sum / value.count, tasting: value.tasting }))
    .sort((a, b) => (worst ? a.average - b.average : b.average - a.average) ||
      b.count - a.count || a.name.localeCompare(b.name, "cs") || a.id.localeCompare(b.id));
}

export function formatRating(value: number) {
  return value.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
