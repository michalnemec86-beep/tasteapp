import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { isRating, type RatedTasting } from "@/lib/ratings";
import RatingsClient from "./RatingsClient";
import "../stats/stats-concept.css";
import "./ratings.css";

export const metadata: Metadata = { title: "Hodnocení" };

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function RatingsPage({ searchParams }: {
  searchParams: Promise<{ beer?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [tastings, profiles, params] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("tastings").select(`
      id, user_id, rating, rated_at, created_at, packaging,
      beer_versions (
        breweries!beer_versions_brewery_id_fkey (id, name, country, logo_url),
        beer_styles (id, name)
      ),
      beers (id, name, breweries (id, name, country, logo_url), beer_styles (id, name))
    `).not("rating", "is", null).order("rated_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).range(from, to)),
    fetchAllRows((from, to) => supabase.from("profiles").select("id, display_name, avatar_url").order("id").range(from, to)),
    searchParams,
  ]);
  const users = new Map(profiles.map(profile => [profile.id, profile]));
  const rows: RatedTasting[] = tastings.flatMap(tasting => {
    const beer = singleRelation(tasting.beers);
    if (!isRating(tasting.rating) || !beer) return [];
    const version = singleRelation(tasting.beer_versions);
    const brewery = singleRelation(version?.breweries) ?? singleRelation(beer.breweries);
    const style = singleRelation(version?.beer_styles) ?? singleRelation(beer.beer_styles);
    const profile = users.get(tasting.user_id);
    return [{ id: tasting.id, beerId: beer.id, beerName: beer.name,
      breweryId: brewery?.id ?? null, breweryName: brewery?.name ?? "Neznámý pivovar",
      logoUrl: brewery?.logo_url ?? null, country: brewery?.country || "Nezadáno",
      styleId: style?.id ?? null, style: style?.name || "Nezadáno", packaging: tasting.packaging || "other",
      userId: tasting.user_id, userName: profile?.display_name || "Štamgast", avatarUrl: profile?.avatar_url ?? null,
      rating: tasting.rating, ratedAt: tasting.rated_at || tasting.created_at }];
  });
  const beerParam = typeof params.beer === "string" && /^\d+$/.test(params.beer) ? params.beer : "";
  return <main className="taste-stats-concept taste-ratings-concept">
    <RatingsClient key={beerParam} rows={rows} initialBeer={beerParam} currentUserId={user.id}/>
  </main>;
}
