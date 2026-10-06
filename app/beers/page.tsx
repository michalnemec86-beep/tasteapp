import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import HomeStatIcon from "@/components/home/HomeStatIcon";
import PageHero from "@/components/ui/PageHero";
import "./beers-concept.css";

import {
  loadBeerCatalogOverview,
  loadBeerCatalogPage,
} from "@/lib/beer-catalog-server";
import {
  getNewCatalogueIds,
} from "@/lib/catalogue-news";
import {
  isAdminView,
} from "@/lib/adminView";
import {
  getNewsRange,
} from "@/lib/navigation-news";
import {
  createClient,
} from "@/lib/supabase/server";

import BeerCatalogClient from "./BeerCatalogClient";

const PAGE_SIZE = 60;

export default async function BeerCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    style?: string;
    hop?: string;
    beer?: string;
    newSince?: string;
    newUntil?: string;
  }>;
}) {
  const params =
    await searchParams;

  function idParam(
    value:
      | string
      | undefined
  ) {
    if (
      value ===
      undefined
    ) {
      return null;
    }

    if (
      !/^[1-9]\d*$/.test(
        value
      ) ||
      !Number.isSafeInteger(
        Number(value)
      )
    ) {
      notFound();
    }

    return Number(value);
  }

  const styleId =
    idParam(
      params.style
    );

  const hopId =
    idParam(
      params.hop
    );

  const beerId =
    idParam(
      params.beer
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
        params.newSince,
        params.newUntil
      );
  } catch {
    notFound();
  }

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
    styleResult,
    hopResult,
  ] =
    await Promise.all([
      styleId
        ? supabase
            .from(
              "beer_styles"
            )
            .select(
              "id, name"
            )
            .eq(
              "id",
              styleId
            )
            .maybeSingle()
        : Promise.resolve(
            null
          ),
      hopId
        ? supabase
            .from("hops")
            .select(
              "id, name"
            )
            .eq(
              "id",
              hopId
            )
            .maybeSingle()
        : Promise.resolve(
            null
          ),
    ]);

  for (
    const result of [
      styleResult,
      hopResult,
    ]
  ) {
    if (
      result?.error
    ) {
      throw new Error(
        result.error.message
      );
    }

    if (
      result &&
      !result.data
    ) {
      notFound();
    }
  }

  const scopeLabel = [
    newsRange
      ? "Nová piva"
      : "",
    styleResult?.data
      ? `Pivní styl: ${styleResult.data.name}`
      : "",
    hopResult?.data
      ? `Chmel: ${hopResult.data.name}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const hasUrlScope =
    Boolean(
      newsRange ||
      styleId ||
      hopId ||
      beerId
    );

  const selectedIds =
    await getNewCatalogueIds(
      supabase,
      "beers",
      user.id,
      newsRange
    );

  const [
    catalogData,
    adminView,
  ] =
    await Promise.all([
      hasUrlScope
        ? loadBeerCatalogPage({
            supabase,
            userId:
              user.id,
            scope: {
              styleId,
              hopId,
              beerId,
            },
            selectedIds,
            filter:
              "all",
            sort:
              "default",
            search: "",
            country: "",
            letter: "",
            offset: 0,
            limit:
              PAGE_SIZE,
          })
        : loadBeerCatalogOverview(
            supabase,
            user.id
          ).then(
            (summary) => ({
              items: [],
              matchedCount:
                0,
              summary,
              facets: {
                letters: [],
                countries:
                  [],
              },
            })
          ),
      isAdminView(
        user.id
      ),
    ]);

  const {
    summary,
  } =
    catalogData;

  return (
    <main
      className="taste-beer-menu-concept"
      style={{
        maxWidth:
          "1500px",
        margin:
          "0 auto",
        padding:
          "34px 24px 80px",
      }}
    >
      <PageHero
        eyebrow="Katalog piv"
        imageUrl="/images/heroes/catalog.jpg"
        visualVariant="catalog"
        title={
          scopeLabel ||
          "Pivní lístek"
        }
        subtitle={
          scopeLabel
            ? "Evidovaná a ochutnaná piva včetně historických verzí."
            : "Všechna piva evidovaná v aplikaci na jednom místě."
        }
        action={
          scopeLabel
            ? (
              <Link
                href="/beers"
                className="taste-button-secondary"
              >
                Všechna piva
              </Link>
            )
            : undefined
        }
        statsScrollable
        stats={[
          {
            icon:
              <HomeStatIcon kind="mug" />,
            value:
              summary.total,
            label:
              "Všech piv",
            accent:
              "#f2b63f",
          },
          {
            icon:
              <HomeStatIcon kind="barrel" />,
            value:
              summary.tasted,
            label:
              "Ochutnaných",
            accent:
              "#e88835",
          },
          {
            icon:
              <HomeStatIcon kind="hop" />,
            value:
              summary.mine,
            label:
              "Moje piva",
            accent:
              "#9cad47",
          },
          ...(scopeLabel
            ? [
                {
                  icon:
                    <HomeStatIcon kind="brewery" />,
                  value:
                    summary.breweries,
                  label:
                    "Pivovarů",
                  accent:
                    "#e88835",
                },
                {
                  icon:
                    <HomeStatIcon kind="globe" />,
                  value:
                    summary.countries,
                  label:
                    "Států",
                  accent:
                    "#9cad47",
                },
              ]
            : []),
        ]}
      />

      <BeerCatalogClient
        key={`${styleId}-${hopId}-${beerId}-${newsRange?.since ?? ""}`}
        initiallyExpanded={
          hasUrlScope
        }
        beers={
          catalogData.items
        }
        catalogCount={
          summary.total
        }
        initialMatchedCount={
          hasUrlScope
            ? catalogData.matchedCount
            : 0
        }
        initialFacets={
          catalogData.facets
        }
        scope={{
          styleId,
          hopId,
          beerId,
          newSince:
            newsRange?.since ??
            null,
          newUntil:
            newsRange?.until ??
            null,
        }}
        adminView={
          adminView
        }
      />
    </main>
  );
}
