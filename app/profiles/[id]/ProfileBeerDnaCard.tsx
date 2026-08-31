import type {
  RankingItem,
} from "@/lib/stats";

type ProfileBeerDnaCardProps = {
  styles: RankingItem[];
};

type DnaSegment = {
  name: string;
  count: number;
  percentage: number;
  color: string;
  wash: string;
};

const palette = [
  {
    color: "#f2b63f",
    wash: "rgba(242,182,63,0.16)",
  },
  {
    color: "#e17d32",
    wash: "rgba(225,125,50,0.16)",
  },
  {
    color: "#c94f3d",
    wash: "rgba(201,79,61,0.16)",
  },
  {
    color: "#a86d32",
    wash: "rgba(168,109,50,0.16)",
  },
  {
    color: "#849a42",
    wash: "rgba(132,154,66,0.16)",
  },
  {
    color: "#c99454",
    wash: "rgba(201,148,84,0.16)",
  },
];

function buildSegments(
  styles: RankingItem[]
): DnaSegment[] {
  const total =
    styles.reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

  if (total <= 0) {
    return [];
  }

  const topStyles =
    styles.slice(0, 5);

  const otherCount =
    styles
      .slice(5)
      .reduce(
        (sum, item) =>
          sum + item.count,
        0
      );

  const items =
    otherCount > 0
      ? [
          ...topStyles,
          {
            id: "other",
            name: "Ostatní",
            count: otherCount,
          },
        ]
      : topStyles;

  return items.map(
    (item, index) => ({
      name: item.name,
      count: item.count,
      percentage:
        (item.count / total) *
        100,
      color:
        palette[index]
          ?.color ??
        palette[
          palette.length - 1
        ].color,
      wash:
        palette[index]
          ?.wash ??
        palette[
          palette.length - 1
        ].wash,
    })
  );
}

export default function ProfileBeerDnaCard({
  styles,
}: ProfileBeerDnaCardProps) {
  const segments =
    buildSegments(styles);

  const total =
    segments.reduce(
      (sum, segment) =>
        sum + segment.count,
      0
    );

  const dominant =
    segments[0] ?? null;

  let gradientOffset = 0;

  const gradientStops =
    segments.flatMap(
      (segment) => {
        const start =
          gradientOffset;

        gradientOffset +=
          segment.percentage;

        return [
          `${segment.color} ${start}%`,
          `${segment.color} ${gradientOffset}%`,
        ];
      }
    );

  const dnaGradient =
    gradientStops.length > 0
      ? `linear-gradient(to top, ${gradientStops.join(", ")})`
      : "transparent";

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
          Chuťový profil
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
          Pivní DNA
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
          Složení profilu podle
          zastoupení jednotlivých
          pivních stylů.
        </p>
      </div>

      <article
        className="
          grid
          grid-cols-1
          gap-5
          lg:grid-cols-[340px_minmax(0,1fr)]
        "
        style={{
          padding:
            "22px",
          border:
            "1px solid rgba(224,126,48,0.38)",
          borderRadius:
            "var(--taste-radius-lg)",
          background: `
            radial-gradient(
              circle at 16% 14%,
              rgba(242,182,63,0.17),
              transparent 18rem
            ),
            radial-gradient(
              circle at 84% 84%,
              rgba(132,154,66,0.10),
              transparent 22rem
            ),
            linear-gradient(
              145deg,
              rgba(201,79,61,0.055),
              transparent 66%
            ),
            var(--taste-surface)
          `,
          boxShadow:
            "inset 0 1px 0 rgba(255,235,200,0.035)",
        }}
      >
        <div
          style={{
            minHeight:
              "430px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          {segments.length >
          0 ? (
            <div
              style={{
                position:
                  "relative",
                width:
                  "100%",
                maxWidth:
                  "250px",
                height:
                  "410px",
                background:
                  dnaGradient,
                WebkitMaskImage:
                  'url("/images/profile/male-silhouette.svg")',
                maskImage:
                  'url("/images/profile/male-silhouette.svg")',
                WebkitMaskRepeat:
                  "no-repeat",
                maskRepeat:
                  "no-repeat",
                WebkitMaskPosition:
                  "center",
                maskPosition:
                  "center",
                WebkitMaskSize:
                  "contain",
                maskSize:
                  "contain",
                filter: `
                  drop-shadow(
                    0 0 1px
                    rgba(255,226,181,0.75)
                  )
                  drop-shadow(
                    0 12px 22px
                    rgba(0,0,0,0.38)
                  )
                  drop-shadow(
                    0 0 18px
                    rgba(225,125,50,0.09)
                  )
                `,
              }}
              role="img"
              aria-label="Pivní DNA podle pivních stylů"
            />
          ) : (
            <div
              style={{
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "12px",
              }}
            >
              Zatím bez dat
            </div>
          )}
        </div>

        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            justifyContent:
              "center",
          }}
        >
          {dominant && (
            <div
              style={{
                marginBottom:
                  "18px",
                padding:
                  "15px 16px",
                border:
                  `1px solid ${dominant.color}66`,
                borderRadius:
                  "14px",
                background: `
                  linear-gradient(
                    145deg,
                    ${dominant.wash},
                    transparent 76%
                  ),
                  rgba(18,12,8,0.38)
                `,
              }}
            >
              <div
                style={{
                  color:
                    dominant.color,
                  fontSize:
                    "9px",
                  fontWeight:
                    800,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.075em",
                }}
              >
                Dominantní styl
              </div>

              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "var(--taste-text)",
                  fontSize:
                    "24px",
                  fontWeight:
                    850,
                  lineHeight:
                    1.05,
                  letterSpacing:
                    "-0.035em",
                }}
              >
                {
                  dominant.name
                }
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
                {dominant.percentage.toLocaleString(
                  "cs-CZ",
                  {
                    maximumFractionDigits:
                      1,
                  }
                )}
                % pivního profilu
              </div>
            </div>
          )}

          <div
            style={{
              display:
                "grid",
              gap:
                "8px",
            }}
          >
            {segments.map(
              (segment) => (
                <div
                  key={
                    segment.name
                  }
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "12px minmax(0,1fr) auto",
                    alignItems:
                      "center",
                    gap:
                      "10px",
                    padding:
                      "10px 11px",
                    border:
                      `1px solid ${segment.color}3d`,
                    borderRadius:
                      "11px",
                    background:
                      `linear-gradient(90deg, ${segment.wash}, transparent 70%)`,
                  }}
                >
                  <div
                    style={{
                      width:
                        "9px",
                      height:
                        "9px",
                      borderRadius:
                        "999px",
                      background:
                        segment.color,
                      boxShadow:
                        `0 0 12px ${segment.color}55`,
                    }}
                  />

                  <div
                    style={{
                      minWidth:
                        0,
                    }}
                  >
                    <div
                      style={{
                        overflow:
                          "hidden",
                        color:
                          "var(--taste-text)",
                        fontSize:
                          "12px",
                        fontWeight:
                          750,
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        segment.name
                      }
                    </div>

                    <div
                      style={{
                        marginTop:
                          "2px",
                        color:
                          "var(--taste-text-muted)",
                        fontSize:
                          "9px",
                      }}
                    >
                      {
                        segment.count
                      }{" "}
                      z {total}
                    </div>
                  </div>

                  <div
                    style={{
                      color:
                        segment.color,
                      fontSize:
                        "13px",
                      fontWeight:
                        850,
                    }}
                  >
                    {segment.percentage.toLocaleString(
                      "cs-CZ",
                      {
                        maximumFractionDigits:
                          1,
                      }
                    )}
                    %
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
