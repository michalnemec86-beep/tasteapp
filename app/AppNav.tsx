"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HopMark } from "@/components/brand/PivnikMark";
import { Settings } from "lucide-react";
import useNavigationNews from "./useNavigationNews";
import { getNewsHref } from "@/lib/navigation-news";
import { disablePush } from "@/lib/push-news-client";

export default function AppNav({
  currentUserId,
}: {
  currentUserId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { news, reopen } = useNavigationNews(currentUserId, pathname);
  const counts = news?.counts ?? { activity: 0, beers: 0, breweries: 0 };
  const hasNews = Object.values(counts).some(count => count > 0);
  function reopenSection(href: string) {
    setMobileOpen(false);
    reopen(href);
    if (pathname === href && !window.location.search) router.refresh();
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await disablePush().catch(() => undefined);
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

  if (!currentUserId) {
    return <nav className="taste-app-nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 20px", borderBottom: "1px solid var(--taste-border)", background: "var(--taste-bg)" }}>
      <BrandLink compact />
      <Link href="/auth/login" className="taste-profile-nav-link">Přihlásit se</Link>
    </nav>;
  }

  const isOwnProfilePath = Boolean(
    currentUserId && pathname === `/profiles/${currentUserId}`
  );

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/me") return pathname === "/" || pathname === "/me" || isOwnProfilePath;
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

        <div className="taste-nav-personal-shell">
          <Link
            href="/"
            className="taste-profile-nav-link taste-nav-personal-link"
            aria-current={isActive("/me") ? "page" : undefined}
          >
            <NavCaption title="Můj pivní deník" context="osobní záznamy" />
          </Link>
        </div>

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
          <NavLink href="/activity" active={isActive("/activity")} newsCount={counts.activity} onClick={() => reopenSection("/activity")}><NavCaption title="Aktivita v hospodě" context="aktuální dění" /></NavLink>
          <NavLink href="/stats" active={isActive("/stats")}><NavCaption title="Co a jak pijeme" context="Vše z Pivníku na jednom místě" /></NavLink>
          <NavLink href={getNewsHref("breweries", news)} active={isActive("/breweries")} newsCount={counts.breweries} onClick={() => reopenSection(getNewsHref("breweries", news))}><NavCaption title="Pivovary" context="přehled a statistiky" /></NavLink>
          <NavLink href={getNewsHref("beers", news)} active={isActive("/beers")} newsCount={counts.beers} onClick={() => reopenSection(getNewsHref("beers", news))}><NavCaption title="Pivní lístek" context="evidence piv" /></NavLink>
          <NavLink href="/places" active={isActive("/places")}><NavCaption title="Místa" context="naše hospody a fesťáky" /></NavLink>
          <NavLink href="/ratings" active={isActive("/ratings")}><NavCaption title="Hodnocení" /></NavLink>
          <NavLink href="/profiles" active={isActive("/profiles")}><NavCaption title="Štamgasti" /></NavLink>
        </div>

        <Link
          href="/settings"
          className="taste-settings-link"
          aria-label="Nastavení profilu"
          title="Nastavení profilu"
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <Settings size={19} aria-hidden="true" />
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
          <Link
            href="/settings"
            className="taste-settings-link"
            aria-label="Nastavení profilu"
            title="Nastavení profilu"
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <Settings size={20} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="taste-mobile-menu-button"
            aria-label={mobileOpen ? "Zavřít navigaci" : hasNews ? "Otevřít navigaci, máte novinky" : "Otevřít navigaci"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? "×" : "☰"}
            {hasNews && <span className="taste-nav-news-dot" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="taste-mobile-menu">
          <div className="taste-mobile-personal-group">
            <MobileNavLink href="/" active={isActive("/me")}>
              <NavCaption title="Můj pivní deník" context="osobní záznamy" />
            </MobileNavLink>
          </div>

          <div className="taste-mobile-main-group">
            <MobileNavLink href="/activity" active={isActive("/activity")} newsCount={counts.activity} onClick={() => reopenSection("/activity")}><NavCaption title="Aktivita v hospodě" context="aktuální dění" /></MobileNavLink>
            <MobileNavLink href="/stats" active={isActive("/stats")}><NavCaption title="Co a jak pijeme" context="Vše z Pivníku na jednom místě" /></MobileNavLink>
            <MobileNavLink href={getNewsHref("breweries", news)} active={isActive("/breweries")} newsCount={counts.breweries} onClick={() => reopenSection(getNewsHref("breweries", news))}><NavCaption title="Pivovary" context="přehled a statistiky" /></MobileNavLink>
            <MobileNavLink href={getNewsHref("beers", news)} active={isActive("/beers")} newsCount={counts.beers} onClick={() => reopenSection(getNewsHref("beers", news))}><NavCaption title="Pivní lístek" context="evidence piv" /></MobileNavLink>
            <MobileNavLink href="/places" active={isActive("/places")}><NavCaption title="Místa" context="naše hospody a fesťáky" /></MobileNavLink>
            <MobileNavLink href="/ratings" active={isActive("/ratings")}><NavCaption title="Hodnocení" /></MobileNavLink>
            <MobileNavLink href="/profiles" active={isActive("/profiles")}><NavCaption title="Štamgasti" /></MobileNavLink>
          </div>

          <div className="taste-mobile-utility-group">
            <MobileNavLink href="/settings" active={isActive("/settings")}>Nastavení</MobileNavLink>
          </div>
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
  newsCount,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  newsCount?: number;
  onClick?: () => void;
}) {
  return (
    <Link href={href} prefetch={newsCount === undefined ? undefined : false} onClick={onClick} className="taste-mobile-nav-link" data-active={active ? "true" : "false"}>
      <span className="taste-mobile-nav-label">{children}<NewsBadge count={newsCount} /></span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}

function NavLink({
  href,
  active,
  children,
  newsCount,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  newsCount?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={newsCount === undefined ? undefined : false}
      onClick={onClick}
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
      <NewsBadge count={newsCount} />
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

function NavCaption({ title, context }: { title: string; context?: string }) {
  return (
    <span className="taste-nav-caption">
      <span className="taste-nav-caption-title">{title}</span>
      {context && <span className="taste-nav-caption-context">({context})</span>}
    </span>
  );
}

function NewsBadge({ count = 0 }: { count?: number }) {
  if (count < 1) return null;
  return <span className="taste-nav-news-badge" aria-label={`${count} novinek`}>{count > 99 ? "99+" : count}</span>;
}
