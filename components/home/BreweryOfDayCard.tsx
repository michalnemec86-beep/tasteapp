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
  const parts = new Intl.DateTimeFormat(
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

export default async function BreweryOfDayCard({
  brewery,
}: BreweryOfDayCardProps) {
  if (!brewery) {
    return null;
  }

  let displayedBrewery = brewery;

  if (brewery.country !== "Česko") {
    const supabase = await createClient();
    const todayKey = getPragueDateKey();

    const {
      data: persistedDay,
      error: persistedDayError,
    } = await supabase
      .from("brewery_of_day")
      .select("brewery_id")
      .eq("day", todayKey)
      .maybeSingle();

    if (persistedDayError) {
      throw new Error(
        persistedDayError.message
      );
    }

    if (persistedDay?.brewery_id) {
      const {
        data: persistedBrewery,
        error: persistedBreweryError,
      } = await supabase
        .from("breweries")
        .select("id, name, country")
        .eq("id", persistedDay.brewery_id)
        .maybeSingle();

      if (persistedBreweryError) {
        throw new Error(
          persistedBreweryError.message
        );
      }

      if (
        persistedBrewery?.country ===
        "Česko"
      ) {
        displayedBrewery =
          persistedBrewery as Brewery;
      }
    }
  }

  if (displayedBrewery.country !== "Česko") {
    return null;
  }

  return (
    <Link
      href={`/breweries/${displayedBrewery.id}`}
      className="taste-brewery-of-day"
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

    </Link>
  );
}
