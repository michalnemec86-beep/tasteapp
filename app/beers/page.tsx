import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";

type BeersPageProps = {
  searchParams: Promise<{
    beer?: string | string[];
    brewery?: string | string[];
    country?: string | string[];
    style?: string | string[];
    hop?: string | string[];
    focus?: string | string[];
  }>;
};

function singleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getStringParam(
  value: string | string[] | undefined
) {
  return typeof value === "string"
    ? value
    : undefined;
}

function parseId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : undefined;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default async function BeersPage({
  searchParams,
}: BeersPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;

  const selectedBeerId = parseId(
    getStringParam(params.beer)
  );
  const selectedBreweryId = parseId(
    getStringParam(params.brewery)
  );
  const selectedStyleId = parseId(
    getStringParam(params.style)
  );
  const selectedHopId = parseId(
    getStringParam(params.hop)
  );
  const selectedCountry =
    getStringParam(params.country)?.trim() || undefined;
  const requestedFocus =
    getStringParam(params.focus) === "1";

  const { data: beers, error } = await supabase
    .from("beers")
    .select(`
      id,
      name,
      plato,
      abv,
      ibu,
      breweries (
        id,
        name,
        country
      ),
      beer_styles (
        id,
        name
      ),
      beer_hops (
        hops (
          id,
          name
        )
      ),
      tastings (
        id,
        tasted_on,
        quantity
      )
    `)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const catalogBeers = (beers ?? [])
    .filter(
      (beer) =>
        (beer.tastings ?? []).length > 0
    )
    .map((beer) => ({
      ...beer,
      breweries: singleRelation(
        beer.breweries
      ),
      beer_styles: singleRelation(
        beer.beer_styles
      ),
      beer_hops: (beer.beer_hops ?? []).map(
        (beerHop) => ({
          ...beerHop,
          hops: singleRelation(
            beerHop.hops
          ),
        })
      ),
    }));

  const countryOptions = Array.from(
    new Set(
      catalogBeers
        .map((beer) => beer.breweries?.country)
        .filter(
          (country): country is string =>
            Boolean(country)
        )
    )
  ).sort((a, b) =>
    a.localeCompare(b, "cs", {
      sensitivity: "base",
    })
  );

  const breweryOptions = Array.from(
    new Map(
      catalogBeers
        .filter((beer) => beer.breweries)
        .map((beer) => [
          beer.breweries!.id,
          beer.breweries!,
        ])
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name, "cs", {
      sensitivity: "base",
    })
  );

  const styleOptions = Array.from(
    new Map(
      catalogBeers
        .filter((beer) => beer.beer_styles)
        .map((beer) => [
          beer.beer_styles!.id,
          beer.beer_styles!,
        ])
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name, "cs", {
      sensitivity: "base",
    })
  );

  const hopOptions = Array.from(
    new Map(
      catalogBeers.flatMap((beer) =>
        beer.beer_hops
          .filter((beerHop) => beerHop.hops)
          .map((beerHop) => [
            beerHop.hops!.id,
            beerHop.hops!,
          ] as const)
      )
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name, "cs", {
      sensitivity: "base",
    })
  );

  const selectedBeerName = selectedBeerId
    ? catalogBeers.find(
        (beer) => beer.id === selectedBeerId
      )?.name
    : undefined;

  const selectedBreweryName = selectedBreweryId
    ? breweryOptions.find(
        (brewery) => brewery.id === selectedBreweryId
      )?.name
    : undefined;

  const selectedStyleName = selectedStyleId
    ? styleOptions.find(
        (style) => style.id === selectedStyleId
      )?.name
    : undefined;

  const selectedHopName = selectedHopId
    ? hopOptions.find(
        (hop) => hop.id === selectedHopId
      )?.name
    : undefined;

  const filteredBeers = catalogBeers.filter(
    (beer) => {
      if (
        selectedBeerId &&
        beer.id !== selectedBeerId
      ) {
        return false;
      }

      if (
        selectedBreweryId &&
        beer.breweries?.id !== selectedBreweryId
      ) {
        return false;
      }

      if (
        selectedCountry &&
        normalizeText(beer.breweries?.country) !==
          normalizeText(selectedCountry)
      ) {
        return false;
      }

      if (
        selectedStyleId &&
        beer.beer_styles?.id !== selectedStyleId
      ) {
        return false;
      }

      if (
        selectedHopId &&
        !beer.beer_hops.some(
          (beerHop) =>
            beerHop.hops?.id === selectedHopId
        )
      ) {
        return false;
      }

      return true;
    }
  );

  const breweryCount = new Set(
    filteredBeers
      .map((beer) => beer.breweries?.id)
      .filter((id) => id != null)
  ).size;

  const styleCount = new Set(
    filteredBeers
      .map((beer) => beer.beer_styles?.id)
      .filter((id) => id != null)
  ).size;

  const countryCount = new Set(
    filteredBeers
      .map((beer) =>
        normalizeText(beer.breweries?.country)
      )
      .filter(Boolean)
  ).size;

  const activeFilterLabels = [
    selectedBeerName,
    selectedCountry,
    selectedBreweryName,
    selectedStyleName,
    selectedHopName,
  ].filter(Boolean) as string[];

  const isFocusedDrilldown =
    requestedFocus && activeFilterLabels.length > 0;

  const focusTitle = selectedBeerName
    ? selectedBeerName
    : selectedCountry
      ? `Piva podle země: ${selectedCountry}`
      : selectedStyleName
        ? `Piva stylu ${selectedStyleName}`
        : selectedHopName
          ? `Piva s chmelem ${selectedHopName}`
          : selectedBreweryName
            ? `Piva pivovaru ${selectedBreweryName}`
            : "Vybraná piva";

  const focusEyebrow = selectedBeerName
    ? "Konkrétní pivo"
    : selectedCountry
      ? "Země původu"
      : selectedStyleName
        ? "Pivní styl"
        : selectedHopName
          ? "Použitý chmel"
          : selectedBreweryName
            ? "Pivovar"
            : "Tematický výběr";

  const editableParams = new URLSearchParams();

  if (selectedBeerId) {
    editableParams.set("beer", String(selectedBeerId));
  }
  if (selectedBreweryId) {
    editableParams.set("brewery", String(selectedBreweryId));
  }
  if (selectedCountry) {
    editableParams.set("country", selectedCountry);
  }
  if (selectedStyleId) {
    editableParams.set("style", String(selectedStyleId));
  }
  if (selectedHopId) {
    editableParams.set("hop", String(selectedHopId));
  }

  const editableFilterHref = editableParams.toString()
    ? `/beers?${editableParams.toString()}`
    : "/beers";

  return (
    <main
      style={{
        maxWidth: "1250px",
        margin: "0 auto",
        padding: "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow={
          isFocusedDrilldown
            ? focusEyebrow
            : "Pivní sbírka"
        }
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={
          isFocusedDrilldown
            ? focusTitle
            : "Katalog piv"
        }
        subtitle={
          isFocusedDrilldown
            ? "Čistý přehled piv odpovídajících vybrané statistice."
            : "Společná sbírka ověřených ochutnaných piv. Pivovary, styly, chmely a další stopy po každé ochutnávce."
        }
        action={
          isFocusedDrilldown ? (
            <Link
              href="/beers"
              className="taste-button-secondary"
              style={{
                fontSize: "12px",
                fontWeight: 650,
              }}
            >
              Celý katalog
            </Link>
          ) : (
            <Link
              href="/breweries"
              className="taste-button-secondary"
              style={{
                fontSize: "12px",
                fontWeight: 650,
              }}
            >
              ← Pivovary
            </Link>
          )
        }
        stats={[
          {
            icon: <AppIcon name="beer" size={18} />,
            accent: "#f2b63f",
            value: filteredBeers.length,
            label: "Různých piv",
          },
          {
            icon: <AppIcon name="brewery" size={18} />,
            accent: "#e88835",
            value: breweryCount,
            label: "Pivovarů",
          },
          {
            icon: "◐",
            accent: "#9cad47",
            value: styleCount,
            label: "Pivních stylů",
          },
          {
            icon: <AppIcon name="globe" size={18} />,
            accent: "#d65b42",
            value: countryCount,
            label: "Států",
          },
        ]}
      />

      {isFocusedDrilldown ? (
        <section
          className="taste-card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "24px",
            padding: "13px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              flexWrap: "wrap",
            }}
          >
            <span
              className="taste-label"
              style={{ margin: 0 }}
            >
              Aktivní výběr
            </span>
            <span
              style={{
                padding: "5px 9px",
                border:
                  "1px solid rgba(231,166,47,0.20)",
                borderRadius: "999px",
                background:
                  "rgba(231,166,47,0.055)",
                color: "var(--taste-text-soft)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {activeFilterLabels.join(" · ")}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "13px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={editableFilterHref}
              style={{
                color: "var(--taste-amber-bright)",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              Změnit filtr
            </Link>
            <Link
              href="/beers"
              style={{
                color: "var(--taste-text-muted)",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: 650,
              }}
            >
              Všechna piva
            </Link>
          </div>
        </section>
      ) : (
        <section
          className="taste-card"
          style={{
            marginBottom: "24px",
            padding: "18px",
          }}
        >
          <form
            action="/beers"
            method="get"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <FilterSelect
              label="Stát"
              name="country"
              defaultValue={selectedCountry ?? ""}
            >
              <option value="">Všechny státy</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Pivovar"
              name="brewery"
              defaultValue={
                selectedBreweryId
                  ? String(selectedBreweryId)
                  : ""
              }
            >
              <option value="">Všechny pivovary</option>
              {breweryOptions.map((brewery) => (
                <option
                  key={brewery.id}
                  value={brewery.id}
                >
                  {brewery.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Styl"
              name="style"
              defaultValue={
                selectedStyleId
                  ? String(selectedStyleId)
                  : ""
              }
            >
              <option value="">Všechny styly</option>
              {styleOptions.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Chmel"
              name="hop"
              defaultValue={
                selectedHopId
                  ? String(selectedHopId)
                  : ""
              }
            >
              <option value="">Všechny chmely</option>
              {hopOptions.map((hop) => (
                <option key={hop.id} value={hop.id}>
                  {hop.name}
                </option>
              ))}
            </FilterSelect>

            <button
              type="submit"
              className="taste-button-primary"
              style={{
                minHeight: "42px",
                cursor: "pointer",
              }}
            >
              Filtrovat
            </button>
          </form>

          {activeFilterLabels.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "14px",
                paddingTop: "13px",
                borderTop:
                  "1px solid rgba(231,166,47,0.10)",
                color: "var(--taste-text-muted)",
                fontSize: "11px",
              }}
            >
              <span>
                Aktivní filtr: {activeFilterLabels.join(" · ")}
              </span>

              <Link
                href="/beers"
                style={{
                  color: "var(--taste-amber-bright)",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Zrušit filtr
              </Link>
            </div>
          )}
        </section>
      )}

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
            marginBottom: "15px",
          }}
        >
          <div>
            <div
              className="taste-label"
              style={{ marginBottom: "5px" }}
            >
              {isFocusedDrilldown
                ? "Tematický výběr"
                : "Výběr katalogu"}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                lineHeight: 1.1,
                fontWeight: 750,
                letterSpacing: "-0.025em",
              }}
            >
              Ochutnaná piva
            </h2>
          </div>

          <div
            style={{
              color: "var(--taste-text-muted)",
              fontSize: "11px",
            }}
          >
            {filteredBeers.length}{" "}
            {filteredBeers.length === 1
              ? "položka"
              : "položek"}
          </div>
        </div>

        {filteredBeers.length === 0 ? (
          <div
            className="taste-card"
            style={{
              padding: "34px",
              textAlign: "center",
              color: "var(--taste-text-muted)",
              fontSize: "13px",
            }}
          >
            Pro tento filtr nejsou v katalogu žádná ochutnaná piva.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "13px",
            }}
          >
            {filteredBeers.map((beer) => {
              const tastingRecords =
                beer.tastings ?? [];

              const totalDrunk = tastingRecords.reduce(
                (sum, tasting) =>
                  sum + (tasting.quantity ?? 1),
                0
              );

              const lastTastedOn = tastingRecords
                .map((tasting) => tasting.tasted_on)
                .filter(
                  (date): date is string =>
                    Boolean(date)
                )
                .sort()
                .at(-1);

              const hopNames = beer.beer_hops
                .map((beerHop) => beerHop.hops)
                .filter(
                  (hop): hop is NonNullable<typeof hop> =>
                    Boolean(hop)
                )
                .sort((a, b) =>
                  a.name.localeCompare(b.name, "cs")
                );

              return (
                <article
                  key={beer.id}
                  className="taste-card"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "18px",
                      bottom: "18px",
                      width: "2px",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(180deg, var(--taste-amber), rgba(231,166,47,0.05))",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "20px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          color: "var(--taste-text)",
                          fontSize: "21px",
                          lineHeight: 1.15,
                          fontWeight: 800,
                          letterSpacing: "-0.025em",
                        }}
                      >
                        {beer.name}
                      </h3>

                      <div
                        style={{
                          marginTop: "6px",
                          color: "var(--taste-text-muted)",
                          fontSize: "12px",
                          lineHeight: 1.55,
                        }}
                      >
                        {beer.breweries ? (
                          <Link
                            href={`/breweries/${beer.breweries.id}`}
                            style={inlineLinkStyle}
                          >
                            {beer.breweries.name}
                          </Link>
                        ) : (
                          "Neznámý pivovar"
                        )}

                        {beer.breweries?.country && (
                          <>
                            {" · "}
                            <Link
                              href={`/beers?country=${encodeURIComponent(
                                beer.breweries.country
                              )}`}
                              style={inlineLinkStyle}
                            >
                              {beer.breweries.country}
                            </Link>
                          </>
                        )}

                        {beer.beer_styles && (
                          <>
                            {" · "}
                            <Link
                              href={`/beers?style=${beer.beer_styles.id}`}
                              style={inlineLinkStyle}
                            >
                              {beer.beer_styles.name}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        padding: "7px 10px",
                        border:
                          "1px solid rgba(231,166,47,0.25)",
                        borderRadius: "10px",
                        background:
                          "rgba(231,166,47,0.055)",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--taste-amber-bright)",
                          fontSize: "17px",
                          fontWeight: 800,
                        }}
                      >
                        {totalDrunk}×
                      </div>
                      <div
                        style={{
                          marginTop: "2px",
                          color: "var(--taste-text-muted)",
                          fontSize: "9px",
                        }}
                      >
                        vypito
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "16px",
                    }}
                  >
                    {beer.plato != null && (
                      <MetaPill label="Stupňovitost">
                        {formatNumber(beer.plato)}°
                      </MetaPill>
                    )}
                    {beer.abv != null && (
                      <MetaPill label="ABV">
                        {formatNumber(beer.abv)} %
                      </MetaPill>
                    )}
                    {beer.ibu != null && (
                      <MetaPill label="IBU">
                        {formatNumber(beer.ibu)}
                      </MetaPill>
                    )}
                    {lastTastedOn && (
                      <MetaPill label="Naposledy">
                        {formatDate(lastTastedOn)}
                      </MetaPill>
                    )}
                  </div>

                  {hopNames.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        flexWrap: "wrap",
                        marginTop: "14px",
                        color: "var(--taste-text-muted)",
                        fontSize: "10px",
                      }}
                    >
                      <span>Chmely:</span>
                      {hopNames.map((hop) => (
                        <Link
                          key={hop.id}
                          href={`/beers?hop=${hop.id}`}
                          style={inlineLinkStyle}
                        >
                          {hop.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const inlineLinkStyle = {
  color: "inherit",
  textDecoration: "none",
  borderBottom:
    "1px solid rgba(231,166,47,0.28)",
} as const;

function FilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "6px",
      }}
    >
      <span
        className="taste-label"
        style={{ fontSize: "9px" }}
      >
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        style={{
          minHeight: "42px",
          width: "100%",
          border: "1px solid var(--taste-border)",
          borderRadius: "10px",
          background: "var(--taste-surface)",
          color: "var(--taste-text)",
          padding: "0 11px",
          fontSize: "12px",
        }}
      >
        {children}
      </select>
    </label>
  );
}

function MetaPill({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "7px 9px",
        border:
          "1px solid rgba(231,166,47,0.12)",
        borderRadius: "9px",
        background:
          "rgba(231,166,47,0.025)",
      }}
    >
      <span
        style={{
          marginRight: "5px",
          color: "var(--taste-text-muted)",
          fontSize: "9px",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          color: "var(--taste-text-soft)",
          fontSize: "11px",
        }}
      >
        {children}
      </strong>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${Number(day)}. ${Number(month)}. ${year}`;
}
