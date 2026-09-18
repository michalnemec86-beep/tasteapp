import type { ReactNode } from "react";

import { getCountryHeroTheme } from "@/lib/country-flags";

type HeroStat = {
  icon: ReactNode;
  value: ReactNode;
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
  visualVariant?: HeroVisualVariant;
  visualText?: string;
  mobileCompact?: boolean;
  hideRightContent?: boolean;
  breweryLogoUrl?: string | null;
  breweryLogoAlt?: string;
};

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
  mobileCompact = false,
  hideRightContent = false,
  breweryLogoUrl,
  breweryLogoAlt = "Logo pivovaru",
}: PageHeroProps) {
  const hasRightContent =
    !hideRightContent &&
    (visualVariant === "beer" || visualVariant === "stats");

  const countryName = getCountryNameFromHeroTitle(title);
  const countryHeroTheme = getCountryHeroTheme(countryName);
  const hasCountryHero = Boolean(countryHeroTheme);

  const isBreweryDetailHero =
    eyebrow === "Detail pivovaru" &&
    imageUrl === "/images/heroes/catalog.jpg";

  const effectiveImageUrl = isBreweryDetailHero
    ? "/images/heroes/breweries.jpg"
    : imageUrl;


  const isBreweryHero =
    !hasCountryHero &&
    effectiveImageUrl === "/images/heroes/breweries.jpg";

  const usesContainedVisual = isBreweryHero || hasCountryHero;

  return (
    <section
      className={mobileCompact ? "taste-page-hero-mobile-compact" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: "16px",
        border: "1px solid rgba(239,177,62,0.34)",
        borderRadius: "18px",
        background: "var(--taste-surface)",
        boxShadow: `
          0 14px 38px rgba(0,0,0,0.32),
          inset 0 1px 0 rgba(255,225,172,0.045),
          0 0 28px rgba(231,166,47,0.04)
        `,
      }}
    >
      <div
        className="taste-page-hero-layout relative grid min-h-[188px] grid-cols-1 lg:grid-cols-[minmax(0,1.28fr)_minmax(250px,0.72fr)]"
        style={{ overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: usesContainedVisual
              ? "#160d07"
              : undefined,
            backgroundImage: effectiveImageUrl
                ? `url("${effectiveImageUrl}")`
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
            backgroundSize: isBreweryHero || hasCountryHero
              ? "auto 100%"
              : "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: isBreweryHero || hasCountryHero
              ? "right center"
              : imagePosition,
            transform: usesContainedVisual
              ? "none"
              : "scale(1.015)",
          }}
        />


        {hasCountryHero && countryHeroTheme && (
          <CountryBreweryVisual
            country={countryName ?? ""}
            flag={countryHeroTheme.flag}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: usesContainedVisual
              ? `
                  linear-gradient(
                    90deg,
                    rgba(18,10,6,1) 0%,
                    rgba(18,10,6,0.98) 34%,
                    rgba(18,10,6,0.82) 52%,
                    rgba(18,10,6,0.28) 72%,
                    rgba(14,8,5,0.08) 100%
                  )
                `
              : `
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

        {usesContainedVisual && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "44%",
              background: `
                linear-gradient(
                  90deg,
                  rgba(22,13,7,1) 0%,
                  rgba(22,13,7,0.78) 18%,
                  rgba(22,13,7,0.22) 38%,
                  rgba(22,13,7,0) 58%
                )
              `,
              pointerEvents: "none",
            }}
          />
        )}

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

        <div
          style={{
            position: "absolute",
            left: "34%",
            right: "8%",
            bottom: "-88px",
            height: "140px",
            background: "rgba(231,166,47,0.11)",
            filter: "blur(52px)",
            pointerEvents: "none",
          }}
        />

        {isBreweryDetailHero && breweryLogoUrl && (
          <BreweryLogoVisual src={breweryLogoUrl} alt={breweryLogoAlt} />
        )}

        <div className="taste-page-hero-copy relative z-[2] flex flex-col justify-center px-6 py-7 lg:px-8 lg:py-6">
          <div
            className="taste-label"
            style={{ marginBottom: "6px" }}
          >
            {eyebrow}
          </div>

          <h1
            className={
              isBreweryDetailHero
                ? "taste-page-hero-title taste-page-hero-brewery-title"
                : "taste-page-hero-title"
            }
            style={{
              maxWidth: "620px",
              margin: 0,
              color: "var(--taste-text)",
              fontSize: "clamp(29px, 3.3vw, 39px)",
              lineHeight: 1,
              fontWeight: 850,
              letterSpacing: "-0.04em",
              textShadow: "0 5px 24px rgba(0,0,0,0.45)",
            }}
          >
            {title}
          </h1>

          <p
            className="taste-page-hero-subtitle"
            style={{
              maxWidth: "560px",
              margin: "9px 0 0",
              color: "var(--taste-text-soft)",
              fontSize: "12px",
              lineHeight: 1.5,
              textShadow: "0 2px 12px rgba(0,0,0,0.55)",
            }}
          >
            {subtitle}
          </p>
        </div>

        {hasRightContent && (
          <div className="taste-page-hero-action-column relative z-[3] flex min-h-[82px] items-center justify-center px-6 pb-6 lg:min-h-0 lg:px-8 lg:py-5">
            {action ? (
              <div
                className="taste-page-hero-action"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {action}
              </div>
            ) : (
              <FallbackMark
                variant={visualVariant}
                text={visualText}
              />
            )}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div
          className="taste-page-hero-stats"
          style={{
            position: "relative",
            zIndex: 4,
            padding: "7px",
            borderTop: "1px solid rgba(231,166,47,0.17)",
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
              gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
              gap: "7px",
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="taste-hero-stat"
                style={{
                  minHeight: "58px",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "8px 11px",
                  border:
                    index === 0
                      ? "1px solid rgba(245,184,63,0.34)"
                      : "1px solid rgba(231,166,47,0.18)",
                  borderRadius: "11px",
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
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    border: `1px solid ${stat.accent ?? "#e7a62f"}33`,
                    background: `${stat.accent ?? "#e7a62f"}12`,
                    color: stat.accent ?? "var(--taste-amber-bright)",
                    boxShadow: `0 0 14px ${stat.accent ?? "#e7a62f"}18`,
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
                      fontSize: "19px",
                      lineHeight: 1,
                      fontWeight: 850,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {stat.value}
                  </div>

                  <div
                    style={{
                      marginTop: "3px",
                      color: "var(--taste-text-muted)",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.015em",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function getCountryNameFromHeroTitle(title: ReactNode) {
  if (typeof title !== "string") {
    return undefined;
  }

  const breweryPrefix = "Pivovary · ";
  const beerPrefix = "Piva podle země: ";

  if (title.startsWith(breweryPrefix)) {
    return title.slice(breweryPrefix.length).trim();
  }

  if (title.startsWith(beerPrefix)) {
    return title.slice(beerPrefix.length).trim();
  }

  return undefined;
}

function BreweryLogoVisual({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 3,
        top: "50%",
        right: "clamp(18px, 4vw, 58px)",
        width: "clamp(96px, 15vw, 170px)",
        height: "clamp(76px, 11vw, 124px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.48))",
        }}
      />
    </div>
  );
}

function CountryBreweryVisual({
  country,
  flag,
}: {
  country: string;
  flag: string;
}) {
  return (
    <div
      aria-label={`Vlajka státu – ${country}`}
      role="img"
      style={{
        position: "absolute",
        top: 0,
        right: "-1.5%",
        bottom: 0,
        width: "48%",
        minWidth: "190px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: "scale(1.3) rotate(-2deg)",
          opacity: 0.24,
          filter: "saturate(0.96) contrast(1.04)",
          fontSize: "clamp(160px, 22vw, 285px)",
          lineHeight: 1,
          textShadow: "0 18px 38px rgba(0,0,0,0.24)",
          userSelect: "none",
        }}
      >
        {flag || "🍺"}
      </div>
    </div>
  );
}

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
      : text || "🍺";

  return (
    <div
      style={{
        width: "82px",
        height: "82px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(245,184,63,0.26)",
        borderRadius: "23px",
        background: "rgba(231,166,47,0.08)",
        color: "var(--taste-amber-bright)",
        fontSize: "34px",
        fontWeight: 850,
        boxShadow: "0 0 30px rgba(231,166,47,0.10)",
      }}
    >
      {icon}
    </div>
  );
}
