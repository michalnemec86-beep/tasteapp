import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBeerHref } from "@/lib/entity-navigation";

/** Compatibility resolver: beer details now live inside the brewery profile. */
export default async function BeerRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const beerId = Number(id);
  if (!Number.isSafeInteger(beerId) || beerId < 1) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: beer, error } = await supabase.from("beers")
    .select("id, brewery_id").eq("id", beerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!beer) notFound();
  redirect(beer.brewery_id ? getBeerHref(beer.id, beer.brewery_id) : `/beers?beer=${beer.id}`);
}
