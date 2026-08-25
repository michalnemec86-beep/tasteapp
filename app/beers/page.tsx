import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";

// ==================================================
// STRÁNKA KATALOGU
// ==================================================

function singleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function BeersPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  // ==================================================
  // DATA
  // ==================================================

  const {
    data: beers,
    error,
  } =
    await supabase
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
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const allBeers =
    (beers ?? []).map(
      (beer) => ({
        ...beer,

        breweries:
          singleRelation(
            beer.breweries
          ),

        beer_styles:
          singleRelation(
            beer.beer_styles
          ),

        beer_hops:
          (
            beer.beer_hops ??
            []
          ).map(
            (beerHop) => ({
              ...beerHop,

              hops:
                singleRelation(
                  beerHop.hops
                ),
            })
          ),
      })
    );

  // ==================================================
  // SOUHRN
  // ==================================================

  const breweryCount =
    new Set(
      allBeers
        .map(
          (beer) =>
            beer.breweries
              ?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const styleCount =
    new Set(
      allBeers
        .map(
          (beer) =>
            beer.beer_styles
              ?.id
        )
        .filter(
          (id) =>
            id != null
        )
    ).size;

  const countryCount =
    new Set(
      allBeers
        .map(
          (beer) =>
            beer.breweries
              ?.country
              ?.normalize(
                "NFD"
              )
              .replace(
                /[\u0300-\u036f]/g,
                ""
              )
              .toLowerCase()
              .trim()
        )
        .filter(Boolean)
    ).size;

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <main
      style={{
        maxWidth:
          "1250px",

        margin:
          "0 auto",

        padding:
          "34px 24px 80px",
      }}
    >
      {/* ==================================================
          HERO
      ================================================== */}

      <PageHero
        eyebrow="Pivní sbírka"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={
          <>
            Katalog piv
          </>
        }
        subtitle="Společná sbírka všech piv, která se objevila v TasteAppu. Pivovary, styly, chmely a další stopy po každé ochutnávce."
        action={
          <Link
            href="/"
            className="taste-button-secondary"
            style={{
              fontSize: "12px",
              fontWeight: 650,
            }}
          >
            ← Timeline
          </Link>
        }
        stats={[
          {
            icon: (
              <AppIcon
                name="beer"
                size={18}
              />
            ),
            accent: "#f3b43f",
            value: allBeers.length,
            label: "Různých piv",
          },
          {
            icon: (
              <AppIcon
                name="brewery"
                size={18}
              />
            ),
            accent: "#d5a13c",
            value: breweryCount,
            label: "Pivovarů",
          },
          {
            icon: "◐",
            value: styleCount,
            label: "Pivních stylů",
          },
          {
            icon: (
              <AppIcon
                name="globe"
                size={18}
              />
            ),
            accent: "#d37f43",
            value: countryCount,
            label: "Států",
          },
        ]}
      />

      {/* ==================================================
          SEZNAM
      ================================================== */}

      <section>
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-end",

            gap:
              "16px",

            marginBottom:
              "15px",
          }}
        >
          <div>
            <div
              className="taste-label"
              style={{
                marginBottom:
                  "5px",
              }}
            >
              Všechna piva
            </div>

            <h2
              style={{
                margin: 0,

                fontSize:
                  "24px",

                lineHeight:
                  1.1,

                fontWeight:
                  750,

                letterSpacing:
                  "-0.025em",
              }}
            >
              Ochutnaná piva
            </h2>
          </div>

          <div
            style={{
              color:
                "var(--taste-text-muted)",

              fontSize:
                "11px",
            }}
          >
            {
              allBeers.length
            }{" "}
            {allBeers.length ===
            1
              ? "položka"
              : "položek"}
          </div>
        </div>

        {allBeers.length ===
          0 && (
          <div
            className="taste-card"
            style={{
              padding:
                "34px",

              textAlign:
                "center",

              color:
                "var(--taste-text-muted)",

              fontSize:
                "13px",
            }}
          >
            V katalogu zatím není
            žádné ochutnané pivo.
          </div>
        )}

        <div
          style={{
            display:
              "grid",

            gap:
              "13px",
          }}
        >
          {allBeers.map(
            (beer) => {
              const tastingRecords =
                beer.tastings ??
                [];

              const totalDrunk =
                tastingRecords.reduce(
                  (
                    sum,
                    tasting
                  ) =>
                    sum +
                    (
                      tasting.quantity ??
                      1
                    ),
                  0
                );

              const lastTastedOn =
                tastingRecords
                  .map(
                    (tasting) =>
                      tasting.tasted_on
                  )
                  .filter(
                    (
                      date
                    ): date is string =>
                      Boolean(
                        date
                      )
                  )
                  .sort()
                  .at(-1);

              const hopNames =
                beer.beer_hops
                  ?.map(
                    (beerHop) =>
                      beerHop.hops
                        ?.name
                  )
                  .filter(
                    (
                      name
                    ): name is string =>
                      Boolean(
                        name
                      )
                  )
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      a.localeCompare(
                        b,
                        "cs"
                      )
                  ) ?? [];

              return (
                <article
                  key={
                    beer.id
                  }
                  style={{
                    position:
                      "relative",

                    overflow:
                      "hidden",

                    padding:
                      "20px",

                    border:
                      "1px solid var(--taste-border)",

                    borderRadius:
                      "var(--taste-radius-lg)",

                    background: `
                      linear-gradient(
                        145deg,
                        rgba(231,166,47,0.025),
                        transparent 42%
                      ),
                      var(--taste-surface)
                    `,

                    boxShadow:
                      "var(--taste-shadow-soft)",
                  }}
                >
                  {/* JANTAROVÝ DETAIL */}

                  <div
                    style={{
                      position:
                        "absolute",

                      left:
                        0,

                      top:
                        "18px",

                      bottom:
                        "18px",

                      width:
                        "2px",

                      borderRadius:
                        "999px",

                      background:
                        "linear-gradient(180deg, var(--taste-amber), rgba(231,166,47,0.05))",
                    }}
                  />

                  {/* ==================================================
                      HLAVIČKA PIVA
                  ================================================== */}

                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      alignItems:
                        "flex-start",

                      gap:
                        "20px",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          0,
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            0,

                          color:
                            "var(--taste-text)",

                          fontSize:
                            "21px",

                          lineHeight:
                            1.15,

                          fontWeight:
                            800,

                          letterSpacing:
                            "-0.025em",
                        }}
                      >
                        {
                          beer.name
                        }
                      </h3>

                      <div
                        style={{
                          marginTop:
                            "5px",

                          color:
                            "var(--taste-text-muted)",

                          fontSize:
                            "12px",

                          lineHeight:
                            1.45,
                        }}
                      >
                        {beer.breweries ? (
                          <Link
                            href={`/breweries/${beer.breweries.id}`}
                            style={{
                              color: "inherit",
                              textDecoration:
                                "none",
                              borderBottom:
                                "1px solid rgba(231,166,47,0.28)",
                            }}
                          >
                            {beer.breweries.name}
                          </Link>
                        ) : (
                          "Neznámý pivovar"
                        )}

                        {beer
                          .breweries
                          ?.country
                          ? ` · ${beer.breweries.country}`
                          : ""}

                        {beer
                          .beer_styles
                          ?.name
                          ? ` · ${beer.beer_styles.name}`
                          : ""}
                      </div>
                    </div>

                    {/* CELKEM VYPITO */}

                    <div
                      style={{
                        flexShrink:
                          0,

                        padding:
                          "7px 10px",

                        border:
                          "1px solid rgba(231,166,47,0.25)",

                        borderRadius:
                          "10px",

                        background:
                          "rgba(231,166,47,0.055)",

                        textAlign:
                          "right",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "var(--taste-amber-bright)",

                          fontSize:
                            "16px",

                          lineHeight:
                            1,

                          fontWeight:
                            800,
                        }}
                      >
                        {
                          totalDrunk
                        }
                        ×
                      </div>

                      <div
                        style={{
                          marginTop:
                            "3px",

                          color:
                            "var(--taste-text-muted)",

                          fontSize:
                            "9px",

                          textTransform:
                            "uppercase",

                          letterSpacing:
                            "0.06em",
                        }}
                      >
                        vypito
                      </div>
                    </div>
                  </div>

                  {/* ==================================================
                      PARAMETRY
                  ================================================== */}

                  {(beer.plato !==
                    null ||
                    beer.abv !==
                      null ||
                    beer.ibu !==
                      null) && (
                    <div
                      style={{
                        display:
                          "flex",

                        flexWrap:
                          "wrap",

                        gap:
                          "7px",

                        marginTop:
                          "13px",
                      }}
                    >
                      {beer.plato !==
                        null && (
                        <ParameterBadge>
                          {
                            beer.plato
                          }{" "}
                          °P
                        </ParameterBadge>
                      )}

                      {beer.abv !==
                        null && (
                        <ParameterBadge>
                          {
                            beer.abv
                          }{" "}
                          %
                        </ParameterBadge>
                      )}

                      {beer.ibu !==
                        null && (
                        <ParameterBadge>
                          IBU{" "}
                          {
                            beer.ibu
                          }
                        </ParameterBadge>
                      )}
                    </div>
                  )}

                  {/* ==================================================
                      CHMELY
                  ================================================== */}

                  {hopNames.length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          "12px",

                        color:
                          "var(--taste-text-soft)",

                        fontSize:
                          "12px",

                        lineHeight:
                          1.5,
                      }}
                    >
                      <span
                        style={{
                          color:
                            "var(--taste-text-muted)",
                        }}
                      >
                        Chmely:{" "}
                      </span>

                      {hopNames.join(
                        ", "
                      )}
                    </div>
                  )}

                  {/* ==================================================
                      SPODNÍ ŘÁDEK
                  ================================================== */}

                  <div
                    style={{
                      display:
                        "flex",

                      flexWrap:
                        "wrap",

                      gap:
                        "7px 20px",

                      marginTop:
                        "15px",

                      paddingTop:
                        "12px",

                      borderTop:
                        "1px solid rgba(231,166,47,0.09)",

                      color:
                        "var(--taste-text-muted)",

                      fontSize:
                        "10px",
                    }}
                  >
                    <div>
                      Celkem{" "}
                      <strong
                        style={{
                          color:
                            "var(--taste-text-soft)",
                        }}
                      >
                        {
                          totalDrunk
                        }
                      </strong>{" "}
                      vypito
                    </div>

                    <div>
                      {
                        tastingRecords.length
                      }{" "}
                      {tastingRecords.length ===
                      1
                        ? "záznam"
                        : "záznamů"}
                    </div>

                    {lastTastedOn && (
                      <div>
                        Naposledy{" "}
                        {formatTastingDate(
                          lastTastedOn
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}

// ==================================================
// SOUHRNNÁ KARTA
// ==================================================

function SummaryCard({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding:
          "16px 18px",

        border:
          accent
            ? "1px solid rgba(231,166,47,0.34)"
            : "1px solid var(--taste-border)",

        borderRadius:
          "var(--taste-radius-md)",

        background:
          accent
            ? `
              linear-gradient(
                145deg,
                rgba(231,166,47,0.10),
                rgba(231,166,47,0.02)
              ),
              var(--taste-surface)
            `
            : "var(--taste-surface)",

        boxShadow:
          "var(--taste-shadow-soft)",
      }}
    >
      <div
        style={{
          color:
            accent
              ? "var(--taste-amber-bright)"
              : "var(--taste-text)",

          fontSize:
            "27px",

          lineHeight: 1,

          fontWeight:
            800,

          letterSpacing:
            "-0.03em",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            "6px",

          color:
            "var(--taste-text-muted)",

          fontSize:
            "11px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ==================================================
// PARAMETR
// ==================================================

function ParameterBadge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        padding:
          "4px 8px",

        borderRadius:
          "999px",

        border:
          "1px solid rgba(231,166,47,0.17)",

        background:
          "rgba(231,166,47,0.045)",

        color:
          "var(--taste-text-soft)",

        fontSize:
          "11px",
      }}
    >
      {children}
    </span>
  );
}

// ==================================================
// DATUM
// ==================================================

function formatTastingDate(
  dateString: string
) {
  const [
    year,
    month,
    day,
  ] =
    dateString.split(
      "-"
    );

  return `${Number(
    day
  )}. ${Number(
    month
  )}. ${year}`;
}