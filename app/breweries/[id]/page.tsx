import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import PageHero from "@/components/ui/PageHero";
import BreweryEditModalClient from "../BreweryEditModalClient";
import { updateBrewery } from "../actions";

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
        name
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

        {history.length > 0 && (
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
        )}
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
