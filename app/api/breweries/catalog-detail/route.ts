import { NextRequest, NextResponse } from "next/server";

import { fetchAllRows } from "@/lib/fetch-all-rows";
import { createClient } from "@/lib/supabase/server";

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const breweryId = Number(
    request.nextUrl.searchParams.get("breweryId")
  );

  if (
    !Number.isInteger(breweryId) ||
    breweryId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid brewery id" },
      { status: 400 }
    );
  }

  const beers = await fetchAllRows((from, to) =>
    supabase
      .from("beers")
      .select(`
        id,
        name,
        brands (
          id,
          name
        ),
        plato,
        abv,
        ibu,
        beer_styles (
          id,
          name
        ),
        tastings (
          user_id,
          quantity
        )
      `)
      .eq("brewery_id", breweryId)
      .order("name")
      .order("id")
      .range(from, to)
  );

  const items = beers.map((beer) => {
    const brand = one(beer.brands);
    const style = one(beer.beer_styles);
    const userTastingCounts: Record<string, number> = {};

    for (const tasting of beer.tastings ?? []) {
      if (!tasting.user_id) {
        continue;
      }

      userTastingCounts[tasting.user_id] =
        (userTastingCounts[tasting.user_id] ?? 0) +
        (tasting.quantity ?? 1);
    }

    return {
      id: beer.id,
      name: beer.name,
      brandId: brand?.id ?? null,
      brandName: brand?.name ?? null,
      styleName: style?.name ?? null,
      plato: beer.plato,
      abv: beer.abv,
      ibu: beer.ibu,
      tastingCount: Object.values(userTastingCounts).reduce(
        (sum, quantity) => sum + quantity,
        0
      ),
      userTastingCounts,
    };
  });

  return NextResponse.json(
    { beers: items },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
