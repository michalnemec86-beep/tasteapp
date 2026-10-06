export type BeerCatalogItem = {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
  brewery: {
    id: number;
    name: string;
    country: string | null;
  } | null;
  style: { id: number; name: string } | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  isNonAlcoholic: boolean;
  canTaste: boolean;
  hops: Array<{ id: number; name: string }>;
  totalQuantity: number;
  myQuantity: number;
  historicalMatch?: boolean;
  referenceReady: boolean;
  referenceMissing: string[];
};

export type BeerCatalogFilterMode =
  | "all"
  | "tasted"
  | "mine";

export type BeerCatalogSortMode =
  | "default"
  | "alpha"
  | "most"
  | "least"
  | "country";

export type BeerCatalogFacets = {
  letters: string[];
  countries: string[];
};

export type BeerCatalogSummary = {
  total: number;
  tasted: number;
  mine: number;
  breweries: number;
  countries: number;
};

export function beerInitial(
  name: string
) {
  const first =
    name
      .trim()
      .charAt(0)
      .toLocaleUpperCase(
        "cs"
      );

  const normalized =
    first
      .normalize("NFD")
      .replace(
        /\p{M}/gu,
        ""
      );

  return /^[A-Z]$/.test(
    normalized
  )
    ? normalized
    : "#";
}

export function getBeerCatalogFacets(
  beers: BeerCatalogItem[]
): BeerCatalogFacets {
  const letters =
    Array.from(
      new Set(
        beers.map(
          (beer) =>
            beerInitial(
              beer.name
            )
        )
      )
    ).sort(
      (a, b) => {
        if (a === "#") {
          return 1;
        }

        if (b === "#") {
          return -1;
        }

        return a.localeCompare(
          b,
          "cs"
        );
      }
    );

  const countries =
    Array.from(
      new Set(
        beers
          .map(
            (beer) =>
              beer.brewery
                ?.country
          )
          .filter(
            (
              item
            ): item is string =>
              Boolean(item)
          )
      )
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "cs",
          {
            sensitivity:
              "base",
          }
        )
    );

  return {
    letters,
    countries,
  };
}

export function filterBeerCatalogItems(
  beers: BeerCatalogItem[],
  {
    filter,
    sort,
    search,
    country,
    letter,
  }: {
    filter: BeerCatalogFilterMode;
    sort: BeerCatalogSortMode;
    search: string;
    country: string;
    letter: string;
  }
) {
  const needle =
    search
      .trim()
      .toLocaleLowerCase(
        "cs"
      );

  return beers
    .filter((beer) => {
      if (
        filter === "tasted" &&
        beer.totalQuantity === 0
      ) {
        return false;
      }

      if (
        filter === "mine" &&
        beer.myQuantity === 0
      ) {
        return false;
      }

      if (
        country &&
        beer.brewery
          ?.country !== country
      ) {
        return false;
      }

      if (
        letter &&
        beerInitial(
          beer.name
        ) !== letter
      ) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        beer.name,
        beer.brand?.name,
        beer.brewery?.name,
        beer.brewery?.country,
        beer.style?.name,
        ...beer.hops.map(
          (hop) =>
            hop.name
        ),
      ].some(
        (value) =>
          value
            ?.toLocaleLowerCase(
              "cs"
            )
            .includes(
              needle
            )
      );
    })
    .sort((a, b) => {
      const aCount =
        filter === "mine"
          ? a.myQuantity
          : a.totalQuantity;

      const bCount =
        filter === "mine"
          ? b.myQuantity
          : b.totalQuantity;

      if (sort === "most") {
        return (
          bCount -
            aCount ||
          a.name.localeCompare(
            b.name,
            "cs",
            {
              sensitivity:
                "base",
            }
          )
        );
      }

      if (
        sort === "least"
      ) {
        return (
          aCount -
            bCount ||
          a.name.localeCompare(
            b.name,
            "cs",
            {
              sensitivity:
                "base",
            }
          )
        );
      }

      if (
        sort === "country"
      ) {
        return (
          (
            a.brewery
              ?.country ??
            ""
          ).localeCompare(
            b.brewery
              ?.country ??
              "",
            "cs",
            {
              sensitivity:
                "base",
            }
          ) ||
          a.name.localeCompare(
            b.name,
            "cs",
            {
              sensitivity:
                "base",
            }
          )
        );
      }

      if (
        sort === "alpha"
      ) {
        return a.name.localeCompare(
          b.name,
          "cs",
          {
            sensitivity:
              "base",
          }
        );
      }

      return (
        Number(
          b.referenceReady
        ) -
          Number(
            a.referenceReady
          ) ||
        a.name.localeCompare(
          b.name,
          "cs",
          {
            sensitivity:
              "base",
          }
        )
      );
    });
}
