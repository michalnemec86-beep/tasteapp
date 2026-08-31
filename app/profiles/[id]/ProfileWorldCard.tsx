import BeerWorldMap from "@/app/stats/BeerWorldMap";

import type {
  RankingItem,
} from "@/lib/stats";

type ProfileWorldCardProps = {
  items: RankingItem[];
};

const countryTones = [
  {
    accent: "#d65b3e",
    border:
      "rgba(214,91,62,0.44)",
    wash:
      "rgba(214,91,62,0.14)",
  },
  {
    accent: "#e48232",
    border:
      "rgba(228,130,50,0.43)",
    wash:
      "rgba(228,130,50,0.13)",
  },
  {
    accent: "#eeb242",
    border:
      "rgba(238,178,66,0.42)",
    wash:
      "rgba(238,178,66,0.13)",
  },
  {
    accent: "#a87132",
    border:
      "rgba(168,113,50,0.41)",
    wash:
      "rgba(168,113,50,0.12)",
  },
  {
    accent: "#879b45",
    border:
      "rgba(135,155,69,0.42)",
    wash:
      "rgba(135,155,69,0.12)",
  },
];

export default function ProfileWorldCard({
  items,
}: ProfileWorldCardProps) {
  const topCountries =
    items.slice(0, 5);

  const total =
    items.reduce(
      (sum, item) =>
        sum + item.count,
      0
    );

  const maxCount =
    topCountries[0]
      ?.count ?? 1;

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
          Původ ochutnávek
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
          Pivní svět
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
          Země, ze kterých
          pocházejí pivovary
          zastoupené v tomto
          profilu.
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-3
          xl:grid-cols-[minmax(0,1.75fr)_300px]
        "
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <BeerWorldMap
            items={items}
            eyebrow="Osobní mapa"
            title="Mapa pivního původu"
            countLabel="zemí v profilu"
          />
        </div>

        <article
          style={{
            padding:
              "17px",
            border:
              "1px solid rgba(214,91,62,0.38)",
            borderRadius:
              "var(--taste-radius-lg)",
            background: `
              radial-gradient(
                circle at 100% 0%,
                rgba(214,91,62,0.15),
                transparent 14rem
              ),
              linear-gradient(
                145deg,
                rgba(228,130,50,0.07),
                transparent 70%
              ),
              var(--taste-surface)
            `,
            boxShadow:
              "inset 0 1px 0 rgba(255,235,200,0.035)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "space-between",
              gap:
                "12px",
              marginBottom:
                "15px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#d65b3e",
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
                TOP země
              </div>

              <div
                style={{
                  marginTop:
                    "4px",
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
                Odkud piješ
              </div>
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <div
                style={{
                  color:
                    "#eeb242",
                  fontSize:
                    "23px",
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
                    "3px",
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "8px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.06em",
                }}
              >
                zemí
              </div>
            </div>
          </div>

          {topCountries.length >
          0 ? (
            <div
              style={{
                display:
                  "grid",
                gap:
                  "9px",
              }}
            >
              {topCountries.map(
                (
                  item,
                  index
                ) => {
                  const tone =
                    countryTones[
                      index %
                        countryTones.length
                    ];

                  const ratio =
                    maxCount > 0
                      ? item.count /
                        maxCount
                      : 0;

                  const percentage =
                    total > 0
                      ? (item.count /
                          total) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        item.id
                      }
                      style={{
                        padding:
                          "11px 12px",
                        border:
                          `1px solid ${tone.border}`,
                        borderRadius:
                          "12px",
                        background: `
                          linear-gradient(
                            90deg,
                            ${tone.wash},
                            transparent 76%
                          ),
                          rgba(18,12,8,0.28)
                        `,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "24px minmax(0,1fr) auto",
                          alignItems:
                            "center",
                          gap:
                            "8px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              tone.accent,
                            fontSize:
                              "10px",
                            fontWeight:
                              900,
                          }}
                        >
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div
                          style={{
                            overflow:
                              "hidden",
                            color:
                              "var(--taste-text)",
                            fontSize:
                              "12px",
                            fontWeight:
                              780,
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            item.name
                          }
                        </div>

                        <div
                          style={{
                            color:
                              tone.accent,
                            fontSize:
                              "11px",
                            fontWeight:
                              850,
                          }}
                        >
                          {percentage.toLocaleString(
                            "cs-CZ",
                            {
                              maximumFractionDigits:
                                1,
                            }
                          )}
                          %
                        </div>
                      </div>

                      <div
                        style={{
                          height:
                            "5px",
                          marginTop:
                            "8px",
                          overflow:
                            "hidden",
                          borderRadius:
                            "999px",
                          background:
                            "rgba(255,255,255,0.055)",
                        }}
                      >
                        <div
                          style={{
                            width:
                              `${Math.max(
                                2,
                                ratio *
                                  100
                              )}%`,
                            height:
                              "100%",
                            borderRadius:
                              "999px",
                            background:
                              `linear-gradient(90deg, ${tone.accent}, ${tone.accent}88)`,
                            boxShadow:
                              `0 0 11px ${tone.accent}44`,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize:
                            "9px",
                          textAlign:
                            "right",
                        }}
                      >
                        {
                          item.count
                        }{" "}
                        piv
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              style={{
                padding:
                  "28px 10px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "11px",
                textAlign:
                  "center",
              }}
            >
              Zatím bez dat
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
