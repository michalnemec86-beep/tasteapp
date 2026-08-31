import type {
  RankingItem,
} from "@/lib/stats";

type ProfilePackagingCardProps = {
  items: RankingItem[];
};

const palette = [
  {
    color: "#f2b63f",
    wash: "rgba(242,182,63,0.15)",
    border: "rgba(242,182,63,0.42)",
  },
  {
    color: "#e47f32",
    wash: "rgba(228,127,50,0.15)",
    border: "rgba(228,127,50,0.42)",
  },
  {
    color: "#ca553f",
    wash: "rgba(202,85,63,0.15)",
    border: "rgba(202,85,63,0.42)",
  },
  {
    color: "#8da348",
    wash: "rgba(141,163,72,0.15)",
    border: "rgba(141,163,72,0.42)",
  },
  {
    color: "#a86d32",
    wash: "rgba(168,109,50,0.15)",
    border: "rgba(168,109,50,0.42)",
  },
  {
    color: "#d49b50",
    wash: "rgba(212,155,80,0.15)",
    border: "rgba(212,155,80,0.42)",
  },
];

export default function ProfilePackagingCard({
  items,
}: ProfilePackagingCardProps) {
  const total =
    items.reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

  let offset = 0;

  const segments =
    items.map(
      (item, index) => {
        const percentage =
          total > 0
            ? (item.count /
                total) *
              100
            : 0;

        const start =
          offset;

        const end =
          start +
          percentage;

        offset = end;

        const tone =
          palette[
            index %
              palette.length
          ];

        return {
          ...item,
          percentage,
          start,
          end,
          ...tone,
        };
      }
    );

  const gradient =
    segments.length > 0
      ? `conic-gradient(
          ${segments
            .map(
              (segment) =>
                `${segment.color} ${segment.start}% ${segment.end}%`
            )
            .join(", ")}
        )`
      : "rgba(255,255,255,0.05)";

  const dominant =
    segments[0] ?? null;

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
          Způsob podání
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
          Jak piješ
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
          Poměr jednotlivých
          způsobů podání a obalů
          napříč ochutnávkami.
        </p>
      </div>

      <article
        className="
          grid
          grid-cols-1
          gap-6
          lg:grid-cols-[360px_minmax(0,1fr)]
        "
        style={{
          padding:
            "22px",
          border:
            "1px solid rgba(228,127,50,0.38)",
          borderRadius:
            "var(--taste-radius-lg)",
          background: `
            radial-gradient(
              circle at 15% 25%,
              rgba(242,182,63,0.14),
              transparent 18rem
            ),
            radial-gradient(
              circle at 88% 82%,
              rgba(141,163,72,0.08),
              transparent 20rem
            ),
            linear-gradient(
              145deg,
              rgba(202,85,63,0.05),
              transparent 68%
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
              "330px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          {total > 0 ? (
            <div
              style={{
                position:
                  "relative",
                width:
                  "250px",
                height:
                  "250px",
                flexShrink:
                  0,
                borderRadius:
                  "50%",
                background:
                  gradient,
                boxShadow: `
                  0 18px 36px rgba(0,0,0,0.30),
                  0 0 28px rgba(228,127,50,0.10)
                `,
              }}
              role="img"
              aria-label="Poměr způsobů podání a obalů"
            >
              <div
                style={{
                  position:
                    "absolute",
                  inset:
                    "34px",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "1px solid rgba(255,226,181,0.15)",
                  borderRadius:
                    "50%",
                  background: `
                    radial-gradient(
                      circle at 50% 35%,
                      rgba(242,182,63,0.09),
                      transparent 65%
                    ),
                    rgba(17,11,7,0.96)
                  `,
                  boxShadow: `
                    inset 0 0 28px rgba(0,0,0,0.34),
                    0 0 20px rgba(0,0,0,0.20)
                  `,
                }}
              >
                <div
                  style={{
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "9px",
                    fontWeight:
                      800,
                    letterSpacing:
                      "0.075em",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Celkem
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "var(--taste-text)",
                    fontSize:
                      "36px",
                    lineHeight:
                      1,
                    fontWeight:
                      900,
                    letterSpacing:
                      "-0.05em",
                  }}
                >
                  {total}
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
                  započítaných piv
                </div>
              </div>
            </div>
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
                  "14px",
                padding:
                  "14px 15px",
                border:
                  `1px solid ${dominant.border}`,
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
                    850,
                  letterSpacing:
                    "0.075em",
                  textTransform:
                    "uppercase",
                }}
              >
                Nejčastěji
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "var(--taste-text)",
                  fontSize:
                    "22px",
                  lineHeight:
                    1.05,
                  fontWeight:
                    850,
                  letterSpacing:
                    "-0.035em",
                }}
              >
                {dominant.name}
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
                {dominant.percentage.toLocaleString(
                  "cs-CZ",
                  {
                    maximumFractionDigits:
                      1,
                  }
                )}
                % všech ochutnávek
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
                    segment.id
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
                      `1px solid ${segment.border}`,
                    borderRadius:
                      "11px",
                    background:
                      `linear-gradient(90deg, ${segment.wash}, transparent 72%)`,
                  }}
                >
                  <div
                    style={{
                      width:
                        "9px",
                      height:
                        "9px",
                      borderRadius:
                        "50%",
                      background:
                        segment.color,
                      boxShadow:
                        `0 0 12px ${segment.color}66`,
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
                      piv
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
