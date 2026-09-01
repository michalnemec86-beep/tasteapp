import type {
  AchievementMedal,
  AchievementProgress,
  AchievementSeries,
} from "@/lib/achievements";

type AchievementJourney = {
  series: AchievementSeries;
  seriesName: string;
  unit: string;
  current: number;
  progressCurrent: number;
  earned:
    | AchievementProgress
    | null;
  next:
    | AchievementProgress
    | null;
  levels: AchievementProgress[];
};

type ProfileAchievementJourneysProps = {
  series: AchievementJourney[];
  earnedSeriesCount: number;
};

const MEDAL_VISUALS = {
  cloth: {
    color: "#c6aa82",
    border:
      "rgba(198,170,130,0.52)",
    soft:
      "rgba(198,170,130,0.14)",
    glow:
      "rgba(198,170,130,0.18)",
  },
  wood: {
    color: "#b87338",
    border:
      "rgba(184,115,56,0.56)",
    soft:
      "rgba(184,115,56,0.16)",
    glow:
      "rgba(184,115,56,0.21)",
  },
  bronze: {
    color: "#d56c3e",
    border:
      "rgba(213,108,62,0.60)",
    soft:
      "rgba(213,108,62,0.18)",
    glow:
      "rgba(213,108,62,0.25)",
  },
  silver: {
    color: "#d5d8d2",
    border:
      "rgba(213,216,210,0.60)",
    soft:
      "rgba(213,216,210,0.13)",
    glow:
      "rgba(213,216,210,0.20)",
  },
  gold: {
    color: "#f2b63f",
    border:
      "rgba(242,182,63,0.66)",
    soft:
      "rgba(242,182,63,0.19)",
    glow:
      "rgba(242,182,63,0.29)",
  },
  diamond: {
    color: "#a8d0bd",
    border:
      "rgba(168,208,189,0.64)",
    soft:
      "rgba(168,208,189,0.16)",
    glow:
      "rgba(168,208,189,0.25)",
  },
  master: {
    color: "#e15a3d",
    border:
      "rgba(225,90,61,0.72)",
    soft:
      "rgba(225,90,61,0.21)",
    glow:
      "rgba(225,90,61,0.34)",
  },
} satisfies Record<
  AchievementMedal,
  {
    color: string;
    border: string;
    soft: string;
    glow: string;
  }
>;

const SERIES_ACCENTS:
  Record<
    AchievementSeries,
    string
  > = {
  beers: "#f2b63f",
  breweries: "#e17d32",
  brewery_of_day: "#d99a3e",
  styles: "#cb5940",
  countries: "#b77a36",
  hops: "#8ea348",
};

function shortMedalName(
  name:
    | string
    | null
) {
  if (!name) {
    return "Meta";
  }

  return name.replace(
    / medaile$/i,
    ""
  );
}

function MedalIcon({
  medal,
  achieved,
  next,
}: {
  medal:
    | AchievementMedal
    | null;
  achieved: boolean;
  next: boolean;
}) {
  const visual =
    medal
      ? MEDAL_VISUALS[
          medal
        ]
      : null;

  const color =
    visual?.color ??
    "#8e8579";

  return (
    <div
      style={{
        width:
          next
            ? "58px"
            : "52px",
        height:
          next
            ? "58px"
            : "52px",
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        border:
          `1px solid ${
            achieved ||
            next
              ? visual
                  ?.border ??
                "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.075)"
          }`,
        borderRadius:
          "50%",
        background:
          achieved ||
          next
            ? `
              radial-gradient(
                circle at 35% 25%,
                ${
                  visual
                    ?.soft ??
                  "rgba(255,255,255,0.05)"
                },
                rgba(15,11,7,0.92) 72%
              )
            `
            : "rgba(255,255,255,0.018)",
        boxShadow:
          achieved
            ? `0 0 22px ${
                visual
                  ?.glow ??
                "transparent"
              }`
            : next
              ? `0 0 18px ${
                  visual
                    ?.glow ??
                  "transparent"
                }, inset 0 0 0 4px rgba(255,255,255,0.018)`
              : "none",
        color,
        opacity:
          achieved
            ? 1
            : next
              ? 0.88
              : 0.32,
        filter:
          achieved ||
          next
            ? "none"
            : "grayscale(0.85)",
        transition:
          "all 180ms ease",
      }}
    >
      <svg
        width={
          next
            ? 38
            : 34
        }
        height={
          next
            ? 38
            : 34
        }
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14 4h8l4 13-8 4-4-17Z"
          fill="currentColor"
          opacity="0.52"
        />

        <path
          d="M34 4h-8l-4 13 8 4 4-17Z"
          fill="currentColor"
          opacity="0.72"
        />

        <circle
          cx="24"
          cy="29"
          r="13"
          fill="rgba(12,9,6,0.90)"
          stroke="currentColor"
          strokeWidth="2.2"
        />

        <circle
          cx="24"
          cy="29"
          r="9"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.50"
        />

        {medal ===
          "cloth" && (
          <>
            <circle
              cx="24"
              cy="29"
              r="6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />

            <path
              d="M20 29h8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        )}

        {medal ===
          "wood" && (
          <>
            <path
              d="M19 27c3-3 7-3 10 0"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            <path
              d="M20 31c2 2 6 2 8 0"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </>
        )}

        {(medal ===
          "bronze" ||
          medal ===
            "silver" ||
          medal ===
            "gold") && (
          <path
            d="m24 22 2.1 4.2 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L24 22Z"
            fill="currentColor"
          />
        )}

        {medal ===
          "diamond" && (
          <path
            d="m24 21 6 5-6 10-6-10 6-5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        )}

        {medal ===
          "master" && (
          <>
            <path
              d="m18.5 31 1-7 4.5 3 4.5-3 1 7h-11Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            <path
              d="M19 33h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function JourneyRow({
  journey,
}: {
  journey:
    AchievementJourney;
}) {
  const earnedLevel =
    journey.earned
      ?.level ?? 0;

  const finished =
    journey.next ===
      null &&
    earnedLevel > 0;

  const previousTarget =
    journey.earned
      ?.target ?? 0;

  const stageRange =
    journey.next
      ? Math.max(
          1,
          journey.next
            .target -
            previousTarget
        )
      : 1;

  const stageValue =
    journey.next
      ? Math.max(
          0,
          journey.progressCurrent -
            previousTarget
        )
      : stageRange;

  const stagePercentage =
    finished
      ? 100
      : Math.min(
          100,
          Math.round(
            (stageValue /
              stageRange) *
              100
          )
        );

  const lastMedal =
    journey.earned
      ?.medal ??
    journey.next
      ?.medal ??
    null;

  const currentVisual =
    lastMedal
      ? MEDAL_VISUALS[
          lastMedal
        ]
      : null;

  const seriesAccent =
    SERIES_ACCENTS[
      journey.series
    ];

  const lineProgress =
    journey.levels
      .length <= 1
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((Math.max(
              earnedLevel,
              1
            ) -
              1) /
              (journey
                .levels
                .length -
                1)) *
              100
          )
        );

  const trackMinWidth =
    Math.max(
      650,
      journey.levels
        .length * 108
    );

  return (
    <article
      style={{
        overflow:
          "hidden",
        padding:
          "18px",
        border:
          `1px solid ${
            currentVisual
              ?.border ??
            "rgba(255,255,255,0.075)"
          }`,
        borderRadius:
          "16px",
        background: `
          radial-gradient(
            circle at 100% 0%,
            ${
              currentVisual
                ?.soft ??
              "rgba(255,255,255,0.025)"
            },
            transparent 17rem
          ),
          linear-gradient(
            145deg,
            ${seriesAccent}0F,
            transparent 60%
          ),
          rgba(19,13,8,0.38)
        `,
        boxShadow:
          journey.earned
            ? `0 0 22px ${
                currentVisual
                  ?.glow ??
                "transparent"
              }, inset 0 1px 0 rgba(255,245,220,0.035)`
            : "inset 0 1px 0 rgba(255,255,255,0.025)",
      }}
    >
      <div
        className="
          grid
          grid-cols-1
          gap-4
          lg:grid-cols-[230px_minmax(0,1fr)]
        "
      >
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            justifyContent:
              "space-between",
            gap:
              "16px",
          }}
        >
          <div>
            <div
              style={{
                color:
                  seriesAccent,
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
              Medailová cesta
            </div>

            <div
              style={{
                marginTop:
                  "5px",
                color:
                  "var(--taste-text)",
                fontSize:
                  "18px",
                lineHeight:
                  1.12,
                fontWeight:
                  900,
                letterSpacing:
                  "-0.03em",
              }}
            >
              {
                journey.seriesName
              }
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  currentVisual
                    ?.color ??
                  "var(--taste-text-muted)",
                fontSize:
                  "11px",
                fontWeight:
                  800,
              }}
            >
              {journey.earned
                ?.medalName ??
                "Zatím bez medaile"}
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
              }}
            >
              <span
                style={{
                  color:
                    "var(--taste-text)",
                  fontSize:
                    "29px",
                  lineHeight:
                    1,
                  fontWeight:
                    950,
                  letterSpacing:
                    "-0.05em",
                }}
              >
                {
                  journey.current
                }
              </span>

              <span
                style={{
                  color:
                    "var(--taste-text-muted)",
                  fontSize:
                    "9px",
                }}
              >
                {
                  journey.unit
                }
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "7px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "9px",
                lineHeight:
                  1.4,
              }}
            >
              {finished
                ? "Nejvyšší úroveň dosažena"
                : journey.next
                  ? `Další meta: ${journey.next.target}`
                  : "Bez další mety"}
            </div>
          </div>
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              overflowX:
                "auto",
              paddingBottom:
                "5px",
            }}
          >
            <div
              style={{
                position:
                  "relative",
                minWidth:
                  `${trackMinWidth}px`,
                padding:
                  "7px 14px 4px",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  top:
                    "35px",
                  left:
                    "7%",
                  right:
                    "7%",
                  height:
                    "3px",
                  borderRadius:
                    "999px",
                  background:
                    "rgba(255,255,255,0.055)",
                }}
              >
                <div
                  style={{
                    width:
                      `${lineProgress}%`,
                    height:
                      "100%",
                    borderRadius:
                      "999px",
                    background:
                      journey.earned
                        ? `linear-gradient(90deg, #b87338, ${
                            currentVisual
                              ?.color ??
                            seriesAccent
                          })`
                        : "transparent",
                    boxShadow:
                      journey.earned
                        ? `0 0 10px ${
                            currentVisual
                              ?.glow ??
                            "transparent"
                          }`
                        : "none",
                  }}
                />
              </div>

              <div
                style={{
                  position:
                    "relative",
                  zIndex:
                    1,
                  display:
                    "grid",
                  gridTemplateColumns:
                    `repeat(${journey.levels.length}, minmax(92px, 1fr))`,
                  gap:
                    "8px",
                }}
              >
                {journey.levels.map(
                  (
                    level,
                    index
                  ) => {
                    const levelNumber =
                      level.level ??
                      index +
                        1;

                    const achieved =
                      levelNumber <=
                      earnedLevel;

                    const isNext =
                      journey.next
                        ?.key ===
                      level.key;

                    const visual =
                      level.medal
                        ? MEDAL_VISUALS[
                            level
                              .medal
                          ]
                        : null;

                    return (
                      <div
                        key={
                          level.key
                        }
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          textAlign:
                            "center",
                        }}
                      >
                        <MedalIcon
                          medal={
                            level.medal
                          }
                          achieved={
                            achieved
                          }
                          next={
                            isNext
                          }
                        />

                        <div
                          style={{
                            marginTop:
                              "8px",
                            color:
                              achieved ||
                              isNext
                                ? visual
                                    ?.color ??
                                  "var(--taste-text)"
                                : "rgba(255,255,255,0.34)",
                            fontSize:
                              "9px",
                            lineHeight:
                              1.15,
                            fontWeight:
                              achieved
                                ? 850
                                : 700,
                          }}
                        >
                          {shortMedalName(
                            level.medalName
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            color:
                              achieved
                                ? "var(--taste-text)"
                                : "var(--taste-text-muted)",
                            fontSize:
                              "11px",
                            fontWeight:
                              900,
                          }}
                        >
                          {
                            level.target
                          }
                        </div>

                        {isNext && (
                          <div
                            style={{
                              marginTop:
                                "5px",
                              padding:
                                "3px 6px",
                              border:
                                `1px solid ${
                                  visual
                                    ?.border ??
                                  "rgba(255,255,255,0.1)"
                                }`,
                              borderRadius:
                                "999px",
                              color:
                                visual
                                  ?.color ??
                                "var(--taste-text)",
                              fontSize:
                                "7px",
                              fontWeight:
                                900,
                              letterSpacing:
                                "0.06em",
                              textTransform:
                                "uppercase",
                              background:
                                visual
                                  ?.soft ??
                                "rgba(255,255,255,0.03)",
                            }}
                          >
                            další
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop:
                "13px",
              paddingTop:
                "12px",
              borderTop:
                "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap:
                  "12px",
                marginBottom:
                  "7px",
                fontSize:
                  "9px",
              }}
            >
              <span
                style={{
                  color:
                    finished
                      ? currentVisual
                          ?.color ??
                        seriesAccent
                      : "var(--taste-text-muted)",
                  fontWeight:
                    finished
                      ? 850
                      : 650,
                }}
              >
                {finished
                  ? "Cesta dokončena"
                  : journey.next
                    ? `${journey.progressCurrent} / ${journey.next.target}`
                    : "Hotovo"}
              </span>

              <span
                style={{
                  color:
                    journey.next
                      ?.medal &&
                    MEDAL_VISUALS[
                      journey.next
                        .medal
                    ]
                      ? MEDAL_VISUALS[
                          journey.next
                            .medal!
                        ].color
                      : "var(--taste-text-muted)",
                  fontWeight:
                    750,
                }}
              >
                {finished
                  ? "Mistr"
                  : journey.next
                      ?.medalName ??
                    ""}
              </span>
            </div>

            <div
              style={{
                height:
                  "6px",
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
                    `${stagePercentage}%`,
                  height:
                    "100%",
                  borderRadius:
                    "999px",
                  background:
                    currentVisual
                      ?.color ??
                    seriesAccent,
                  opacity:
                    journey.earned
                      ? 1
                      : 0.70,
                  boxShadow:
                    `0 0 12px ${
                      currentVisual
                        ?.glow ??
                      `${seriesAccent}44`
                    }`,
                }}
              />
            </div>

            {!finished &&
              journey.next && (
                <div
                  style={{
                    marginTop:
                      "7px",
                    color:
                      "var(--taste-text-muted)",
                    fontSize:
                      "9px",
                  }}
                >
                  Ještě{" "}
                  {Math.max(
                    0,
                    journey.next
                      .target -
                      journey
                        .progressCurrent
                  )}{" "}
                  do další medaile
                </div>
              )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ProfileAchievementJourneys({
  series,
  earnedSeriesCount,
}: ProfileAchievementJourneysProps) {
  const earnedMedalCount =
    series.reduce(
      (
        total,
        journey
      ) =>
        total +
        (journey.earned
          ?.level ??
          0),
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
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-end",
          gap:
            "16px",
          marginBottom:
            "14px",
        }}
      >
        <div>
          <div
            className="taste-label"
            style={{
              marginBottom:
                "5px",
            }}
          >
            Achievementy
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
            Medailové cesty
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
            Postup od prvních
            met až k mistrovským
            úrovním napříč
            pivními objevy.
          </p>
        </div>

        <div
          style={{
            display:
              "flex",
            gap:
              "8px",
            flexWrap:
              "wrap",
            justifyContent:
              "flex-end",
          }}
        >
          <div
            style={{
              minWidth:
                "88px",
              padding:
                "10px 12px",
              border:
                "1px solid rgba(242,182,63,0.36)",
              borderRadius:
                "12px",
              background:
                "rgba(242,182,63,0.075)",
              textAlign:
                "right",
            }}
          >
            <div
              style={{
                color:
                  "#f2b63f",
                fontSize:
                  "20px",
                lineHeight:
                  1,
                fontWeight:
                  900,
              }}
            >
              {
                earnedSeriesCount
              }
              /
              {series.length}
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "8px",
                letterSpacing:
                  "0.055em",
                textTransform:
                  "uppercase",
              }}
            >
              cest s medailí
            </div>
          </div>

          <div
            style={{
              minWidth:
                "88px",
              padding:
                "10px 12px",
              border:
                "1px solid rgba(213,108,62,0.34)",
              borderRadius:
                "12px",
              background:
                "rgba(213,108,62,0.07)",
              textAlign:
                "right",
            }}
          >
            <div
              style={{
                color:
                  "#d56c3e",
                fontSize:
                  "20px",
                lineHeight:
                  1,
                fontWeight:
                  900,
              }}
            >
              {
                earnedMedalCount
              }
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "8px",
                letterSpacing:
                  "0.055em",
                textTransform:
                  "uppercase",
              }}
            >
              získaných medailí
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display:
            "grid",
          gap:
            "11px",
        }}
      >
        {series.map(
          (journey) => (
            <JourneyRow
              key={
                journey.series
              }
              journey={
                journey
              }
            />
          )
        )}
      </div>
    </section>
  );
}
