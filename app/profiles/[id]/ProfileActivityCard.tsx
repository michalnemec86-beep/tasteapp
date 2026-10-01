import type {
  ProfileActivityPoint,
} from "@/lib/profileStats";
import ProfileLoopCarousel from "./ProfileLoopCarousel";

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
      className="taste-profile-activity-section"
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
          className="taste-profile-activity-description"
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
          ochutnávek.
        </p>
      </div>

      <div className="taste-profile-activity-layout">
        <article
          className="taste-profile-activity-chart-card"
          style={{
            padding:
              "16px 16px 12px",
            border:
              "1px solid rgba(223,127,50,0.34)",
            borderRadius:
              "var(--taste-radius-lg)",
            background: `
              radial-gradient(
                circle at 82% 0%,
                rgba(223,127,50,0.16),
                transparent 20rem
              ),
              linear-gradient(
                145deg,
                rgba(194,85,63,0.065),
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
              className="taste-profile-activity-chart"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  `repeat(${visibleMonths.length}, minmax(0, 1fr))`,
                alignItems:
                  "end",
                gap:
                  "7px",
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

                  const barHeight =
                    item.count ===
                    0
                      ? 4
                      : Math.max(
                          10,
                          ratio *
                            100
                        );

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
                      className="taste-profile-activity-column"
                    >
                      <div
                        className={
                          isTop
                            ? "taste-profile-activity-value taste-profile-activity-value-top"
                            : "taste-profile-activity-value"
                        }
                      >
                        {
                          item.count
                        }
                      </div>

                      <div className="taste-profile-activity-bar-slot">
                        <div
                          className={
                            isTop
                              ? "taste-profile-activity-bar taste-profile-activity-bar-top"
                              : "taste-profile-activity-bar"
                          }
                          style={{
                            height:
                              `${barHeight}%`,
                          }}
                        />
                      </div>

                      <div className="taste-profile-activity-month">
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
                          <div className="taste-profile-activity-year">
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
            <div className="taste-profile-activity-empty">
              Zatím bez dat
            </div>
          )}
        </article>

        <ProfileLoopCarousel className="taste-profile-activity-metrics-carousel">
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
        </ProfileLoopCarousel>
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
      className="taste-profile-activity-metric"
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
        className="taste-profile-activity-metric-label"
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
