import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import BreweryEditModalClient from "../BreweryEditModalClient";
import {
  addBreweryNameHistory,
  updateBrewery,
} from "../actions";

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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
  ]);

  if (error || !brewery) {
    notFound();
  }

  if (countriesError) {
    throw new Error(
      countriesError.message
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
      (b.changed_year ?? 0) -
      (a.changed_year ?? 0)
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
              brewery.founded_year
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
              alignItems: "baseline",
              justifyContent:
                "space-between",
              gap: "14px",
              marginBottom: "12px",
            }}
          >
            <div
              className="taste-label"
            >
              Zaznamenaná piva
            </div>

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
                  <div
                    key={item.id}
                    style={{
                      color:
                        "var(--taste-text-soft)",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.changed_year
                      ? `${item.changed_year}: `
                      : ""}
                    {item.previous_name}
                  </div>
                )
              )}
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
                Předchozí název
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
                Rok změny
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
