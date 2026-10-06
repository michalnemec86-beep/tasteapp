import { NextRequest, NextResponse } from "next/server";

import { fetchAllRows } from "@/lib/fetch-all-rows";
import {
  fetchCatalogueRows,
  getNewCatalogueIds,
} from "@/lib/catalogue-news";
import { getNewsRange } from "@/lib/navigation-news";
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

  let newsRange;
  try {
    newsRange = getNewsRange(
      request.nextUrl.searchParams.get("newSince") ?? undefined,
      request.nextUrl.searchParams.get("newUntil") ?? undefined
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid news range" },
      { status: 400 }
    );
  }

  const selectedIds = await getNewCatalogueIds(
    supabase,
    "breweries",
    user.id,
    newsRange
  );

  const type = request.nextUrl.searchParams.get("type");

  if (type === "world") {
    const breweries = await fetchCatalogueRows(
      (from, to, ids) => {
        let query = supabase
          .from("breweries")
          .select("id, country");

        if (ids) {
          query = query.in("id", ids);
        }

        return query
          .order("id")
          .range(from, to);
      },
      selectedIds
    );

    const counts = new Map<string, number>();

    for (const brewery of breweries) {
      const country = brewery.country?.trim();

      if (!country) {
        continue;
      }

      counts.set(
        country,
        (counts.get(country) ?? 0) + 1
      );
    }

    const items = Array.from(counts.entries())
      .map(([name, count]) => ({
        id: name,
        name,
        count,
      }))
      .sort((a, b) =>
        b.count !== a.count
          ? b.count - a.count
          : a.name.localeCompare(b.name, "cs", {
              sensitivity: "base",
            })
      );

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  if (type === "czech") {
    const [breweries, tastingRows] = await Promise.all([
      fetchCatalogueRows(
        (from, to, ids) => {
          let query = supabase
            .from("breweries")
            .select(
              "id, name, city, latitude, longitude, closed_year"
            )
            .eq("country", "Česko")
            .not("latitude", "is", null)
            .not("longitude", "is", null);

          if (ids) {
            query = query.in("id", ids);
          }

          return query
            .order("id")
            .range(from, to);
        },
        selectedIds
      ),
      fetchAllRows((from, to) =>
        supabase
          .from("tastings")
          .select("beer_id, beers ( brewery_id )")
          .eq("user_id", user.id)
          .order("id")
          .range(from, to)
      ),
    ]);

    const personalBreweryIds = new Set<number>();

    for (const tasting of tastingRows) {
      const beer = one(tasting.beers);
      const breweryId = beer?.brewery_id;

      if (breweryId != null) {
        personalBreweryIds.add(breweryId);
      }
    }

    const items = breweries.flatMap((brewery) => {
      if (
        brewery.latitude == null ||
        brewery.longitude == null
      ) {
        return [];
      }

      return [
        {
          id: brewery.id,
          name: brewery.name,
          city: brewery.city,
          latitude: brewery.latitude,
          longitude: brewery.longitude,
          closedYear: brewery.closed_year,
          isPersonal: personalBreweryIds.has(brewery.id),
        },
      ];
    });

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { error: "Unsupported map type" },
    { status: 400 }
  );
}
