import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  loadBeerCatalogPage,
} from "@/lib/beer-catalog-server";
import type {
  BeerCatalogFilterMode,
  BeerCatalogSortMode,
} from "@/lib/beer-catalog-page";
import {
  getNewCatalogueIds,
} from "@/lib/catalogue-news";
import {
  getNewsRange,
} from "@/lib/navigation-news";
import {
  createClient,
} from "@/lib/supabase/server";

const PAGE_SIZE = 60;

function positiveId(
  value: string | null
) {
  if (
    !value ||
    !/^[1-9]\d*$/.test(
      value
    )
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isSafeInteger(
    parsed
  )
    ? parsed
    : null;
}

function offsetValue(
  value: string | null
) {
  if (
    !value ||
    !/^\d+$/.test(value)
  ) {
    return 0;
  }

  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed < 0
  ) {
    return 0;
  }

  return Math.min(
    parsed,
    100_000
  );
}

export async function GET(
  request: NextRequest
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const params =
    request.nextUrl
      .searchParams;

  const filterValue =
    params.get(
      "filter"
    );

  const filter:
    BeerCatalogFilterMode =
    filterValue ===
      "tasted" ||
    filterValue ===
      "mine"
      ? filterValue
      : "all";

  const sortValue =
    params.get(
      "sort"
    );

  const sort:
    BeerCatalogSortMode =
    sortValue ===
      "alpha" ||
    sortValue ===
      "most" ||
    sortValue ===
      "least" ||
    sortValue ===
      "country"
      ? sortValue
      : "default";

  const styleId =
    positiveId(
      params.get(
        "style"
      )
    );

  const hopId =
    positiveId(
      params.get(
        "hop"
      )
    );

  const beerId =
    positiveId(
      params.get(
        "beer"
      )
    );

  const search =
    (
      params.get("q") ??
      ""
    )
      .trim()
      .slice(0, 120);

  const country =
    (
      params.get(
        "country"
      ) ??
      ""
    )
      .trim()
      .slice(0, 120);

  const letter =
    (
      params.get(
        "letter"
      ) ??
      ""
    )
      .trim()
      .slice(0, 2);

  const offset =
    offsetValue(
      params.get(
        "offset"
      )
    );

  let newsRange:
    | {
        since: string;
        until: string;
      }
    | null =
    null;

  try {
    newsRange =
      getNewsRange(
        params.get(
          "newSince"
        ) ??
          undefined,
        params.get(
          "newUntil"
        ) ??
          undefined
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid news range",
      },
      {
        status: 400,
      }
    );
  }

  const selectedIds =
    await getNewCatalogueIds(
      supabase,
      "beers",
      user.id,
      newsRange
    );

  const result =
    await loadBeerCatalogPage({
      supabase,
      userId: user.id,
      scope: {
        styleId,
        hopId,
        beerId,
      },
      selectedIds,
      filter,
      sort,
      search,
      country,
      letter,
      offset,
      limit: PAGE_SIZE,
    });

  return NextResponse.json(
    result,
    {
      headers: {
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
