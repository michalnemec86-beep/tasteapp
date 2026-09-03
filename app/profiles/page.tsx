import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildProfileStats,
} from "@/lib/profileStats";

import PageHero from "@/components/ui/PageHero";
import AppIcon from "@/components/ui/AppIcon";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type Relation<T> =
  | T
  | T[]
  | null;

type RawTastingRow = {
  user_id: string;
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  beers: Relation<{
    id: number;
    name: string;
    breweries: Relation<{
      id: number;
      country: string | null;
    }>;
    beer_styles: Relation<{
      id: number;
    }>;
    beer_hops:
      | {
          hops: Relation<{
            id: number;
          }>;
        }[]
      | null;
  }>;
};

type NormalizedTasting = {
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  beers: {
    id: number;
    name: string;
    breweries: {
      id: number;
      country: string | null;
    } | null;
    beer_styles: {
      id: number;
    } | null;
    beer_hops:
      | {
          hops: {
            id: number;
          } | null;
        }[]
      | null;
  } | null;
};

function singleRelation<T>(
  value: Relation<T>
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeTasting(
  tasting: RawTastingRow
): NormalizedTasting {
  const beer =
    singleRelation(
      tasting.beers
    );

  return {
    quantity:
      tasting.quantity,
    tasted_on:
      tasting.tasted_on,
    tasted_at:
      tasting.tasted_at,
    plato:
      tasting.plato,
    abv:
      tasting.abv,
    ibu:
      tasting.ibu,

    beers:
      beer
        ? {
            id: beer.id,
            name: beer.name,

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
                  hops:
                    singleRelation(
                      beerHop.hops
                    ),
                })
              ),
          }
        : null,
  };
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Bez ochutnávek";
  }

  const date =
    new Date(
      `${value}T12:00:00Z`
    );

  return new Intl.DateTimeFormat(
    "cs-CZ",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Prague",
    }
  ).format(date);
}

export default async function ProfilesPage() {
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

  const [
    profilesResult,
    tastingsResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url"
        )
        .order(
          "display_name"
        ),

      supabase
        .from("tastings")
        .select(`
          user_id,
          quantity,
          tasted_on,
          tasted_at,
          plato,
          abv,
          ibu,
          beers (
            id,
            name,
            breweries (
              id,
              country
            ),
            beer_styles (
              id
            ),
            beer_hops (
              hops (
                id
              )
            )
          )
        `),
    ]);

  if (profilesResult.error) {
    throw new Error(
      profilesResult.error.message
    );
  }

  if (tastingsResult.error) {
    throw new Error(
      tastingsResult.error.message
    );
  }

  const profiles =
    (
      profilesResult.data ??
      []
    ) as ProfileRow[];

  const rawTastings =
    (
      tastingsResult.data ??
      []
    ) as unknown as
      RawTastingRow[];

  const tastingsByUser =
    new Map<
      string,
      NormalizedTasting[]
    >();

  for (
    const rawTasting
    of rawTastings
  ) {
    const current =
      tastingsByUser.get(
        rawTasting.user_id
      ) ?? [];

    current.push(
      normalizeTasting(
        rawTasting
      )
    );

    tastingsByUser.set(
      rawTasting.user_id,
      current
    );
  }

  const profileCards =
    profiles.map(
      (profile) => {
        const tastings =
          tastingsByUser.get(
            profile.id
          ) ?? [];

        return {
          profile,

          stats:
            buildProfileStats(
              tastings
            ),
        };
      }
    );

  const activeProfiles =
    profileCards.filter(
      (item) =>
        item.stats.totalQuantity >
        0
    ).length;

  const totalQuantity =
    profileCards.reduce(
      (
        total,
        item
      ) =>
        total +
        item.stats.totalQuantity,
      0
    );

  return (
    <main
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
        padding:
          "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow="Komunita"
        imageUrl="/images/heroes/users.jpg"
        visualVariant="profile"
        title="Uživatelé TasteAppu"
        subtitle="Každý pivní deník vypráví trochu jiný příběh. Prohlédni si objevy, pivovary a pivní cesty jednotlivých uživatelů."
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
            icon: "●",
            accent: "#f2b63f",
            value:
              profiles.length,
            label: "Profilů",
          },
          {
            icon: "◉",
            accent: "#9cad47",
            value:
              activeProfiles,
            label:
              "Aktivních profilů",
          },
          {
            icon: (
              <AppIcon
                name="beer"
                size={18}
              />
            ),
            accent: "#e88835",
            value:
              totalQuantity,
            label:
              "Vypitých piv",
          },
        ]}
      />

      <section
        style={{
          marginTop: "24px",
        }}
      >
        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <div
            className="taste-label"
            style={{
              marginBottom: "5px",
            }}
          >
            Pivní komunita
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              letterSpacing:
                "-0.025em",
            }}
          >
            Pivní vizitky
          </h2>

          <p
            style={{
              maxWidth: "620px",
              margin: "6px 0 0",
              color:
                "var(--taste-text-muted)",
              fontSize: "11px",
              lineHeight: 1.55,
            }}
          >
            Rychlý pohled na
            pivní stopu každého
            uživatele.
          </p>
        </div>

        {profileCards.length ===
          0 && (
          <div
            className="taste-card"
            style={{
              padding: "34px",
              textAlign: "center",
              color:
                "var(--taste-text-muted)",
            }}
          >
            Zatím tu není žádný
            uživatelský profil.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(310px, 1fr))",
            gap: "14px",
          }}
        >
          {profileCards.map(
            ({
              profile,
              stats,
            }) => {
              const isMe =
                profile.id ===
                user.id;

              const initial =
                profile.display_name
                  ?.trim()
                  .charAt(0)
                  .toUpperCase() ||
                "•";

              const statItems = [
                {
                  label:
                    "Vypitých",
                  value:
                    stats.totalQuantity,
                  accent:
                    "#f2b63f",
                },
                {
                  label:
                    "Různých piv",
                  value:
                    stats.uniqueBeers,
                  accent:
                    "#e88835",
                },
                {
                  label:
                    "Pivovarů",
                  value:
                    stats.uniqueBreweries,
                  accent:
                    "#d65b42",
                },
                {
                  label:
                    "Států",
                  value:
                    stats.uniqueCountries,
                  accent:
                    "#b77a36",
                },
              ];

              return (
                <Link
                  key={
                    profile.id
                  }
                  href={`/profiles/${profile.id}`}
                  style={{
                    position:
                      "relative",
                    overflow:
                      "hidden",
                    display:
                      "block",
                    minWidth: 0,
                    padding:
                      "18px",
                    border:
                      isMe
                        ? "1px solid rgba(243,180,63,0.48)"
                        : "1px solid var(--taste-border)",
                    borderRadius:
                      "var(--taste-radius-lg)",
                    color:
                      "inherit",
                    textDecoration:
                      "none",
                    background: `
                      radial-gradient(
                        circle at 100% 0%,
                        ${
                          isMe
                            ? "rgba(243,180,63,0.13)"
                            : "rgba(217,137,69,0.08)"
                        },
                        transparent 13rem
                      ),
                      linear-gradient(
                        145deg,
                        rgba(242,182,63,0.045),
                        transparent 65%
                      ),
                      var(--taste-surface)
                    `,
                    boxShadow:
                      isMe
                        ? "0 13px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,235,195,0.04)"
                        : "inset 0 1px 0 rgba(255,235,195,0.025)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "13px",
                    }}
                  >
                    <div
                      style={{
                        width: "60px",
                        height:
                          "60px",
                        flexShrink:
                          0,
                        overflow:
                          "hidden",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          "1px solid rgba(242,182,63,0.48)",
                        borderRadius:
                          "50%",
                        background:
                          profile.avatar_url
                            ? `url(${JSON.stringify(
                                profile.avatar_url
                              )}) center / cover no-repeat`
                            : `
                                radial-gradient(
                                  circle at 35% 25%,
                                  rgba(242,182,63,0.30),
                                  transparent 55%
                                ),
                                linear-gradient(
                                  145deg,
                                  #713b1d,
                                  #27150c
                                )
                              `,
                        color:
                          "#f2b63f",
                        fontSize:
                          "23px",
                        lineHeight:
                          1,
                        fontWeight:
                          900,
                        boxShadow:
                          "0 0 22px rgba(242,182,63,0.12)",
                      }}
                    >
                      {!profile.avatar_url &&
                        initial}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#f2b63f",
                          fontSize:
                            "8px",
                          fontWeight:
                            900,
                          letterSpacing:
                            "0.095em",
                          textTransform:
                            "uppercase",
                        }}
                      >
                        {isMe
                          ? "Tvůj profil"
                          : "Pivní cestovatel"}
                      </div>

                      <div
                        style={{
                          marginTop:
                            "4px",
                          overflow:
                            "hidden",
                          color:
                            "var(--taste-text)",
                          fontSize:
                            "21px",
                          lineHeight:
                            1.1,
                          fontWeight:
                            900,
                          letterSpacing:
                            "-0.03em",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          profile.display_name
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize:
                            "10px",
                        }}
                      >
                        Naposledy{" "}
                        {formatDate(
                          stats.lastTasting
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(4, minmax(0, 1fr))",
                      gap: "7px",
                      marginTop:
                        "17px",
                    }}
                  >
                    {statItems.map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          style={{
                            minWidth:
                              0,
                            padding:
                              "9px 8px",
                            border:
                              "1px solid rgba(255,255,255,0.055)",
                            borderRadius:
                              "11px",
                            background:
                              "rgba(10,7,5,0.28)",
                          }}
                        >
                          <div
                            style={{
                              width:
                                "18px",
                              height:
                                "2px",
                              marginBottom:
                                "7px",
                              borderRadius:
                                "999px",
                              background:
                                item.accent,
                            }}
                          />

                          <div
                            style={{
                              color:
                                "var(--taste-text)",
                              fontSize:
                                "17px",
                              lineHeight:
                                1,
                              fontWeight:
                                850,
                            }}
                          >
                            {
                              item.value
                            }
                          </div>

                          <div
                            style={{
                              marginTop:
                                "5px",
                              overflow:
                                "hidden",
                              color:
                                "var(--taste-text-muted)",
                              fontSize:
                                "8px",
                              fontWeight:
                                700,
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              item.label
                            }
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      marginTop:
                        "15px",
                      paddingTop:
                        "12px",
                      borderTop:
                        "1px solid rgba(255,255,255,0.055)",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "var(--taste-text-muted)",
                        fontSize:
                          "9px",
                      }}
                    >
                      {
                        stats.uniqueStyles
                      }{" "}
                      pivních stylů
                    </span>

                    <span
                      style={{
                        color:
                          "#f2b63f",
                        fontSize:
                          "10px",
                        fontWeight:
                          800,
                      }}
                    >
                      Zobrazit pivní
                      profil →
                    </span>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}
