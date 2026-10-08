import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PlaceOption = {
  id: number | null;
  name: string;
  city: string;
  country: string;
  category: "pub" | "festival" | null;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
    .toLocaleLowerCase("cs");
  const requestedCategory = request.nextUrl.searchParams.get("category");
  if (requestedCategory !== "pub" && requestedCategory !== "festival") {
    return NextResponse.json({ places: [] });
  }

  const [catalogResult, recentResult] = await Promise.all([
    supabase.from("places")
      .select("id, name, city, country, category")
      .eq("category", requestedCategory)
      .order("created_at", { ascending: false })
      .limit(160),
    supabase.from("tastings")
      .select("place, place_category")
      .eq("user_id", user.id)
      .not("place", "is", null)
      .order("tasted_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(80),
  ]);
  if (catalogResult.error || recentResult.error) {
    return NextResponse.json({ error: "Místa se nepodařilo načíst." }, { status: 500 });
  }

  const catalog: PlaceOption[] = (catalogResult.data ?? []).map(item => ({
    id: item.id, name: item.name, city: item.city, country: item.country,
    category: item.category as "pub" | "festival",
  }));
  const recent: PlaceOption[] = (recentResult.data ?? [])
    .filter(item => (item.place_category === requestedCategory || item.place_category == null)
      && item.place && !/^doma$/i.test(item.place.trim()))
    .map(item => ({ id: null, name: item.place!, city: "", country: "", category: null }));

  const found = new Set<string>();
  const matches = [...catalog, ...recent].filter(item => {
    const label = [item.name, item.city, item.country].join(" ").toLocaleLowerCase("cs");
    if (q && !label.includes(q)) return false;
    const key = `${item.id ?? "legacy"}:${item.name.toLocaleLowerCase("cs")}`;
    if (found.has(key)) return false;
    found.add(key);
    return true;
  }).slice(0, 25);

  return NextResponse.json({ places: matches }, { headers: { "Cache-Control": "private, no-store" } });
}
