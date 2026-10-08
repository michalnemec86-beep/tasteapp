import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRating } from "@/lib/ratings";

// Personal rating history is never read from a different user's account.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beerIdValue = request.nextUrl.searchParams.get("beerId") ?? "";
  const beerId = Number(beerIdValue);
  if (!/^\d+$/.test(beerIdValue) || !Number.isSafeInteger(beerId) || beerId < 1) {
    return NextResponse.json({ error: "Neplatné pivo." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tastings")
    .select("id, rating, rated_at, tasted_on, created_at")
    .eq("user_id", user.id)
    .eq("beer_id", beerId)
    .not("rating", "is", null)
    .order("rated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load personal last tasting rating:", error.message);
    return NextResponse.json({ error: "Hodnocení se nepodařilo načíst." }, { status: 500 });
  }

  const lastRating = data && isRating(data.rating)
    ? { rating: data.rating, ratedAt: data.rated_at ?? data.created_at, tastedOn: data.tasted_on }
    : null;

  return NextResponse.json({ lastRating }, { headers: { "Cache-Control": "private, no-store" } });
}
