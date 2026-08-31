import type {
  ProfileBeerRecord,
  ProfileActivityPoint,
} from "@/lib/profileStats";

type ProfileRecordsCardProps = {
  strongestBeer:
    | ProfileBeerRecord
    | null;
  bitterestBeer:
    | ProfileBeerRecord
    | null;
  highestPlatoBeer:
    | ProfileBeerRecord
    | null;
  mostActiveMonth:
    | ProfileActivityPoint
    | null;
  mostActiveYear:
    | ProfileActivityPoint
    | null;
  firstTasting:
    | string
    | null;
};

type BeerRecordCardProps = {
  eyebrow: string;
  title: string;
  record:
    | ProfileBeerRecord
    | null;
  unit: string;
  decimals: number;
  accent: string;
  border: string;
  wash: string;
  glow: string;
};

function formatMonth(
  key:
    | string
    | null
) {
  if (!key) {
    return "—";
  }

  const [
    year,
    month,
  ] = key
    .split("-")
    .map(Number);

  if (
    !year ||
    !month
  ) {
    return key;
  }

  return new Intl.DateTimeFormat(
    "cs-CZ",
    {
      month:
        "long",
      year:
        "numeric",
    }
  ).format(
    new Date(
      year,
      month - 1,
      1
    )
  );
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "cs-CZ",
    {
      day:
        "numeric",
      month:
        "long",
      year:
        "numeric",
    }
  ).format(date);
}

function BeerRecordCard({
  eyebrow,
  title,
  record,
  unit,
  decimals,
  accent,
  border,
  wash,
  glow,
}: BeerRecordCardProps) {
  return (
    <div
      style={{
        position:
          "relative",
        minHeight:
          "220px",
        overflow:
          "hidden",
        padding:
          "18px",
        border:
          `1px solid ${border}`,
        borderRadius:
          "16px",
        background: `
          radial-gradient(
            circle at 88% 10%,
            ${wash},
            transparent 12rem
          ),
          linear-gradient(
            145deg,
            ${wash},
            rgba(17,12,8,0.28) 66%
          )
        `,
        boxShadow:
          `0 0 24px ${glow}, inset 0 1px 0 rgba(255,245,220,0.035)`,
      }}
    >
      <div
        style={{
          position:
            "absolute",
          top:
            "-24px",
          right:
            "-8px",
          color:
            accent,
          fontSize:
            "112px",
          lineHeight:
            1,
          fontWeight:
            950,
          opacity:
            0.055,
          pointerEvents:
            "none",
        }}
      >
        ★
      </div>

      <div
        style={{
          position:
            "relative",
          zIndex:
            1,
          display:
            "flex",
          height:
            "100%",
          flexDirection:
            "column",
          justifyContent:
            "space-between",
          gap:
            "28px",
        }}
      >
        <div>
          <div
            style={{
              color:
                accent,
              fontSize:
                "9px",
              fontWeight:
                900,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              marginTop:
                "6px",
              color:
                "var(--taste-text-muted)",
              fontSize:
                "11px",
              fontWeight:
                700,
            }}
          >
            {title}
          </div>
        </div>

        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "baseline",
              gap:
                "5px",
              color:
                accent,
            }}
          >
            <span
              style={{
                fontSize:
                  "42px",
                lineHeight:
                  0.9,
                fontWeight:
                  950,
                letterSpacing:
                  "-0.06em",
              }}
            >
              {record
                ? record.value.toLocaleString(
                    "cs-CZ",
                    {
                      minimumFractionDigits:
                        decimals,
                      maximumFractionDigits:
                        decimals,
                    }
                  )
                : "—"}
            </span>

            <span
              style={{
                fontSize:
                  "13px",
                fontWeight:
                  850,
              }}
            >
              {record
                ? unit
                : ""}
            </span>
          </div>

          <div
            style={{
              marginTop:
                "10px",
              color:
                "var(--taste-text)",
              fontSize:
                "16px",
              lineHeight:
                1.15,
              fontWeight:
                900,
              letterSpacing:
                "-0.025em",
            }}
          >
            {record
              ?.beerName ??
              "Zatím bez dat"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileRecordsCard({
  strongestBeer,
  bitterestBeer,
  highestPlatoBeer,
  mostActiveMonth,
  mostActiveYear,
  firstTasting,
}: ProfileRecordsCardProps) {
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
          Osobní maxima
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
          Síň rekordů
        </h2>

        <p
          style={{
            maxWidth:
              "680px",
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
          Piva a období,
          která si v historii
          profilu sáhla
          na nejvyšší příčky.
        </p>
      </div>

      <article
        style={{
          padding:
            "20px",
          border:
            "1px solid rgba(210,118,52,0.38)",
          borderRadius:
            "var(--taste-radius-lg)",
          background: `
            radial-gradient(
              circle at 8% 0%,
              rgba(241,179,62,0.10),
              transparent 21rem
            ),
            radial-gradient(
              circle at 96% 100%,
              rgba(197,77,58,0.08),
              transparent 18rem
            ),
            var(--taste-surface)
          `,
          boxShadow:
            "inset 0 1px 0 rgba(255,235,205,0.035)",
        }}
      >
        <div
          className="
            grid
            grid-cols-1
            gap-3
            lg:grid-cols-3
          "
        >
          <BeerRecordCard
            eyebrow="Silák"
            title="Nejvyšší obsah alkoholu"
            record={
              strongestBeer
            }
            unit="%"
            decimals={1}
            accent="#d65b42"
            border="rgba(214,91,66,0.50)"
            wash="rgba(214,91,66,0.15)"
            glow="rgba(214,91,66,0.10)"
          />

          <BeerRecordCard
            eyebrow="Hořká špička"
            title="Nejvyšší hodnota IBU"
            record={
              bitterestBeer
            }
            unit="IBU"
            decimals={0}
            accent="#8ea449"
            border="rgba(142,164,73,0.50)"
            wash="rgba(142,164,73,0.15)"
            glow="rgba(142,164,73,0.10)"
          />

          <BeerRecordCard
            eyebrow="Plné tělo"
            title="Nejvyšší stupňovitost"
            record={
              highestPlatoBeer
            }
            unit="°P"
            decimals={1}
            accent="#efb441"
            border="rgba(239,180,65,0.50)"
            wash="rgba(239,180,65,0.15)"
            glow="rgba(239,180,65,0.10)"
          />
        </div>

        <div
          className="
            grid
            grid-cols-1
            gap-3
            md:grid-cols-3
          "
          style={{
            marginTop:
              "14px",
          }}
        >
          <div
            style={{
              padding:
                "15px 16px",
              border:
                "1px solid rgba(226,128,49,0.38)",
              borderRadius:
                "13px",
              background:
                "linear-gradient(135deg, rgba(226,128,49,0.12), rgba(226,128,49,0.025))",
            }}
          >
            <div
              style={{
                color:
                  "#e28031",
                fontSize:
                  "9px",
                fontWeight:
                  850,
                letterSpacing:
                  "0.07em",
                textTransform:
                  "uppercase",
              }}
            >
              Nejsilnější měsíc
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "17px",
                fontWeight:
                  900,
                letterSpacing:
                  "-0.025em",
              }}
            >
              {formatMonth(
                mostActiveMonth
                  ?.key ??
                  null
              )}
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "10px",
              }}
            >
              {mostActiveMonth
                ? `${mostActiveMonth.count} piv`
                : "Zatím bez dat"}
            </div>
          </div>

          <div
            style={{
              padding:
                "15px 16px",
              border:
                "1px solid rgba(195,78,58,0.37)",
              borderRadius:
                "13px",
              background:
                "linear-gradient(135deg, rgba(195,78,58,0.11), rgba(195,78,58,0.025))",
            }}
          >
            <div
              style={{
                color:
                  "#c94f3d",
                fontSize:
                  "9px",
                fontWeight:
                  850,
                letterSpacing:
                  "0.07em",
                textTransform:
                  "uppercase",
              }}
            >
              Nejsilnější rok
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "17px",
                fontWeight:
                  900,
              }}
            >
              {mostActiveYear
                ?.key ??
                "—"}
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "10px",
              }}
            >
              {mostActiveYear
                ? `${mostActiveYear.count} piv`
                : "Zatím bez dat"}
            </div>
          </div>

          <div
            style={{
              padding:
                "15px 16px",
              border:
                "1px solid rgba(171,112,49,0.37)",
              borderRadius:
                "13px",
              background:
                "linear-gradient(135deg, rgba(171,112,49,0.11), rgba(171,112,49,0.025))",
            }}
          >
            <div
              style={{
                color:
                  "#b77a36",
                fontSize:
                  "9px",
                fontWeight:
                  850,
                letterSpacing:
                  "0.07em",
                textTransform:
                  "uppercase",
              }}
            >
              Kde to začalo
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "17px",
                lineHeight:
                  1.15,
                fontWeight:
                  900,
                letterSpacing:
                  "-0.02em",
              }}
            >
              {formatDate(
                firstTasting
              )}
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "10px",
              }}
            >
              první zaznamenaná
              ochutnávka
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
