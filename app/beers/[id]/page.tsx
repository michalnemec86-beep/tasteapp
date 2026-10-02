import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { beerHref } from "@/lib/entity-navigation";

// Compatibility URL: beers live inside their producer's profile.
export default async function BeerRedirect({ params }: { params: Promise<{ id: string }> }) {
  const beerId = Number((await params).id);
  if (!Number.isSafeInteger(beerId) || beerId < 1) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: beer, error } = await supabase.from("beers")
    .select("id, brewery_id, beer_versions ( brewery_id, is_current )").eq("id", beerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!beer) notFound();
  const breweryId = beer.beer_versions?.find(version => version.is_current)?.brewery_id ?? beer.brewery_id;
  if (breweryId) redirect(beerHref(beerId, breweryId));
  redirect(`/beers?beer=${beerId}`);
}
