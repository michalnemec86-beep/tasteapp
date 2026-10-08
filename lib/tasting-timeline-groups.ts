/**
 * A timeline card may summarize several tasting records, but the underlying
 * records (and therefore quantity, ratings, versions, notes, and edit rights)
 * always remain independent.
 */
export type GroupableTasting = {
  id: number;
  user_id: string;
  tasted_on: string;
  quantity: number | null;
  beers: { id: number } | null;
};

export type DailyTastingGroup<T extends GroupableTasting> = {
  tasting: T;
  tastings: T[];
  totalQuantity: number;
  sortAt: number;
};

export function groupDailyTastings<T extends GroupableTasting>(
  rows: T[],
  getTime: (tasting: T) => number
): DailyTastingGroup<T>[] {
  const byKey = new Map<string, DailyTastingGroup<T>>();

  for (const tasting of rows) {
    // Unknown catalog identities cannot be reliably grouped by product.
    const key = tasting.beers?.id
      ? `${tasting.user_id}|beer:${tasting.beers.id}|day:${tasting.tasted_on}`
      : `tasting:${tasting.id}`;
    const time = getTime(tasting);
    const found = byKey.get(key);
    if (!found) {
      byKey.set(key, {
        tasting,
        tastings: [tasting],
        totalQuantity: tasting.quantity ?? 1,
        sortAt: time,
      });
    } else {
      found.tastings.push(tasting);
      found.totalQuantity += tasting.quantity ?? 1;
      if (time > found.sortAt) {
        found.tasting = tasting;
        found.sortAt = time;
      }
    }
  }

  for (const group of byKey.values()) {
    group.tastings.sort((a, b) => getTime(b) - getTime(a) || b.id - a.id);
  }
  return [...byKey.values()];
}
