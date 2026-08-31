import type {
  ProfileNumericSummary,
} from "@/lib/profileStats";

type ProfileTechnicalCardProps = {
  plato: ProfileNumericSummary;
  abv: ProfileNumericSummary;
  ibu: ProfileNumericSummary;
};

type GaugeTone =
  | "gold"
  | "red"
  | "green";

type GaugeProps = {
  label: string;
  subtitle: string;
  unit: string;
  summary: ProfileNumericSummary;
  maxScale: number;
  decimals: number;
  tone: GaugeTone;
};

const tones = {
  gold: {
    accent: "#f2b63f",
    accentSoft:
      "rgba(242,182,63,0.50)",
    border:
      "rgba(242,182,63,0.42)",
    wash:
      "rgba(242,182,63,0.12)",
    glow:
      "rgba(242,182,63,0.18)",
  },
  red: {
    accent: "#d45b42",
    accentSoft:
      "rgba(212,91,66,0.50)",
    border:
      "rgba(212,91,66,0.43)",
    wash:
      "rgba(212,91,66,0.13)",
    glow:
      "rgba(212,91,66,0.18)",
  },
  green: {
    accent: "#8da348",
    accentSoft:
      "rgba(141,163,72,0.52)",
    border:
      "rgba(141,163,72,0.44)",
    wash:
      "rgba(141,163,72,0.13)",
    glow:
      "rgba(141,163,72,0.18)",
  },
} satisfies Record<
  GaugeTone,
  {
    accent: string;
    accentSoft: string;
    border: string;
    wash: string;
    glow: string;
  }
>;

function formatValue(
  value: number | null,
  decimals: number
) {
  if (value == null) {
    return "—";
  }

  return value.toLocaleString(
    "cs-CZ",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    }
  );
}

function TechnicalGauge({
  label,
  subtitle,
  unit,
  summary,
  maxScale,
  decimals,
  tone,
}: GaugeProps) {
  const colors =
    tones[tone];

  const average =
    summary.average;

  const percentage =
    average == null
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            (average /
              maxScale) *
              100
          )
        );

  return (
    <article
      style={{
        position:
          "relative",
        overflow:
          "hidden",
        minHeight:
          "280px",
        padding:
          "18px 18px 16px",
        border:
          `1px solid ${colors.border}`,
        borderRadius:
          "var(--taste-radius-lg)",
        background: `
          radial-gradient(
            circle at 50% 44%,
            ${colors.glow},
            transparent 11rem
          ),
          linear-gradient(
            145deg,
            ${colors.wash},
            transparent 72%
          ),
          var(--taste-surface)
        `,
        boxShadow:
          "inset 0 1px 0 rgba(255,235,205,0.035)",
      }}
    >
      <div
        style={{
          color:
            colors.accent,
          fontSize:
            "9px",
          fontWeight:
            850,
          letterSpacing:
            "0.08em",
          textTransform:
            "uppercase",
        }}
      >
        {subtitle}
      </div>

      <h3
        style={{
          margin:
            "4px 0 0",
          color:
            "var(--taste-text)",
          fontSize:
            "18px",
          fontWeight:
            850,
          letterSpacing:
            "-0.025em",
        }}
      >
        {label}
      </h3>

      <div
        style={{
          position:
            "relative",
          maxWidth:
            "220px",
          margin:
            "18px auto 0",
        }}
      >
        <svg
          viewBox="0 0 120 72"
          role="img"
          aria-label={`${label}: ${formatValue(
            average,
            decimals
          )} ${unit}`}
          style={{
            display:
              "block",
            width:
              "100%",
            overflow:
              "visible",
            filter:
              `drop-shadow(0 0 12px ${colors.glow})`,
          }}
        >
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="rgba(255,255,255,0.075)"
            strokeWidth="9"
            strokeLinecap="round"
            pathLength="100"
          />

          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={
              colors.accent
            }
            strokeWidth="9"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${percentage} 100`}
          />

          <circle
            cx="10"
            cy="60"
            r="2.5"
            fill={
              colors.accentSoft
            }
          />

          <circle
            cx="110"
            cy="60"
            r="2.5"
            fill="rgba(255,255,255,0.10)"
          />
        </svg>

        <div
          style={{
            position:
              "absolute",
            left: 0,
            right: 0,
            bottom:
              "7px",
            textAlign:
              "center",
          }}
        >
          <div
            style={{
              color:
                "var(--taste-text)",
              fontSize:
                "29px",
              lineHeight:
                1,
              fontWeight:
                900,
              letterSpacing:
                "-0.045em",
            }}
          >
            {formatValue(
              average,
              decimals
            )}
          </div>

          <div
            style={{
              marginTop:
                "3px",
              color:
                colors.accent,
              fontSize:
                "10px",
              fontWeight:
                800,
            }}
          >
            {unit}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "10px",
          paddingTop:
            "12px",
          borderTop:
            `1px solid ${colors.border}`,
          display:
            "grid",
          gridTemplateColumns:
            "1fr auto 1fr",
          alignItems:
            "center",
          gap:
            "8px",
        }}
      >
        <div>
          <div
            style={{
              color:
                "var(--taste-text-muted)",
              fontSize:
                "8px",
              textTransform:
                "uppercase",
              letterSpacing:
                "0.065em",
            }}
          >
            Minimum
          </div>

          <div
            style={{
              marginTop:
                "3px",
              color:
                "var(--taste-text)",
              fontSize:
                "12px",
              fontWeight:
                800,
            }}
          >
            {formatValue(
              summary.min,
              decimals
            )}{" "}
            {summary.min != null
              ? unit
              : ""}
          </div>
        </div>

        <div
          style={{
            width:
              "1px",
            height:
              "28px",
            background:
              colors.border,
          }}
        />

        <div
          style={{
            textAlign:
              "right",
          }}
        >
          <div
            style={{
              color:
                "var(--taste-text-muted)",
              fontSize:
                "8px",
              textTransform:
                "uppercase",
              letterSpacing:
                "0.065em",
            }}
          >
            Maximum
          </div>

          <div
            style={{
              marginTop:
                "3px",
              color:
                "var(--taste-text)",
              fontSize:
                "12px",
              fontWeight:
                800,
            }}
          >
            {formatValue(
              summary.max,
              decimals
            )}{" "}
            {summary.max != null
              ? unit
              : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop:
            "9px",
          color:
            "var(--taste-text-muted)",
          fontSize:
            "9px",
          textAlign:
            "center",
        }}
      >
        {summary.count > 0
          ? `z ${summary.count} započítaných piv`
          : "Zatím bez dat"}
      </div>
    </article>
  );
}

export default function ProfileTechnicalCard({
  plato,
  abv,
  ibu,
}: ProfileTechnicalCardProps) {
  return (
    <section
      style={{
        marginBottom:
          "38px",
      }}
    >
      <div
        style={{
          marginBottom:
            "14px",
        }}
      >
        <div
          className="taste-label"
          style={{
            marginBottom:
              "5px",
          }}
        >
          Parametry ochutnávek
        </div>

        <h2
          style={{
            margin: 0,
            fontSize:
              "24px",
            letterSpacing:
              "-0.025em",
          }}
        >
          Technický pivní profil
        </h2>

        <p
          style={{
            maxWidth:
              "650px",
            margin:
              "6px 0 0",
            color:
              "var(--taste-text-muted)",
            fontSize:
              "11px",
            lineHeight:
              1.55,
          }}
        >
          Průměrné hodnoty a
          rozsah parametrů piv,
          která se v tomto profilu
          objevila.
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-3
          md:grid-cols-3
        "
      >
        <TechnicalGauge
          label="Stupňovitost"
          subtitle="Sladový profil"
          unit="°P"
          summary={plato}
          maxScale={30}
          decimals={1}
          tone="gold"
        />

        <TechnicalGauge
          label="Obsah alkoholu"
          subtitle="Síla"
          unit="% ABV"
          summary={abv}
          maxScale={15}
          decimals={1}
          tone="red"
        />

        <TechnicalGauge
          label="Hořkost"
          subtitle="Chmelový profil"
          unit="IBU"
          summary={ibu}
          maxScale={100}
          decimals={0}
          tone="green"
        />
      </div>
    </section>
  );
}
