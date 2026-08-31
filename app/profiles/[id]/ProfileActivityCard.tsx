import type {
  ProfileActivityPoint,
} from "@/lib/profileStats";

type ProfileActivityCardProps = {
  monthlyActivity:
    ProfileActivityPoint[];
  mostActiveMonth:
    ProfileActivityPoint | null;
  mostActiveYear:
    ProfileActivityPoint | null;
  averagePerMonth: number;
};

const monthNames = [
  "led",
  "úno",
  "bře",
  "dub",
  "kvě",
  "čer",
  "čvc",
  "srp",
  "zář",
  "říj",
  "lis",
  "pro",
];

function formatMonth(
  key: string
) {
  const [
    year,
    month,
  ] = key.split("-");

  const monthIndex =
    Number(month) - 1;

  return {
    short:
      monthNames[
        monthIndex
      ] ?? month,
    long:
      `${monthNames[monthIndex] ?? month} ${year}`,
    year,
  };
}

export default function ProfileActivityCard({
  monthlyActivity,
  mostActiveMonth,
  mostActiveYear,
  averagePerMonth,
}: ProfileActivityCardProps) {
  const visibleMonths =
    monthlyActivity.slice(-12);

  const maxCount =
    Math.max(
      1,
      ...visibleMonths.map(
        (item) =>
          item.count
      )
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
          Tempo ochutnávek
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
          Aktivita v čase
        </h2>

        <p
          style={{
            maxWidth:
              "620px",
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
          Posledních 12 měsíců
          ochutnávek. Výška a
          intenzita sloupce
          odpovídají aktivitě.
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-3
          lg:grid-cols-[minmax(0,1fr)_250px]
        "
      >
        <article
          style={{
            minHeight:
              "310px",
            padding:
              "20px 18px 16px",
            border:
              "1px solid rgba(223,127,50,0.34)",
            borderRadius:
              "var(--taste-radius-lg)",
            background: `
              radial-gradient(
                circle at 82% 0%,
                rgba(223,127,50,0.18),
                transparent 20rem
              ),
              linear-gradient(
                145deg,
                rgba(194,85,63,0.075),
                transparent 70%
              ),
              var(--taste-surface)
            `,
            boxShadow:
              "inset 0 1px 0 rgba(255,225,180,0.03)",
          }}
        >
          {visibleMonths.length >
          0 ? (
            <div
              style={{
                height:
                  "250px",
                display:
                  "grid",
                gridTemplateColumns:
                  `repeat(${visibleMonths.length}, minmax(0, 1fr))`,
                alignItems:
                  "end",
                gap:
                  "8px",
              }}
            >
              {visibleMonths.map(
                (
                  item,
                  index
                ) => {
                  const ratio =
                    item.count /
                    maxCount;

                  const height =
                    item.count ===
                    0
                      ? 4
                      : Math.max(
                          18,
                          ratio *
                            185
                        );

                  const alpha =
                    0.34 +
                    ratio *
                      0.58;

                  const isTop =
                    item.key ===
                    mostActiveMonth
                      ?.key;

                  const label =
                    formatMonth(
                      item.key
                    );

                  return (
                    <div
                      key={
                        item.key
                      }
                      title={`${label.long}: ${item.count}`}
                      style={{
                        minWidth:
                          0,
                        height:
                          "100%",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        justifyContent:
                          "flex-end",
                        alignItems:
                          "center",
                        gap:
                          "7px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            isTop
                              ? "#f4c057"
                              : "var(--taste-text-muted)",
                          fontSize:
                            "9px",
                          fontWeight:
                            isTop
                              ? 800
                              : 650,
                        }}
                      >
                        {
                          item.count
                        }
                      </div>

                      <div
                        style={{
                          width:
                            "100%",
                          maxWidth:
                            "42px",
                          height:
                            `${height}px`,
                          minHeight:
                            "4px",
                          border:
                            isTop
                              ? "1px solid rgba(244,192,87,0.70)"
                              : `1px solid rgba(223,127,50,${Math.min(
                                  0.52,
                                  alpha
                                )})`,
                          borderRadius:
                            "7px 7px 3px 3px",
                          background:
                            isTop
                              ? `
                                  linear-gradient(
                                    180deg,
                                    rgba(244,192,87,0.96),
                                    rgba(217,102,47,0.88)
                                  )
                                `
                              : `
                                  linear-gradient(
                                    180deg,
                                    rgba(231,146,48,${alpha}),
                                    rgba(176,74,42,${Math.max(
                                      0.24,
                                      alpha -
                                        0.16
                                    )})
                                  )
                                `,
                          boxShadow:
                            isTop
                              ? "0 0 20px rgba(231,132,45,0.24)"
                              : "none",
                        }}
                      />

                      <div
                        style={{
                          minHeight:
                            "27px",
                          color:
                            "var(--taste-text-muted)",
                          fontSize:
                            "8px",
                          lineHeight:
                            1.25,
                          textAlign:
                            "center",
                        }}
                      >
                        <div>
                          {
                            label.short
                          }
                        </div>

                        {(index ===
                          0 ||
                          label.year !==
                            formatMonth(
                              visibleMonths[
                                index -
                                  1
                              ]?.key ??
                                item.key
                            ).year) && (
                          <div
                            style={{
                              marginTop:
                                "2px",
                              opacity:
                                0.62,
                            }}
                          >
                            {
                              label.year
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              style={{
                height:
                  "250px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "12px",
              }}
            >
              Zatím bez dat
            </div>
          )}
        </article>

        <div
          style={{
            display:
              "grid",
            gap:
              "10px",
          }}
        >
          <ActivityMetric
            label="Nejaktivnější měsíc"
            value={
              mostActiveMonth
                ? formatMonth(
                    mostActiveMonth.key
                  ).long
                : "—"
            }
            detail={
              mostActiveMonth
                ? `${mostActiveMonth.count} piv`
                : "Zatím bez dat"
            }
            tone="orange"
          />

          <ActivityMetric
            label="Nejaktivnější rok"
            value={
              mostActiveYear
                ?.key ?? "—"
            }
            detail={
              mostActiveYear
                ? `${mostActiveYear.count} piv`
                : "Zatím bez dat"
            }
            tone="red"
          />

          <ActivityMetric
            label="Průměr za měsíc"
            value={
              averagePerMonth >
              0
                ? averagePerMonth.toLocaleString(
                    "cs-CZ",
                    {
                      maximumFractionDigits:
                        1,
                    }
                  )
                : "—"
            }
            detail="od první ochutnávky"
            tone="gold"
          />
        </div>
      </div>
    </section>
  );
}

function ActivityMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone:
    | "orange"
    | "red"
    | "gold";
}) {
  const colors = {
    orange: {
      accent:
        "#e48332",
      border:
        "rgba(228,131,50,0.40)",
      wash:
        "rgba(228,131,50,0.11)",
    },
    red: {
      accent:
        "#c6533d",
      border:
        "rgba(198,83,61,0.42)",
      wash:
        "rgba(198,83,61,0.12)",
    },
    gold: {
      accent:
        "#efb644",
      border:
        "rgba(239,182,68,0.40)",
      wash:
        "rgba(239,182,68,0.11)",
    },
  };

  const color =
    colors[tone];

  return (
    <article
      style={{
        minHeight:
          "92px",
        padding:
          "14px 15px",
        border:
          `1px solid ${color.border}`,
        borderRadius:
          "var(--taste-radius-lg)",
        background: `
          linear-gradient(
            145deg,
            ${color.wash},
            transparent 78%
          ),
          var(--taste-surface)
        `,
      }}
    >
      <div
        style={{
          color:
            color.accent,
          fontSize:
            "9px",
          fontWeight:
            800,
          letterSpacing:
            "0.07em",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "7px",
          color:
            "var(--taste-text)",
          fontSize:
            "20px",
          lineHeight:
            1.05,
          fontWeight:
            850,
          letterSpacing:
            "-0.03em",
        }}
      >
        {value}
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
        {detail}
      </div>
    </article>
  );
}
