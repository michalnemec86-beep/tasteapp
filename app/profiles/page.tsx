import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildProfileStats,
} from "@/lib/profileStats";

import { fetchAllRows } from "@/lib/fetch-all-rows";

import PageHero from "@/components/ui/PageHero";
import HomeStatIcon from "@/components/home/HomeStatIcon";
import "./regulars-concept.css";

type ProfileRow = {
  id: string;
  display_name: string;
  real_name: string | null;
  avatar_url: string | null;
};

type Relation<T> = T | T[] | null;

type BreweryRef = {
  id: number;
  country: string | null;
};

type StyleRef = { id: number };
type BrandRef = { id: number };
type HopRow = { hops: Relation<{ id: number }> };

type RawTastingRow = {
  user_id: string;
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  beer_versions: Relation<{
    breweries: Relation<BreweryRef>;
    beer_styles: Relation<StyleRef>;
    beer_version_hops: HopRow[] | null;
  }>;
  beers: Relation<{
    id: number;
    name: string;
    is_non_alcoholic: boolean;
    brands: Relation<BrandRef>;
    breweries: Relation<BreweryRef>;
    beer_styles: Relation<StyleRef>;
    beer_hops: HopRow[] | null;
  }>;
};

type NormalizedHopRow = { hops: { id: number } | null };

type NormalizedTasting = {
  quantity: number | null;
  tasted_on: string | null;
  tasted_at: string | null;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  beer_versions: {
    breweries: BreweryRef | null;
    beer_styles: StyleRef | null;
    beer_version_hops: NormalizedHopRow[] | null;
  } | null;
  beers: {
    id: number;
    name: string;
    is_non_alcoholic: boolean;
    brands: BrandRef | null;
    breweries: BreweryRef | null;
    beer_styles: StyleRef | null;
    beer_hops: NormalizedHopRow[] | null;
  } | null;
};

function singleRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function normalizeHopRows(rows: HopRow[] | null): NormalizedHopRow[] {
  return (rows ?? []).map((row) => ({
    hops: singleRelation(row.hops),
  }));
}

function normalizeTasting(tasting: RawTastingRow): NormalizedTasting {
  const beer = singleRelation(tasting.beers);
  const version = singleRelation(tasting.beer_versions);

  return {
    quantity: tasting.quantity,
    tasted_on: tasting.tasted_on,
    tasted_at: tasting.tasted_at,
    plato: tasting.plato,
    abv: tasting.abv,
    ibu: tasting.ibu,
    beer_versions: version
      ? {
          breweries: singleRelation(version.breweries),
          beer_styles: singleRelation(version.beer_styles),
          beer_version_hops: normalizeHopRows(version.beer_version_hops),
        }
      : null,
    beers: beer
      ? {
          id: beer.id,
          name: beer.name,
          is_non_alcoholic: beer.is_non_alcoholic,
          brands: singleRelation(beer.brands),
          breweries: singleRelation(beer.breweries),
          beer_styles: singleRelation(beer.beer_styles),
          beer_hops: normalizeHopRows(beer.beer_hops),
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

  const profilesResult =
    await supabase
      .from("profiles")
      .select(
        "id, display_name, real_name, avatar_url"
      )
      .order(
        "display_name"
      );

  if (profilesResult.error) {
    throw new Error(
      profilesResult.error.message
    );
  }

  const profiles =
    (
      profilesResult.data ??
      []
    ) as ProfileRow[];

  const rawTastings = await fetchAllRows((from, to) => supabase
        .from("tastings")
        .select(`
          user_id,
          quantity,
          tasted_on,
          tasted_at,
          plato,
          abv,
          ibu,
          beer_versions (
            breweries!beer_versions_brewery_id_fkey (
              id,
              country
            ),
            beer_styles (
              id
            ),
            beer_version_hops (
              hops (
                id
              )
            )
          ),
          beers (
            id,
            name,
            is_non_alcoholic,
            brands (
              id
            ),
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
        `)
        .order("id", {
          ascending: true,
        })
        .range(from, to), 1000) as unknown as RawTastingRow[];

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

  return (
    <main className="taste-regulars-concept">
      <PageHero
        eyebrow="Hospoda"
        imageUrl="/images/heroes/users.jpg"
        visualVariant="profile"
        title="Štamgasti"
        subtitle=""
      />

      <section className="taste-regulars-section" aria-labelledby="regulars-title">
        <div className="taste-regulars-section-header">
          <div>
            <h2 id="regulars-title">Pivní vizitky</h2>
            <p>Rychlý pohled na pivní stopu každého uživatele.</p>
          </div>
          <Link href="/activity" className="taste-regulars-activity">
            Aktivita v hospodě →
          </Link>
        </div>

        {profileCards.length === 0 && (
          <div className="taste-regulars-empty">
            Zatím tu není žádný uživatelský profil.
          </div>
        )}

        <div className="taste-regulars-grid">
          {profileCards.map(({ profile, stats }) => {
            const isMe = profile.id === user.id;
            const initial = profile.display_name?.trim().charAt(0).toUpperCase() || "•";
            const statItems = [
              { label: "Vypitých", value: stats.totalQuantity, icon: "barrel" },
              { label: "Různých piv", value: stats.uniqueBeers, icon: "mug" },
              { label: "Pivovarů", value: stats.uniqueBreweries, icon: "brewery" },
              { label: "Států", value: stats.uniqueCountries, icon: "globe" },
            ] as const;

            return (
              <Link
                key={profile.id}
                href={`/profiles/${profile.id}`}
                className={`taste-regulars-card${isMe ? " taste-regulars-card-me" : ""}`}
              >
                <div className="taste-regulars-identity">
                  <div
                    className="taste-regulars-avatar"
                    style={profile.avatar_url ? {
                      backgroundImage: `url(${JSON.stringify(profile.avatar_url)})`,
                    } : undefined}
                    aria-hidden="true"
                  >
                    {!profile.avatar_url && initial}
                  </div>
                  <div className="taste-regulars-identity-copy">
                    <div className="taste-regulars-role">
                      {isMe ? "Tvůj profil" : "Pivní cestovatel"}
                    </div>
                    <h3 className="taste-regulars-name">
                      {profile.display_name}
                      {profile.id === "17be5dc3-a3f9-4fd2-ae90-dee7692034fc" && (
                        <span className="taste-regulars-admin" title="Správce Pivníku" aria-label="Správce Pivníku">◆</span>
                      )}
                    </h3>
                    {profile.real_name && (
                      <div className="taste-regulars-real-name">{profile.real_name}</div>
                    )}
                    <div className="taste-regulars-last-tasting">
                      Naposledy {formatDate(stats.lastTasting)}
                    </div>
                  </div>
                </div>

                <dl className="taste-regulars-stats">
                  {statItems.map((item) => (
                    <div key={item.label} className="taste-regulars-stat">
                      <HomeStatIcon kind={item.icon} />
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="taste-regulars-footer">
                  <span>{stats.uniqueStyles} pivních stylů</span>
                  <span className="taste-regulars-open">Zobrazit pivní profil →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
