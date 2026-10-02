"use server";

import { createClient } from "@/lib/supabase/server";
import { FEATURES } from "@/lib/features";
import { isNewsTimestamp, type NavigationNews, type NewsSection } from "@/lib/navigation-news";

export async function getNavigationNews(section: NewsSection | null = null, seenThrough: string | null = null): Promise<NavigationNews | null> {
  if (section !== null && !["activity", "beers", "breweries"].includes(section)) throw new Error("Neplatná sekce.");
  if (seenThrough !== null && !isNewsTimestamp(seenThrough)) throw new Error("Neplatný čas návštěvy.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("navigation_news", {
    p_seen_section: section, p_seen_through: seenThrough, p_include_achievements: FEATURES.achievements,
  });
  if (error) throw new Error(error.message);
  if (!data || !isNewsTimestamp(data.snapshot_at)) throw new Error("Nepodařilo se načíst novinky.");
  return { userId: user.id, snapshotAt: data.snapshot_at,
    counts: { activity: Number(data.activity_count), beers: Number(data.beer_count), breweries: Number(data.brewery_count) },
    since: { beers: data.beers_since, breweries: data.breweries_since },
  };
}
