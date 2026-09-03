import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import BreweryEditModalClient from "../BreweryEditModalClient";
import BreweryNameHistoryItemClient from "../BreweryNameHistoryItemClient";
import CatalogBeerCreateModalClient from "../CatalogBeerCreateModalClient";
import {
  addBreweryNameHistory,
  createCatalogBeer,
  deleteBreweryNameHistory,
  updateBrewery,
  updateBreweryNameHistory,
} from "../actions";

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function breweryRelationLabel(
  relationType: string,
  direction: "from" | "to"
) {
  if (relationType === "continues_as") {
    return direction === "from"
      ? "Pokračuje jako"
      : "Navazuje na";
  }

  if (relationType === "branches_into") {
    return direction === "from"
      ? "Vznikl z něj"
      : "Vznikl z";
  }

  if (relationType === "merges_into") {
    return direction === "from"
      ? "Sloučil se do"
      : "Navazuje sloučením na";
  }

  return "Historická vazba";
}

type BreweryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BreweryDetailPage({
  params,
}: BreweryDetailPageProps) {
  const { id } = await params;

  const breweryId = Number(id);

  if (
    !Number.isInteger(breweryId) ||
    breweryId < 1
  ) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    {
      data: brewery,
      error,
    },
    {
      data: countries,
      error: countriesError,
    },
    {
      data: styles,
      error: stylesError,
    },
    {
      data: hops,
      error: hopsError,
    },
    {
      data: outgoingRelations,
      error: outgoingRelationsError,
    },
    {
      data: incomingRelations,
      error: incomingRelationsError,
    },
  ] = await Promise.all([
    supabase
      .from("breweries")
      .select(`
      id,
      name,
      city,
      country,
      address,
      website,
      founded_year,
      closed_year,
      latitude,
      longitude,
      beers (
        id,
        name,
        plato,
        abv,
        ibu,
        beer_styles (
          name
        ),
        tastings (
          id
        )
      ),
      brewery_name_history (
        id,
        previous_name,
        from_year,
        changed_year
      )
    `)
      .eq("id", breweryId)
      .single(),
    supabase
      .from("countries")
      .select("id, name")
      .order("name", {
        ascending: true,
      }),
    supabase
      .from("beer_styles")
      .select("id, name, aliases")
      .order("name", {
        ascending: true,
      }),
    supabase
      .from("hops")
      .select("id, name, aliases")
      .order("name", {
        ascending: true,
      }),
    supabase
      .from("brewery_relations")
      .select(`
        id,
        from_brewery_id,
        to_brewery_id,
        relation_type,
        relation_year,
        note
      `)
      .eq(
        "from_brewery_id",
        breweryId
      ),
    supabase
      .from("brewery_relations")
      .select(`
        id,
        from_brewery_id,
        to_brewery_id,
        relation_type,
        relation_year,
        note
      `)
      .eq(
        "to_brewery_id",
        breweryId
      ),
  ]);

  if (error || !brewery) {
    notFound();
  }

  if (countriesError) {
    throw new Error(
      countriesError.message
    );
  }

  if (stylesError) {
    throw new Error(
      stylesError.message
    );
  }

  if (hopsError) {
    throw new Error(
      hopsError.message
    );
  }

  if (outgoingRelationsError) {
    throw new Error(
      outgoingRelationsError.message
    );
  }

  if (incomingRelationsError) {
    throw new Error(
      incomingRelationsError.message
    );
  }

  const breweryBeers =
    (brewery.beers ?? [])
      .map((beer) => ({
        ...beer,
        beer_styles:
          singleRelation(
            beer.beer_styles
          ),
      }))
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "cs",
          {
            sensitivity: "base",
          }
        )
      );

  const history = [
    ...(brewery.brewery_name_history ?? []),
  ].sort(
    (a, b) =>
      (a.from_year ??
        a.changed_year ??
        Number.MAX_SAFE_INTEGER) -
      (b.from_year ??
        b.changed_year ??
        Number.MAX_SAFE_INTEGER)
  );

  const historyFromYear =
    history.reduce<number | null>(
      (earliest, item) => {
        if (item.from_year == null) {
          return earliest;
        }

        return earliest == null ||
          item.from_year < earliest
          ? item.from_year
          : earliest;
      },
      null
    );

  const relatedBreweryIds =
    Array.from(
      new Set([
        ...(outgoingRelations ?? []).map(
          (relation) =>
            relation.to_brewery_id
        ),
        ...(incomingRelations ?? []).map(
          (relation) =>
            relation.from_brewery_id
        ),
      ])
    );

  let relatedBreweries: {
    id: number;
    name: string;
  }[] = [];

  if (relatedBreweryIds.length > 0) {
    const {
      data,
      error: relatedBreweriesError,
    } = await supabase
      .from("breweries")
      .select("id, name")
      .in("id", relatedBreweryIds);

    if (relatedBreweriesError) {
      throw new Error(
        relatedBreweriesError.message
      );
    }

    relatedBreweries = data ?? [];
  }

  const relatedBreweryById =
    new Map(
      relatedBreweries.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  const relationItems = [
    ...(outgoingRelations ?? []).map(
      (relation) => ({
        ...relation,
        direction:
          "from" as const,
        relatedBreweryId:
          relation.to_brewery_id,
      })
    ),
    ...(incomingRelations ?? []).map(
      (relation) => ({
        ...relation,
        direction:
          "to" as const,
        relatedBreweryId:
          relation.from_brewery_id,
      })
    ),
  ]
    .flatMap((relation) => {
      const relatedBrewery =
        relatedBreweryById.get(
          relation.relatedBreweryId
        );

      if (!relatedBrewery) {
        return [];
      }

      return [
        {
          ...relation,
          relatedBrewery,
        },
      ];
    })
    .sort(
      (a, b) =>
        (a.relation_year ?? 0) -
        (b.relation_year ?? 0)
    );

  return (
    <main
      style={{
        maxWidth: "1250px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow="Detail pivovaru"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={brewery.name}
        subtitle={[
          brewery.city,
          brewery.country,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/breweries"
              className="taste-button-secondary"
              style={{
                fontSize: "12px",
                fontWeight: 650,
              }}
            >
              ← Katalog pivovarů
            </Link>

            <BreweryEditModalClient
              brewery={{
                id: brewery.id,
                name: brewery.name,
                city: brewery.city,
                country: brewery.country,
                address: brewery.address,
                website: brewery.website,
                foundedYear: brewery.founded_year,
                closedYear: brewery.closed_year,
                latitude: brewery.latitude,
                longitude: brewery.longitude,
              }}
              countries={countries ?? []}
              updateBreweryAction={updateBrewery}
              variant="primary"
            />
          </div>
        }
        stats={[
          {
            icon: "🍺",
            value:
              brewery.beers?.length ??
              0,
            label: "Zaznamenaných piv",
          },
          {
            icon: "◷",
            value:
              brewery.founded_year ??
              "—",
            label: "Rok založení",
          },
        ]}
      />

      <section
        className="taste-card"
        style={{
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "18px",
          }}
        >
          <DetailItem
            label="Město"
            value={brewery.city}
          />

          <DetailItem
            label="Stát"
            value={brewery.country}
          />

          <DetailItem
            label="Adresa"
            value={brewery.address}
          />

          <DetailItem
            label="Web"
            value={brewery.website}
          />

          <DetailItem
            label="Rok založení"
            value={
              brewery.founded_year != null
                ? historyFromYear != null &&
                  historyFromYear <
                    brewery.founded_year
                  ? `${brewery.founded_year} (historie od ${historyFromYear})`
                  : brewery.founded_year
                : historyFromYear != null
                  ? `Historie od ${historyFromYear}`
                  : null
            }
          />

          <DetailItem
            label="Ukončení provozu"
            value={
              brewery.closed_year
            }
          />
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "18px",
            borderTop:
              "1px solid var(--taste-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "14px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              className="taste-label"
            >
              Zaznamenaná piva
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {user.id ===
                "17be5dc3-a3f9-4fd2-ae90-dee7692034fc" && (
                <CatalogBeerCreateModalClient
                  breweryName={
                    brewery.name
                  }
                  styles={
                    styles ?? []
                  }
                  hops={
                    hops ?? []
                  }
                  createBeerAction={createCatalogBeer.bind(
                    null,
                    brewery.id
                  )}
                />
              )}

              <div
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize: "10px",
                }}
              >
                {breweryBeers.length}{" "}
                {breweryBeers.length === 1
                  ? "pivo"
                  : "piv"}
              </div>
            </div>
          </div>

          {breweryBeers.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: "0",
              }}
            >
              {breweryBeers.map(
                (beer, index) => (
                  <div
                    key={beer.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0,1fr) auto",
                      alignItems:
                        "center",
                      gap: "14px",
                      padding:
                        "10px 0",
                      borderBottom:
                        index <
                        breweryBeers.length -
                          1
                          ? "1px solid rgba(255,255,255,0.055)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          color:
                            "var(--taste-text)",
                          fontSize:
                            "13px",
                          fontWeight:
                            700,
                          lineHeight:
                            1.3,
                        }}
                      >
                        {beer.name}
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          alignItems:
                            "center",
                          gap:
                            "5px",
                          marginTop:
                            "6px",
                        }}
                      >
                        {beer.beer_styles?.name && (
                          <span
                            style={{
                              color:
                                "var(--taste-text-soft)",
                              fontSize:
                                "10px",
                              fontWeight:
                                650,
                            }}
                          >
                            {beer.beer_styles.name}
                          </span>
                        )}

                        {beer.plato != null && (
                          <span
                            style={{
                              padding:
                                "2px 6px",
                              borderRadius:
                                "999px",
                              border:
                                "1px solid var(--taste-border)",
                              color:
                                "var(--taste-text-muted)",
                              fontSize:
                                "9px",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {beer.plato} °P
                          </span>
                        )}

                        {beer.abv != null && (
                          <span
                            style={{
                              padding:
                                "2px 6px",
                              borderRadius:
                                "999px",
                              border:
                                "1px solid var(--taste-border)",
                              color:
                                "var(--taste-text-muted)",
                              fontSize:
                                "9px",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {beer.abv} %
                          </span>
                        )}

                        {beer.ibu != null && (
                          <span
                            style={{
                              padding:
                                "2px 6px",
                              borderRadius:
                                "999px",
                              border:
                                "1px solid var(--taste-border)",
                              color:
                                "var(--taste-text-muted)",
                              fontSize:
                                "9px",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            IBU {beer.ibu}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        color:
                          "var(--taste-amber-bright)",
                        fontSize:
                          "11px",
                        fontWeight:
                          750,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {beer.tastings?.length ??
                        0}
                      ×
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div
              style={{
                color:
                  "var(--taste-text-muted)",
                fontSize: "12px",
              }}
            >
              Zatím není zaznamenané žádné pivo.
            </div>
          )}
        </div>

        {relationItems.length > 0 && (
          <div
            style={{
              marginTop: "24px",
              paddingTop: "18px",
              borderTop:
                "1px solid var(--taste-border)",
            }}
          >
            <div
              className="taste-label"
              style={{
                marginBottom: "10px",
              }}
            >
              Historické vazby
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {relationItems.map(
                (relation) => (
                  <div
                    key={`${relation.direction}-${relation.id}`}
                    style={{
                      padding: "11px 12px",
                      border:
                        "1px solid var(--taste-border)",
                      borderRadius: "10px",
                      background:
                        "rgba(255,255,255,0.018)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems:
                          "baseline",
                        gap: "6px",
                        fontSize: "12px",
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          color:
                            "var(--taste-text-muted)",
                        }}
                      >
                        {breweryRelationLabel(
                          relation.relation_type,
                          relation.direction
                        )}
                        :
                      </span>

                      <Link
                        href={`/breweries/${relation.relatedBrewery.id}`}
                        style={{
                          color:
                            "var(--taste-amber-bright)",
                          fontWeight: 700,
                          textDecoration:
                            "none",
                        }}
                      >
                        {
                          relation
                            .relatedBrewery
                            .name
                        }
                      </Link>

                      {relation.relation_year !=
                        null && (
                        <span
                          style={{
                            color:
                              "var(--taste-text-muted)",
                            fontSize:
                              "10px",
                          }}
                        >
                          (
                          {
                            relation.relation_year
                          }
                          )
                        </span>
                      )}
                    </div>

                    {relation.note && (
                      <div
                        style={{
                          marginTop: "5px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize: "10px",
                          lineHeight: 1.5,
                        }}
                      >
                        {relation.note}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "24px",
            paddingTop: "18px",
            borderTop:
              "1px solid var(--taste-border)",
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom: "8px",
            }}
          >
            Historie názvů
          </div>

          {history.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: "5px",
                marginBottom: "16px",
              }}
            >
              {history.map(
                (item) => (
                  <BreweryNameHistoryItemClient
                    key={item.id}
                    previousName={
                      item.previous_name
                    }
                    fromYear={
                      item.from_year
                    }
                    changedYear={
                      item.changed_year
                    }
                    updateAction={
                      updateBreweryNameHistory.bind(
                        null,
                        brewery.id,
                        item.id
                      )
                    }
                    deleteAction={
                      deleteBreweryNameHistory.bind(
                        null,
                        brewery.id,
                        item.id
                      )
                    }
                  />
                )
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "92px minmax(0, 1fr)",
                  gap: "10px",
                  color:
                    "var(--taste-text)",
                  fontSize: "13px",
                  fontWeight: 700,
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    color:
                      "var(--taste-amber-bright)",
                    fontVariantNumeric:
                      "tabular-nums",
                  }}
                >
                  {brewery.founded_year ??
                    history[
                      history.length - 1
                    ]?.changed_year ??
                    "?"}
                  –
                </span>

                <span>
                  {brewery.name}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginBottom: "16px",
                color:
                  "var(--taste-text-muted)",
                fontSize: "12px",
              }}
            >
              Zatím není evidována žádná změna názvu.
            </div>
          )}

          <form
            action={addBreweryNameHistory.bind(
              null,
              brewery.id
            )}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "flex-end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: "5px",
                flex: "1 1 240px",
              }}
            >
              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.055em",
                }}
              >
                Historický název
              </span>

              <input
                name="previousName"
                required
                style={{
                  width: "100%",
                  height: "38px",
                  boxSizing: "border-box",
                  padding: "0 11px",
                  border:
                    "1px solid var(--taste-border)",
                  borderRadius: "9px",
                  background:
                    "var(--taste-surface)",
                  color:
                    "var(--taste-text)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: "5px",
                flex: "0 1 125px",
              }}
            >
              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.055em",
                }}
              >
                Od roku
              </span>

              <input
                name="fromYear"
                type="number"
                min="1000"
                max="2100"
                inputMode="numeric"
                style={{
                  width: "100%",
                  height: "38px",
                  boxSizing: "border-box",
                  padding: "0 11px",
                  border:
                    "1px solid var(--taste-border)",
                  borderRadius: "9px",
                  background:
                    "var(--taste-surface)",
                  color:
                    "var(--taste-text)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: "5px",
                flex: "0 1 145px",
              }}
            >
              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.055em",
                }}
              >
                Do roku
              </span>

              <input
                name="changedYear"
                type="number"
                min="1000"
                max="2100"
                inputMode="numeric"
                style={{
                  width: "100%",
                  height: "38px",
                  boxSizing: "border-box",
                  padding: "0 11px",
                  border:
                    "1px solid var(--taste-border)",
                  borderRadius: "9px",
                  background:
                    "var(--taste-surface)",
                  color:
                    "var(--taste-text)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </label>

            <button
              type="submit"
              className="taste-button-secondary"
              style={{
                height: "38px",
                fontSize: "11px",
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              + Přidat historický název
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null;
}) {
  return (
    <div>
      <div
        className="taste-label"
        style={{
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            value != null &&
            value !== ""
              ? "var(--taste-text)"
              : "var(--taste-text-muted)",
          fontSize: "14px",
          lineHeight: 1.45,
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
