"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HopMark } from "@/components/brand/PivnikMark";

export default function AppNav({
  currentUserId,
}: {
  currentUserId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/auth/login");
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  if (pathname.startsWith("/auth")) {
    return null;
  }

  const isOwnProfilePath = Boolean(
    currentUserId && pathname === `/profiles/${currentUserId}`
  );

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/me") return pathname === "/me" || isOwnProfilePath;
    if (href === "/profiles") {
      return pathname.startsWith("/profiles") && !isOwnProfilePath;
    }

    return pathname.startsWith(href);
  }

  return (
    <nav
      className="taste-app-nav"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid rgba(231,166,47,0.30)",
        background:
          "linear-gradient(180deg, rgba(30,18,10,0.97), rgba(18,11,7,0.95))",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        boxShadow:
          "0 10px 35px rgba(0,0,0,0.30), 0 1px 0 rgba(245,184,63,0.05), 0 8px 35px rgba(231,166,47,0.035)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: 0,
          height: "1px",
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, transparent, rgba(245,184,63,0.52), transparent)",
          opacity: 0.75,
        }}
      />

      <div
        className="taste-nav-desktop"
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          minHeight: "68px",
          padding: "0 24px",
          alignItems: "center",
          gap: "28px",
        }}
      >
        <BrandLink />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "2px",
            overflowX: "auto",
            scrollbarWidth: "none",
            padding: "10px 0",
          }}
        >
          <NavLink href="/" active={isActive("/")}>Aktivita v hospodě</NavLink>
          <NavLink href="/stats" active={isActive("/stats")}>Co a jak pijeme</NavLink>
          <NavLink href="/beers" active={isActive("/beers")}>Pivní lístek</NavLink>
          <NavLink href="/breweries" active={isActive("/breweries")}>Pivovary</NavLink>
          <NavLink href="/profiles" active={isActive("/profiles")}>Štamgasti</NavLink>
        </div>

        <Link
          href="/me"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            flexShrink: 0,
            padding: "9px 13px",
            border:
              isActive("/me")
                ? "1px solid rgba(245,184,63,0.52)"
                : "1px solid rgba(231,166,47,0.28)",
            borderRadius: "10px",
            background:
              isActive("/me")
                ? "linear-gradient(180deg, rgba(231,166,47,0.18), rgba(168,98,33,0.08))"
                : "rgba(231,166,47,0.035)",
            color:
              isActive("/me")
                ? "var(--taste-amber-bright)"
                : "var(--taste-text-soft)",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Můj pivní deník
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            flexShrink: 0,
            padding: "9px 11px",
            border: "1px solid rgba(231,166,47,0.18)",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--taste-text-muted)",
            fontSize: "11px",
            fontWeight: 650,
            cursor: "pointer",
          }}
        >
          Odhlásit
        </button>
      </div>

      <div className="taste-nav-mobile">
        <div className="taste-mobile-brand-group">
          {pathname !== "/" && (
            <button
              type="button"
              className="taste-mobile-back-button"
              aria-label="Zpět"
              title="Zpět"
              onClick={handleBack}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <BrandLink compact />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/me" className="taste-mobile-profile">
            <span className="taste-mobile-profile-full">Můj pivní deník</span>
            <span className="taste-mobile-profile-compact">Deník</span>
          </Link>
          <button
            type="button"
            className="taste-mobile-menu-button"
            aria-label={mobileOpen ? "Zavřít navigaci" : "Otevřít navigaci"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? "×" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="taste-mobile-menu">
          <MobileNavLink href="/" active={isActive("/")}>Aktivita v hospodě</MobileNavLink>
          <MobileNavLink href="/stats" active={isActive("/stats")}>Co a jak pijeme</MobileNavLink>
          <MobileNavLink href="/beers" active={isActive("/beers")}>Pivní lístek</MobileNavLink>
          <MobileNavLink href="/breweries" active={isActive("/breweries")}>Pivovary</MobileNavLink>
          <MobileNavLink href="/profiles" active={isActive("/profiles")}>Štamgasti</MobileNavLink>
          <MobileNavLink href="/me" active={isActive("/me")}>Můj pivní deník</MobileNavLink>
          <button type="button" onClick={handleLogout} className="taste-mobile-menu-logout">
            Odhlásit
          </button>
        </div>
      )}
    </nav>
  );
}

function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? "9px" : "11px",
        flexShrink: 0,
        color: "var(--taste-text)",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: compact ? "35px" : "39px",
          height: compact ? "35px" : "39px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: "11px",
          border: "1px solid rgba(245,184,63,0.40)",
          background:
            "radial-gradient(circle at 35% 22%, rgba(255,209,112,0.20), transparent 55%), linear-gradient(145deg, rgba(231,166,47,0.14), rgba(168,98,33,0.05))",
          color: "var(--taste-amber-bright)",
          boxShadow:
            "inset 0 1px 0 rgba(255,235,192,0.07), 0 0 20px rgba(231,166,47,0.08)",
        }}
      >
        <HopMark />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: compact ? "17px" : "18px",
            lineHeight: 1,
            fontWeight: 850,
            letterSpacing: "-0.025em",
          }}
        >
          Piv<span style={{ color: "var(--taste-amber-bright)" }}>ník</span>
        </div>
        {!compact && (
          <div
            style={{
              marginTop: "4px",
              color: "var(--taste-text-muted)",
              fontSize: "8px",
              lineHeight: 1,
              fontWeight: 750,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Pivní deník
          </div>
        )}
      </div>
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="taste-mobile-nav-link" data-active={active ? "true" : "false"}>
      <span>{children}</span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        minHeight: "42px",
        padding: "10px 13px",
        color: active ? "var(--taste-gold)" : "var(--taste-text-muted)",
        background: active
          ? "linear-gradient(180deg, rgba(231,166,47,0.065), transparent)"
          : "transparent",
        textDecoration: "none",
        fontSize: "12px",
        fontWeight: active ? 750 : 550,
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {active && (
        <span
          style={{
            position: "absolute",
            left: "13px",
            right: "13px",
            bottom: "2px",
            height: "2px",
            borderRadius: "999px",
            background:
              "linear-gradient(90deg, var(--taste-amber-soft), var(--taste-amber-bright))",
            boxShadow: "0 0 15px rgba(245,184,63,0.52)",
          }}
        />
      )}
    </Link>
  );
}
