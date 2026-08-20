import type {
  ReactNode,
} from "react";

type HeroStat = {
  icon: ReactNode;
  value: number | string;
  label: string;
  accent?: string;
};

type HeroVisualVariant =
  | "beer"
  | "stats"
  | "catalog"
  | "profile";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  action?: ReactNode;
  stats?: HeroStat[];
  imageUrl?: string;
  imagePosition?: string;

  /*
   * Tyto dvě props necháváme kvůli
   * existujícím stránkám a fallbacku.
   */
  visualVariant?: HeroVisualVariant;
  visualText?: string;
};

// ==================================================
// PAGE HERO
//
// Geometrie inspirovaná původním návrhem:
// - nízký široký fotografický banner
// - kompaktní text vlevo
// - akce vpravo
// - úzký statistický pás
// ==================================================

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
  stats = [],
  imageUrl,
  imagePosition = "center",
  visualVariant = "beer",
  visualText,
}: PageHeroProps) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: "16px",
        border:
          "1px solid rgba(239,177,62,0.34)",
        borderRadius: "18px",
        background:
          "var(--taste-surface)",
        boxShadow: `
          0 14px 38px rgba(0,0,0,0.32),
          inset 0 1px 0 rgba(255,225,172,0.045),
          0 0 28px rgba(231,166,47,0.04)
        `,
      }}
    >
      {/* ==================================================
          FOTOGRAFICKÝ BANNER
      ================================================== */}

      <div
        className="
          relative
          grid
          min-h-[188px]
          grid-cols-1
          lg:grid-cols-[minmax(0,1.28fr)_minmax(250px,0.72fr)]
        "
        style={{
          overflow: "hidden",
        }}
      >
        {/* FOTO */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              imageUrl
                ? `url("${imageUrl}")`
                : `
                    radial-gradient(
                      circle at 72% 42%,
                      rgba(231,166,47,0.30),
                      transparent 20rem
                    ),
                    linear-gradient(
                      135deg,
                      #40220d,
                      #160d07
                    )
                  `,
            backgroundSize: "cover",
            backgroundPosition:
              imagePosition,
            transform: "scale(1.015)",
          }}
        />

        {/* LEVÝ TMAVÝ PŘECHOD */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                90deg,
                rgba(18,10,6,0.98) 0%,
                rgba(20,11,6,0.92) 25%,
                rgba(20,11,6,0.68) 47%,
                rgba(20,11,6,0.22) 72%,
                rgba(14,8,5,0.10) 100%
              )
            `,
            pointerEvents: "none",
          }}
        />

        {/* SPODNÍ PŘECHOD */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                180deg,
                rgba(10,6,4,0.02) 40%,
                rgba(10,6,4,0.31) 100%
              )
            `,
            pointerEvents: "none",
          }}
        />

        {/* JANTAROVÝ ODLESK */}

        <div
          style={{
            position: "absolute",
            left: "34%",
            right: "8%",
            bottom: "-88px",
            height: "140px",
            background:
              "rgba(231,166,47,0.11)",
            filter: "blur(52px)",
            pointerEvents: "none",
          }}
        />

        {/* ==================================================
            TEXT
        ================================================== */}

        <div
          className="
            relative
            z-[2]
            flex
            flex-col
            justify-center
            px-6
            py-7
            lg:px-8
            lg:py-6
          "
        >
          <div
            className="taste-label"
            style={{
              marginBottom: "6px",
            }}
          >
            {eyebrow}
          </div>

          <h1
            style={{
              maxWidth: "620px",
              margin: 0,
              color:
                "var(--taste-text)",
              fontSize:
                "clamp(29px, 3.3vw, 39px)",
              lineHeight: 1,
              fontWeight: 850,
              letterSpacing:
                "-0.04em",
              textShadow:
                "0 5px 24px rgba(0,0,0,0.45)",
            }}
          >
            {title}
          </h1>

          <p
            style={{
              maxWidth: "560px",
              margin:
                "9px 0 0",
              color:
                "var(--taste-text-soft)",
              fontSize: "12px",
              lineHeight: 1.5,
              textShadow:
                "0 2px 12px rgba(0,0,0,0.55)",
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* ==================================================
            PRAVÁ ČÁST
        ================================================== */}

        <div
          className="
            relative
            z-[3]
            flex
            min-h-[82px]
            items-center
            justify-center
            px-6
            pb-6
            lg:min-h-0
            lg:px-8
            lg:py-5
          "
        >
          {action ? (
            <div
              style={{
                width: "100%",
                maxWidth: "250px",
                display: "flex",
                justifyContent:
                  "center",
              }}
            >
              {action}
            </div>
          ) : (
            <FallbackMark
              variant={
                visualVariant
              }
              text={
                visualText
              }
            />
          )}
        </div>
      </div>

      {/* ==================================================
          STATISTIKY
      ================================================== */}

      {stats.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 4,
            padding: "7px",
            borderTop:
              "1px solid rgba(231,166,47,0.17)",
            background: `
              linear-gradient(
                180deg,
                rgba(44,26,13,0.96),
                rgba(24,15,9,0.98)
              )
            `,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(135px, 1fr))",
              gap: "7px",
            }}
          >
            {stats.map(
              (stat, index) => (
                <div
                  key={
                    stat.label
                  }
                  className="taste-hero-stat"
                  style={{
                    minHeight: "58px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    padding:
                      "8px 11px",
                    border:
                      index === 0
                        ? "1px solid rgba(245,184,63,0.34)"
                        : "1px solid rgba(231,166,47,0.18)",
                    borderRadius:
                      "11px",
                    background:
                      index === 0
                        ? `
                            linear-gradient(
                              145deg,
                              rgba(231,166,47,0.11),
                              rgba(168,98,33,0.04)
                            ),
                            rgba(23,14,8,0.80)
                          `
                        : `
                            linear-gradient(
                              145deg,
                              rgba(231,166,47,0.04),
                              transparent
                            ),
                            rgba(23,14,8,0.76)
                          `,
                    boxShadow:
                      index === 0
                        ? "0 0 18px rgba(231,166,47,0.05)"
                        : "inset 0 1px 0 rgba(255,225,170,0.02)",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius:
                        "8px",
                      border:
                        `1px solid ${stat.accent ?? "#e7a62f"}33`,
                      background:
                        `${stat.accent ?? "#e7a62f"}12`,
                      color:
                        stat.accent ??
                        "var(--taste-amber-bright)",
                      boxShadow:
                        `0 0 14px ${stat.accent ?? "#e7a62f"}18`,
                    }}
                  >
                    {stat.icon}
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          index === 0
                            ? "var(--taste-amber-bright)"
                            : "var(--taste-text)",
                        fontSize:
                          "19px",
                        lineHeight: 1,
                        fontWeight: 850,
                        letterSpacing:
                          "-0.03em",
                      }}
                    >
                      {stat.value}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "3px",
                        color:
                          "var(--taste-text-muted)",
                        fontSize:
                          "9px",
                        fontWeight: 600,
                        letterSpacing:
                          "0.015em",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ==================================================
// FALLBACK
// ==================================================

function FallbackMark({
  variant,
  text,
}: {
  variant: HeroVisualVariant;
  text?: string;
}) {
  const icon =
    variant === "stats"
      ? "▥"
      : variant === "catalog"
        ? "🍺"
        : variant === "profile"
          ? text || "●"
          : "🍺";

  return (
    <div
      style={{
        width: "82px",
        height: "82px",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        border:
          "1px solid rgba(245,184,63,0.26)",
        borderRadius: "23px",
        background:
          "rgba(231,166,47,0.08)",
        color:
          "var(--taste-amber-bright)",
        fontSize: "34px",
        fontWeight: 850,
        boxShadow:
          "0 0 30px rgba(231,166,47,0.10)",
      }}
    >
      {icon}
    </div>
  );
}