import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/fetch-all-rows";

export async function fetchCatalogueRows<T>(fetchPage: (from: number, to: number, ids: number[] | null) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, ids: number[] | null): Promise<T[]> {
  if (ids === null) return fetchAllRows((from, to) => fetchPage(from, to, null), 1000);
  // Small IN lists avoid long API URLs. Known ID batches never stop early if
  // another user deletes an item between reading events and loading the list.
  const rows: T[] = [];
  for (let from = 0; from < ids.length; from += 600) {
    const batches = [0, 200, 400].map(offset => ids.slice(from + offset, from + offset + 200)).filter(batch => batch.length);
    const pages = await Promise.all(batches.map(batch => fetchPage(0, batch.length - 1, batch)));
    for (const page of pages) {
      if (page.error) throw new Error(page.error.message);
      rows.push(...(page.data ?? []));
    }
  }
  return rows;
}

export async function getNewCatalogueIds(supabase: SupabaseClient, section: "beers" | "breweries", userId: string, range: { since: string; until: string } | null) {
  if (!range) return null;
  const field = section === "beers" ? "beer_id" : "brewery_id";
  const fetchPage = (from: number, to: number) => supabase.from("catalog_events")
    .select("id, beer_id, brewery_id").eq("event_type", section === "beers" ? "beer_created" : "brewery_created")
    .eq("show_in_timeline", true).neq("actor_user_id", userId)
    .gt("created_at", range.since).lte("created_at", range.until).order("id").range(from, to);
  const first = await fetchPage(0, 499);
  if (first.error) throw new Error(first.error.message);
  const rows = first.data ?? [];
  if (rows.length === 500) rows.push(...await fetchAllRows((from, to) => fetchPage(from + 500, to + 500)));
  return [...new Set(rows.flatMap(row => { const id = row[field]; return id == null ? [] : [id]; }))];
}
