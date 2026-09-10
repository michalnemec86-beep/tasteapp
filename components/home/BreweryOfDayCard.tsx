import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Brewery = {
  id: number;
  name: string;
  country: string | null;
};

type BreweryOfDayCardProps = {
  brewery: Brewery | null;
};

function getPragueDateKey(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Europe/Prague",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;
  const month = parts.find(
    (part) => part.type === "month"
  )?.value;
  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "Nepodařilo se určit dnešní datum."
    );
  }

  return `${year}-${month}-${day}`;
}

function getDailyIndex(
  key: string,
  length: number
) {
  let hash = 0;

  for (const character of key) {
    hash =
      Math.imul(hash, 31) +
      character.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash) % length;
}

export default async function BreweryOfDayCard({
  brewery,
}: BreweryOfDayCardProps) {
  if (!brewery) {
    return null;
  }

  let displayedBrewery = brewery;

  if (brewery.country !== "Česko") {
    const supabase = await createClient();

    const [
      { data: czechBreweries, error: breweriesError },
      { data: history, error: historyError },
    ] = await Promise.all([
      supabase
        .from("breweries")
        .select("id, name, country")
        .eq("country", "Česko")
        .order("name"),
      supabase
        .from("brewery_of_day")
        .select("day, brewery_id")
        .order("day", { ascending: false }),
    ]);

    if (breweriesError) {
      throw new Error(
        breweriesError.message
      );
    }

    if (historyError) {
      throw new Error(
        historyError.message
      );
    }

    const allCzechBreweries =
      (czechBreweries ?? []) as Brewery[];

    if (allCzechBreweries.length > 0) {
      const usedBreweryIds = new Set(
        (history ?? []).map(
          (row) => row.brewery_id
        )
      );

      let candidates =
        allCzechBreweries.filter(
          (candidate) =>
            !usedBreweryIds.has(
              candidate.id
            )
        );

      if (candidates.length === 0) {
        candidates = allCzechBreweries;
      }

      const todayKey =
        getPragueDateKey();
      const selected =
        candidates[
          getDailyIndex(
            todayKey,
            candidates.length
          )
        ];

      displayedBrewery = selected;

      // Homepage may already have stored a foreign brewery
      // for today. Correct that history row when permitted;
      // the displayed card remains Czech even if RLS blocks it.
      await supabase
        .from("brewery_of_day")
        .update({
          brewery_id: selected.id,
        })
        .eq("day", todayKey);
    }
  }

  return (
    <Link
      href={`/breweries/${displayedBrewery.id}`}
      style={{
        width: "100%",
        display: "block",
        padding: "13px 14px",
        border:
          "1px solid rgba(243,180,63,0.42)",
        borderRadius: "13px",
        color: "var(--taste-text)",
        textDecoration: "none",
        background:
          "linear-gradient(145deg, rgba(68,40,16,0.94), rgba(30,19,11,0.96))",
        boxShadow:
          "0 10px 28px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,226,168,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "8px",
          marginBottom: "5px",
        }}
      >
        <span
          style={{
            color: "#f3b43f",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
          }}
        >
          🍺 Pivovar dne
        </span>

        <span
          style={{
            color:
              "var(--taste-text-muted)",
            fontSize: "11px",
          }}
        >
          →
        </span>
      </div>

      <div
        style={{
          fontSize: "16px",
          lineHeight: 1.15,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {displayedBrewery.name}
      </div>

      {displayedBrewery.country && (
        <div
          style={{
            marginTop: "5px",
            color:
              "var(--taste-text-soft)",
            fontSize: "11px",
          }}
        >
          {displayedBrewery.country}
        </div>
      )}
    </Link>
  );
}
