"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

// ==================================================
// NAVIGACE
// ==================================================

export default function AppNav() {
  const pathname =
    usePathname();

  if (
    pathname.startsWith(
      "/auth"
    )
  ) {
    return null;
  }

  function isActive(
    href: string
  ) {
    if (href === "/") {
      return (
        pathname === "/"
      );
    }

    return pathname.startsWith(
      href
    );
  }

  return (
    <nav
      style={{
        position:
          "sticky",

        top:
          0,

        zIndex:
          100,

        borderBottom:
          "1px solid rgba(231,166,47,0.30)",

        background:
          "linear-gradient(180deg, rgba(30,18,10,0.97), rgba(18,11,7,0.95))",

        backdropFilter:
          "blur(22px)",

        WebkitBackdropFilter:
          "blur(22px)",

        boxShadow:
          `
            0 10px 35px
            rgba(0,0,0,0.30),

            0 1px 0
            rgba(245,184,63,0.05),

            0 8px 35px
            rgba(231,166,47,0.035)
          `,
      }}
    >
      {/* HORNÍ JANTAROVÝ ODLESK */}

      <div
        style={{
          position:
            "absolute",

          left:
            "8%",

          right:
            "8%",

          top:
            0,

          height:
            "1px",

          pointerEvents:
            "none",

          background:
            "linear-gradient(90deg, transparent, rgba(245,184,63,0.52), transparent)",

          opacity:
            0.75,
        }}
      />

      <div
        style={{
          maxWidth:
            "1500px",

          margin:
            "0 auto",

          minHeight:
            "68px",

          padding:
            "0 24px",

          display:
            "flex",

          alignItems:
            "center",

          gap:
            "28px",
        }}
      >
        {/* ==================================================
            LOGO
        ================================================== */}

        <Link
          href="/"
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "11px",

            flexShrink:
              0,

            color:
              "var(--taste-text)",

            textDecoration:
              "none",
          }}
        >
          <div
            style={{
              width:
                "39px",

              height:
                "39px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              flexShrink:
                0,

              borderRadius:
                "11px",

              border:
                "1px solid rgba(245,184,63,0.40)",

              background:
                `
                  radial-gradient(
                    circle at 35% 22%,
                    rgba(255,209,112,0.20),
                    transparent 55%
                  ),
                  linear-gradient(
                    145deg,
                    rgba(231,166,47,0.14),
                    rgba(168,98,33,0.05)
                  )
                `,

              color:
                "var(--taste-amber-bright)",

              boxShadow:
                `
                  inset 0 1px 0
                  rgba(255,235,192,0.07),

                  0 0 20px
                  rgba(231,166,47,0.08)
                `,
            }}
          >
            <HopLogo />
          </div>

          <div>
            <div
              style={{
                display:
                  "flex",

                alignItems:
                  "baseline",

                fontSize:
                  "18px",

                lineHeight:
                  1,

                fontWeight:
                  850,

                letterSpacing:
                  "-0.025em",
              }}
            >
              Taste
              <span
                style={{
                  color:
                    "var(--taste-amber-bright)",
                }}
              >
                App
              </span>
            </div>

            <div
              style={{
                marginTop:
                  "4px",

                color:
                  "var(--taste-text-muted)",

                fontSize:
                  "8px",

                lineHeight:
                  1,

                fontWeight:
                  750,

                letterSpacing:
                  "0.15em",

                textTransform:
                  "uppercase",
              }}
            >
              Beer journal
            </div>
          </div>
        </Link>

        {/* ==================================================
            HLAVNÍ ODKAZY
        ================================================== */}

        <div
          style={{
            flex:
              1,

            minWidth:
              0,

            display:
              "flex",

            alignItems:
              "center",

            gap:
              "2px",

            overflowX:
              "auto",

            scrollbarWidth:
              "none",

            padding:
              "10px 0",
          }}
        >
          <NavLink
            href="/"
            active={
              isActive("/")
            }
          >
            Timeline
          </NavLink>

          <NavLink
            href="/stats"
            active={
              isActive(
                "/stats"
              )
            }
          >
            Statistiky
          </NavLink>

          <NavLink
            href="/beers"
            active={
              isActive(
                "/beers"
              )
            }
          >
            Katalog piv
          </NavLink>

          <NavLink
            href="/profiles"
            active={
              isActive(
                "/profiles"
              )
            }
          >
            Uživatelé
          </NavLink>
        </div>

        {/* ==================================================
            PROFIL
        ================================================== */}

        <Link
          href="/me"
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            gap:
              "8px",

            flexShrink:
              0,

            padding:
              "9px 13px",

            border:
              pathname ===
              "/me"
                ? "1px solid rgba(245,184,63,0.52)"
                : "1px solid rgba(231,166,47,0.28)",

            borderRadius:
              "10px",

            background:
              pathname ===
              "/me"
                ? "linear-gradient(180deg, rgba(231,166,47,0.18), rgba(168,98,33,0.08))"
                : "rgba(231,166,47,0.035)",

            color:
              pathname ===
              "/me"
                ? "var(--taste-amber-bright)"
                : "var(--taste-text-soft)",

            textDecoration:
              "none",

            fontSize:
              "12px",

            fontWeight:
              700,

            boxShadow:
              pathname ===
              "/me"
                ? "0 0 18px rgba(231,166,47,0.08)"
                : "none",
          }}
        >
          <span
            style={{
              width:
                "24px",

              height:
                "24px",

              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              borderRadius:
                "8px",

              background:
                "rgba(231,166,47,0.09)",

              color:
                "var(--taste-amber-bright)",
            }}
          >
            ●
          </span>

          <span>
            Můj profil
          </span>
        </Link>
      </div>
    </nav>
  );
}

// ==================================================
// NAV ODKAZ
// ==================================================

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        position:
          "relative",

        display:
          "inline-flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        flexShrink:
          0,

        minHeight:
          "42px",

        padding:
          "10px 13px",

        color:
          active
            ? "var(--taste-gold)"
            : "var(--taste-text-muted)",

        background:
          active
            ? "linear-gradient(180deg, rgba(231,166,47,0.065), transparent)"
            : "transparent",

        textDecoration:
          "none",

        fontSize:
          "12px",

        fontWeight:
          active
            ? 750
            : 550,

        whiteSpace:
          "nowrap",
      }}
    >
      {children}

      {active && (
        <>
          <span
            style={{
              position:
                "absolute",

              left:
                "13px",

              right:
                "13px",

              bottom:
                "2px",

              height:
                "2px",

              borderRadius:
                "999px",

              background:
                "linear-gradient(90deg, var(--taste-amber-soft), var(--taste-amber-bright))",

              boxShadow:
                "0 0 15px rgba(245,184,63,0.52)",
            }}
          />

          <span
            style={{
              position:
                "absolute",

              left:
                "24%",

              right:
                "24%",

              bottom:
                "-6px",

              height:
                "10px",

              pointerEvents:
                "none",

              background:
                "rgba(231,166,47,0.11)",

              filter:
                "blur(8px)",
            }}
          />
        </>
      )}
    </Link>
  );
}

// ==================================================
// JEDNODUCHÉ LOGO CHMELE
// ==================================================

function HopLogo() {
  return (
    <svg
      width="23"
      height="27"
      viewBox="0 0 23 27"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.5 2.2C9.7 4.2 8.6 6.1 8.4 8.1C9.5 7.7 10.5 7.1 11.5 6.1C12.5 7.1 13.5 7.7 14.6 8.1C14.4 6.1 13.3 4.2 11.5 2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M8.6 7.1C5.8 7.6 4 8.9 3.3 11.2C5.5 11.3 7.2 11.9 8.5 13.1C9.1 11.2 9.1 9.2 8.6 7.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M14.4 7.1C17.2 7.6 19 8.9 19.7 11.2C17.5 11.3 15.8 11.9 14.5 13.1C13.9 11.2 13.9 9.2 14.4 7.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M8.5 12C5.7 12.6 4 14 3.7 16.4C6 16.3 7.9 16.8 9.3 17.9C9.6 15.9 9.3 13.9 8.5 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M14.5 12C17.3 12.6 19 14 19.3 16.4C17 16.3 15.1 16.8 13.7 17.9C13.4 15.9 13.7 13.9 14.5 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M9.2 17C7.1 18.2 6.2 19.8 6.5 21.9C8.5 21.4 10.2 21.5 11.5 22.4C10.9 20.3 10.1 18.5 9.2 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M13.8 17C15.9 18.2 16.8 19.8 16.5 21.9C14.5 21.4 12.8 21.5 11.5 22.4C12.1 20.3 12.9 18.5 13.8 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M11.5 6.2V24.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}