import Link from "next/link";

type BreweryOfDayCardProps = {
  brewery:
    | {
        id: number;
        name: string;
        country: string | null;
      }
    | null;
};

export default function BreweryOfDayCard({
  brewery,
}: BreweryOfDayCardProps) {
  if (!brewery) {
    return null;
  }

  return (
    <Link
      href={`/breweries/${brewery.id}`}
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
        {brewery.name}
      </div>

      {brewery.country && (
        <div
          style={{
            marginTop: "5px",
            color:
              "var(--taste-text-soft)",
            fontSize: "11px",
          }}
        >
          {brewery.country}
        </div>
      )}
    </Link>
  );
}
