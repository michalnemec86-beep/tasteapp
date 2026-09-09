from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, repl: str, label: str) -> str:
    result, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 regex match, found {count}")
    return result


# ---------------------------------------------------------------------------
# app/tastings/actions.ts
# Existing-beer tastings must never rewrite the current catalog recipe.
# ---------------------------------------------------------------------------
path = "app/tastings/actions.ts"
text = read(path)

new_resolve_beer = r'''async function resolveBeer(
  supabase: SupabaseClient,
  values: TastingFormValues,
  breweryId: number,
  styleId: number | null
) {
  if (values.existingBeerId) {
    const parsedBeerId =
      Number(values.existingBeerId);

    if (
      !Number.isInteger(parsedBeerId) ||
      parsedBeerId < 1
    ) {
      throw new Error(
        "Neplatné ID piva."
      );
    }

    const {
      data: selectedBeer,
      error: selectedBeerError,
    } = await supabase
      .from("beers")
      .select("id, brewery_id")
      .eq("id", parsedBeerId)
      .maybeSingle();

    if (selectedBeerError) {
      throw new Error(
        selectedBeerError.message
      );
    }

    if (!selectedBeer) {
      throw new Error(
        "Vybrané pivo už v katalogu neexistuje."
      );
    }

    return {
      beerId: selectedBeer.id,
      isNewBeer: false,
    };
  }

  const {
    data: breweryBeers,
    error: breweryBeersError,
  } = await supabase
    .from("beers")
    .select("id, name")
    .eq("brewery_id", breweryId);

  if (breweryBeersError) {
    throw new Error(
      breweryBeersError.message
    );
  }

  const existingBeer =
    breweryBeers?.find(
      (beer) =>
        normalizeText(beer.name) ===
        normalizeText(values.beerName)
    ) ?? null;

  if (existingBeer) {
    return {
      beerId: existingBeer.id,
      isNewBeer: false,
    };
  }

  const {
    data: newBeer,
    error: beerError,
  } = await supabase
    .from("beers")
    .insert({
      name: values.beerName,
      brewery_id: breweryId,
      style_id: styleId,
      plato: values.platoValue
        ? Number(values.platoValue)
        : null,
      abv: values.abvValue
        ? Number(values.abvValue)
        : null,
      ibu: values.ibuValue
        ? Number(values.ibuValue)
        : null,
    })
    .select("id")
    .single();

  if (beerError || !newBeer) {
    throw new Error(
      beerError?.message ||
        "Pivo se nepodařilo vytvořit."
    );
  }

  return {
    beerId: newBeer.id,
    isNewBeer: true,
  };
}

'''

text = sub_once(
    text,
    r'async function resolveBeer\(.*?\n\}\n\n(?=// ==================================================\n// NAJDEME / VYTVOŘÍME CHMELY)',
    new_resolve_beer,
    "replace resolveBeer",
)

new_resolve_catalog = r'''async function resolveCatalogData(
  supabase: SupabaseClient,
  values: TastingFormValues,
  _replaceHops: boolean
) {
  const brewery =
    await resolveBrewery(
      supabase,
      values
    );

  const styleId =
    await resolveStyle(
      supabase,
      values.styleName
    );

  const {
    beerId,
    isNewBeer,
  } = await resolveBeer(
    supabase,
    values,
    brewery.id,
    styleId
  );

  const hopIds =
    await resolveHopIds(
      supabase,
      values.hopNames
    );

  // Ochutnávka existujícího piva nesmí měnit jeho současný
  // katalogový recept. Odlišné snapshoty řeší beer_versions.
  if (isNewBeer) {
    await addBeerHops(
      supabase,
      beerId,
      hopIds
    );
  }

  return beerId;
}

'''

text = sub_once(
    text,
    r'async function resolveCatalogData\(.*?\n\}\n\n(?=// ==================================================\n// OBNOVENÍ STRÁNEK)',
    new_resolve_catalog,
    "replace resolveCatalogData",
)
write(path, text)


# ---------------------------------------------------------------------------
# app/page.tsx
# Load the tasting version and show a quiet year only for multi-version beers.
# ---------------------------------------------------------------------------
path = "app/page.tsx"
text = read(path)

text = replace_once(
    text,
    '''  beer_hops:\n    | {\n        hops:\n          | HopRow\n          | null;\n      }[]\n    | null;\n};''',
    '''  beer_hops:\n    | {\n        hops:\n          | HopRow\n          | null;\n      }[]\n    | null;\n\n  beer_versions?:\n    | { id: number }[]\n    | null;\n};''',
    "home TastingBeerRow version list",
)

text = replace_once(
    text,
    '''  notes:\n    | string\n    | null;\n\n  beers:''',
    '''  notes:\n    | string\n    | null;\n\n  beer_versions?:\n    | {\n        id: number;\n        version_year: number | null;\n        beer_styles: BeerStyleRow | null;\n        beer_version_hops:\n          | { hops: HopRow | null }[]\n          | null;\n      }\n    | null;\n\n  beers:''',
    "home TastingRow version relation",
)

text = replace_once(
    text,
    '''        notes,\n        beers (\n          id,\n          name,''',
    '''        notes,\n        beer_versions (\n          id,\n          version_year,\n          beer_styles (\n            id,\n            name\n          ),\n          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          )\n        ),\n        beers (\n          id,\n          name,\n          beer_versions (\n            id\n          ),''',
    "home tasting query version fields",
)

text = replace_once(
    text,
    '''  const breweryId =\n    tasting.beers\n      ?.breweries\n      ?.id ??\n    null;\n\n  const metadata = [''',
    '''  const breweryId =\n    tasting.beers\n      ?.breweries\n      ?.id ??\n    null;\n\n  const showVersionYear =\n    (\n      tasting.beers\n        ?.beer_versions\n        ?.length ?? 0\n    ) > 1;\n\n  const versionYear =\n    tasting.beer_versions\n      ?.version_year ??\n    Number(\n      tasting.tasted_on\n        .slice(0, 4)\n    );\n\n  const metadata = [''',
    "home version year variables",
)

text = replace_once(
    text,
    '''    tasting.beers\n      ?.beer_styles\n      ?.name ??\n      null,''',
    '''    tasting.beer_versions\n      ?.beer_styles\n      ?.name ??\n    tasting.beers\n      ?.beer_styles\n      ?.name ??\n      null,''',
    "home timeline version style",
)

text = replace_once(
    text,
    '''                    )}\n                  </div>\n\n                  {quantity > 1 && (''',
    '''                    )}\n\n                    {showVersionYear &&\n                      versionYear && (\n                      <span\n                        style={{\n                          marginLeft: "5px",\n                          color:\n                            "var(--taste-text-muted)",\n                          fontSize: "10px",\n                          fontWeight: 600,\n                          opacity: 0.62,\n                          whiteSpace: "nowrap",\n                        }}\n                      >\n                        ({versionYear})\n                      </span>\n                    )}\n                  </div>\n\n                  {quantity > 1 && (''',
    "home subtle version year",
)
write(path, text)


# ---------------------------------------------------------------------------
# app/stats/page.tsx
# ---------------------------------------------------------------------------
path = "app/stats/page.tsx"
text = read(path)

text = replace_once(
    text,
    '''          quantity,\n          beers (''',
    '''          quantity,\n          beer_versions (\n            beer_styles (\n              id,\n              name\n            ),\n            beer_version_hops (\n              hops (\n                id,\n                name\n              )\n            )\n          ),\n          beers (''',
    "stats query versions",
)

text = replace_once(
    text,
    '''      const beer = singleRelation(tasting.beers);\n\n      return {\n        ...tasting,''',
    '''      const beer = singleRelation(tasting.beers);\n      const beerVersion =\n        singleRelation(tasting.beer_versions);\n\n      return {\n        ...tasting,\n        beer_versions: beerVersion\n          ? {\n              ...beerVersion,\n              beer_styles: singleRelation(\n                beerVersion.beer_styles\n              ),\n              beer_version_hops:\n                (beerVersion.beer_version_hops ?? []).map(\n                  (versionHop) => ({\n                    ...versionHop,\n                    hops: singleRelation(\n                      versionHop.hops\n                    ),\n                  })\n                ),\n            }\n          : null,''',
    "stats normalize version",
)

text = sub_once(
    text,
    r'''  const totalStyles = new Set\(\n    filteredTastings\n      \.map\(\n        \(tasting\) => tasting\.beers\?\.beer_styles\?\.id\n      \)\n      \.filter\(\(id\) => id != null\)\n  \)\.size;''',
    '''  const totalStyles = new Set(\n    filteredTastings\n      .map((tasting) =>\n        (\n          tasting.beer_versions\n            ?.beer_styles ??\n          tasting.beers\n            ?.beer_styles\n        )?.id\n      )\n      .filter((id) => id != null)\n  ).size;''',
    "stats totalStyles version",
)
write(path, text)


# ---------------------------------------------------------------------------
# app/profiles/[id]/page.tsx
# ---------------------------------------------------------------------------
path = "app/profiles/[id]/page.tsx"
text = read(path)

text = replace_once(
    text,
    '''        notes,\n        beers (''',
    '''        notes,\n        beer_versions (\n          id,\n          version_year,\n          beer_styles (\n            id,\n            name\n          ),\n          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          )\n        ),\n        beers (''',
    "profile query versions",
)

text = replace_once(
    text,
    '''        const beer =\n          singleRelation(\n            tasting.beers\n          );\n\n        return {\n          ...tasting,''',
    '''        const beer =\n          singleRelation(\n            tasting.beers\n          );\n\n        const beerVersion =\n          singleRelation(\n            tasting.beer_versions\n          );\n\n        return {\n          ...tasting,\n\n          beer_versions:\n            beerVersion\n              ? {\n                  ...beerVersion,\n                  beer_styles:\n                    singleRelation(\n                      beerVersion.beer_styles\n                    ),\n                  beer_version_hops:\n                    (\n                      beerVersion.beer_version_hops ??\n                      []\n                    ).map(\n                      (versionHop) => ({\n                        ...versionHop,\n                        hops:\n                          singleRelation(\n                            versionHop.hops\n                          ),\n                      })\n                    ),\n                }\n              : null,''',
    "profile normalize version",
)
write(path, text)


# ---------------------------------------------------------------------------
# lib/achievement-sync.ts
# ---------------------------------------------------------------------------
path = "lib/achievement-sync.ts"
text = read(path)

text = replace_once(
    text,
    '''        show_in_timeline,\n        beers (''',
    '''        show_in_timeline,\n        beer_versions (\n          beer_styles (\n            id\n          ),\n          beer_version_hops (\n            hops (\n              id,\n              name\n            )\n          )\n        ),\n        beers (''',
    "achievement sync query versions",
)
write(path, text)


# ---------------------------------------------------------------------------
# app/breweries/[id]/page.tsx
# Show historical recipe years under a single base beer.
# ---------------------------------------------------------------------------
path = "app/breweries/[id]/page.tsx"
text = read(path)

text = replace_once(
    text,
    '''        beer_hops (\n          hops (\n            name\n          )\n        ),\n        tastings (''',
    '''        beer_hops (\n          hops (\n            name\n          )\n        ),\n        beer_versions (\n          id,\n          version_year,\n          is_current,\n          plato,\n          abv,\n          ibu,\n          beer_styles (\n            name\n          ),\n          beer_version_hops (\n            hops (\n              name\n            )\n          )\n        ),\n        tastings (''',
    "brewery query versions",
)

text = replace_once(
    text,
    '''            .filter(\n              (\n                name\n              ): name is string =>\n                Boolean(name)\n            ),\n      }))''',
    '''            .filter(\n              (\n                name\n              ): name is string =>\n                Boolean(name)\n            ),\n        versionHistory:\n          (beer.beer_versions ?? [])\n            .filter(\n              (version) =>\n                !version.is_current\n            )\n            .map((version) => ({\n              ...version,\n              beer_styles:\n                singleRelation(\n                  version.beer_styles\n                ),\n              hopNames:\n                (\n                  version.beer_version_hops ??\n                  []\n                )\n                  .map((versionHop) =>\n                    singleRelation(\n                      versionHop.hops\n                    )?.name\n                  )\n                  .filter(\n                    (\n                      name\n                    ): name is string =>\n                      Boolean(name)\n                  ),\n            }))\n            .sort((a, b) =>\n              (b.version_year ?? 0) -\n              (a.version_year ?? 0)\n            ),\n      }))''',
    "brewery map version history",
)

text = replace_once(
    text,
    '''                      </div>\n                    </div>\n\n                    <div\n                    style={{''',
    '''                      </div>\n\n                      {beer.versionHistory.length > 0 && (\n                        <div\n                          style={{\n                            display: "grid",\n                            gap: "3px",\n                            marginTop: "7px",\n                          }}\n                        >\n                          {beer.versionHistory.map(\n                            (version) => {\n                              const versionMeta = [\n                                version.beer_styles?.name ?? null,\n                                version.plato != null\n                                  ? `${version.plato}°`\n                                  : null,\n                                version.abv != null\n                                  ? `${version.abv} %`\n                                  : null,\n                                version.ibu != null\n                                  ? `IBU ${version.ibu}`\n                                  : null,\n                              ].filter(Boolean);\n\n                              return (\n                                <div\n                                  key={version.id}\n                                  style={{\n                                    display: "flex",\n                                    flexWrap: "wrap",\n                                    alignItems: "center",\n                                    gap: "4px",\n                                    color:\n                                      "var(--taste-text-muted)",\n                                    fontSize: "9px",\n                                    lineHeight: 1.35,\n                                    opacity: 0.72,\n                                  }}\n                                >\n                                  <span\n                                    style={{\n                                      minWidth: "34px",\n                                      color:\n                                        "var(--taste-text-soft)",\n                                      fontWeight: 750,\n                                    }}\n                                  >\n                                    {version.version_year ??\n                                      "dříve"}\n                                  </span>\n                                  {versionMeta.length > 0 && (\n                                    <span>\n                                      {versionMeta.join(" · ")}\n                                    </span>\n                                  )}\n                                </div>\n                              );\n                            }\n                          )}\n                        </div>\n                      )}\n                    </div>\n\n                    <div\n                    style={{''',
    "brewery render version history",
)
write(path, text)

print("beer version UI patch applied")
