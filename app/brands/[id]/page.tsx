import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { brandHref, resolveBrandBreweryIds } from "@/lib/entity-navigation";

// A brand may have several producers; do not silently select an arbitrary one.
export default async function BrandRedirect({ params }: { params: Promise<{ id: string }> }) {
  const brandId = Number((await params).id);
  if (!Number.isSafeInteger(brandId) || brandId < 1) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const beers = await fetchAllRows((from, to) => supabase.from("beers")
    .select("id, brewery_id, beer_versions ( brewery_id, is_current )")
    .eq("brand_id", brandId).order("id").range(from, to));
  const { data: links, error } = await supabase.from("brewery_brands")
    .select("brewery_id").eq("brand_id", brandId);
  if (error) throw new Error(error.message);
  const ids = resolveBrandBreweryIds(beers.flatMap(beer => {
    const id = beer.beer_versions?.find(version => version.is_current)?.brewery_id ?? beer.brewery_id;
    return id ? [id] : [];
  }), (links ?? []).map(link => link.brewery_id));
  if (ids.length === 1) redirect(brandHref(brandId, ids[0]));
  // The existing brewery list presents all matching producers, including empty portfolios.
  redirect(`/breweries?brand=${brandId}&focus=1`);
}
