import type {
  RankingItem,
} from "@/lib/stats";

type ProfileHopsCardProps = {
  items: RankingItem[];
};

const hopTones = [
  {
    accent: "#9cad47",
    border:
      "rgba(156,173,71,0.50)",
    wash:
      "rgba(156,173,71,0.17)",
    glow:
      "rgba(156,173,71,0.22)",
  },
  {
    accent: "#7f9840",
    border:
      "rgba(127,152,64,0.48)",
    wash:
      "rgba(127,152,64,0.16)",
    glow:
      "rgba(127,152,64,0.20)",
  },
  {
    accent: "#c0a341",
    border:
      "rgba(192,163,65,0.47)",
    wash:
      "rgba(192,163,65,0.15)",
    glow:
      "rgba(192,163,65,0.19)",
  },
  {
    accent: "#c68139",
    border:
      "rgba(198,129,57,0.45)",
    wash:
      "rgba(198,129,57,0.14)",
    glow:
      "rgba(198,129,57,0.18)",
  },
  {
    accent: "#a66f34",
    border:
      "rgba(166,111,52,0.44)",
    wash:
      "rgba(166,111,52,0.13)",
    glow:
      "rgba(166,111,52,0.17)",
  },
];

export default function ProfileHopsCard({
  items,
}: ProfileHopsCardProps) {
  const visibleItems =
    items.slice(0, 12);

  const dominant =
    visibleItems[0] ?? null;

  const maxCount =
    dominant?.count ?? 1;

  const totalMentions =
    items.reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

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
          Aromatická stopa
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
          Chmelový profil
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
          Nejčastěji zastoupené
          odrůdy chmele. Velikost
          a intenzita bubliny
          odpovídají jejich
          četnosti.
        </p>
      </div>

      <article
        className="
          grid
          grid-cols-1
          gap-4
          lg:grid-cols-[minmax(0,1fr)_270px]
        "
        style={{
          padding:
            "20px",
          border:
            "1px solid rgba(132,154,66,0.42)",
          borderRadius:
            "var(--taste-radius-lg)",
          background: `
            radial-gradient(
              circle at 18% 20%,
              rgba(132,154,66,0.15),
              transparent 20rem
            ),
            radial-gradient(
              circle at 88% 86%,
              rgba(198,129,57,0.08),
              transparent 18rem
            ),
            linear-gradient(
              145deg,
              rgba(156,173,71,0.06),
              transparent 68%
            ),
            var(--taste-surface)
          `,
          boxShadow:
            "inset 0 1px 0 rgba(240,255,210,0.03)",
        }}
      >
        <div
          style={{
            minHeight:
              "390px",
            display:
              "flex",
            flexWrap:
              "wrap",
            alignContent:
              "center",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap:
              "12px",
            padding:
              "12px",
          }}
        >
          {visibleItems.length >
          0 ? (
            visibleItems.map(
              (
                item,
                index
              ) => {
                const ratio =
                  maxCount > 0
                    ? item.count /
                      maxCount
                    : 0;

                const size =
                  78 +
                  ratio * 82;

                const tone =
                  hopTones[
                    index %
                      hopTones.length
                  ];

                const isTop =
                  index === 0;

                return (
                  <div
                    key={
                      item.id
                    }
                    title={`${item.name}: ${item.count}×`}
                    style={{
                      width:
                        `${size}px`,
                      height:
                        `${size}px`,
                      flex:
                        "0 0 auto",
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      padding:
                        "10px",
                      border:
                        `1px solid ${tone.border}`,
                      borderRadius:
                        "50%",
                      background: `
                        radial-gradient(
                          circle at 35% 28%,
                          ${tone.wash},
                          transparent 58%
                        ),
                        linear-gradient(
                          145deg,
                          ${tone.wash},
                          rgba(17,12,7,0.76)
                        )
                      `,
                      boxShadow:
                        isTop
                          ? `
                              0 0 30px ${tone.glow},
                              inset 0 1px 0 rgba(240,255,215,0.07)
                            `
                          : `
                              0 0 16px ${tone.glow},
                              inset 0 1px 0 rgba(240,255,215,0.035)
                            `,
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        maxWidth:
                          "100%",
                        color:
                          "var(--taste-text)",
                        fontSize:
                          `${11 + ratio * 4}px`,
                        lineHeight:
                          1.08,
                        fontWeight:
                          isTop
                            ? 900
                            : 800,
                        letterSpacing:
                          "-0.025em",
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {item.name}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "6px",
                        color:
                          tone.accent,
                        fontSize:
                          `${9 + ratio * 3}px`,
                        fontWeight:
                          900,
                      }}
                    >
                      {item.count}×
                    </div>
                  </div>
                );
              }
            )
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
              "grid",
            alignContent:
              "center",
            gap:
              "10px",
          }}
        >
          <div
            style={{
              padding:
                "17px",
              border:
                "1px solid rgba(156,173,71,0.48)",
              borderRadius:
                "14px",
              background: `
                radial-gradient(
                  circle at 100% 0%,
                  rgba(156,173,71,0.16),
                  transparent 10rem
                ),
                rgba(18,13,8,0.42)
              `,
            }}
          >
            <div
              style={{
                color:
                  "#9cad47",
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
              Dominantní chmel
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "24px",
                lineHeight:
                  1.05,
                fontWeight:
                  900,
                letterSpacing:
                  "-0.04em",
              }}
            >
              {dominant?.name ??
                "—"}
            </div>

            <div
              style={{
                marginTop:
                  "6px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "10px",
              }}
            >
              {dominant
                ? `${dominant.count}× v ochutnaných pivech`
                : "Zatím bez dat"}
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "10px",
            }}
          >
            <div
              style={{
                padding:
                  "14px",
                border:
                  "1px solid rgba(127,152,64,0.42)",
                borderRadius:
                  "13px",
                background:
                  "rgba(127,152,64,0.08)",
              }}
            >
              <div
                style={{
                  color:
                    "#8fa348",
                  fontSize:
                    "24px",
                  lineHeight:
                    1,
                  fontWeight:
                    900,
                }}
              >
                {items.length}
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "9px",
                  lineHeight:
                    1.3,
                }}
              >
                různých
                odrůd chmele
              </div>
            </div>

            <div
              style={{
                padding:
                  "14px",
                border:
                  "1px solid rgba(198,129,57,0.40)",
                borderRadius:
                  "13px",
                background:
                  "rgba(198,129,57,0.075)",
              }}
            >
              <div
                style={{
                  color:
                    "#c68139",
                  fontSize:
                    "24px",
                  lineHeight:
                    1,
                  fontWeight:
                    900,
                }}
              >
                {totalMentions}
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "9px",
                  lineHeight:
                    1.3,
                }}
              >
                celkových
                výskytů
              </div>
            </div>
          </div>

          <div
            style={{
              padding:
                "12px 13px",
              border:
                "1px solid rgba(255,255,255,0.07)",
              borderRadius:
                "12px",
              color:
                "var(--taste-text-muted)",
              fontSize:
                "9px",
              lineHeight:
                1.5,
              background:
                "rgba(255,255,255,0.018)",
            }}
          >
            Jedno pivo může
            obsahovat více odrůd,
            proto počet výskytů
            není počtem vypitých
            piv.
          </div>
        </div>
      </article>
    </section>
  );
}
