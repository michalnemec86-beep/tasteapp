import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AutoLogoFrame from "@/components/ui/AutoLogoFrame";
import AppIcon from "@/components/ui/AppIcon";
import {
  ACTIVITY_START_DATE,
  ACTIVITY_VIEW_CONFIG,
  activityItemDisplayName,
  activityItemFlag,
  activityItemHref,
  isActivityViewKey,
  parseActivityRecencyItems,
} from "@/lib/activity-recency";
import {
  createClient,
} from "@/lib/supabase/server";

function formatDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}. ${month}. ${year}`;
}

export default async function ActivityOverviewPage({
  params,
}: {
  params: Promise<{
    kind: string;
  }>;
}) {
  const {
    kind,
  } = await params;

  if (
    !isActivityViewKey(
      kind
    )
  ) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_activity_recency_list",
    {
      p_kind:
        kind,
      p_start_date:
        ACTIVITY_START_DATE,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const items =
    parseActivityRecencyItems(
      data
    );

  const config =
    ACTIVITY_VIEW_CONFIG[
      kind
    ];

  return (
    <main
      style={{
        maxWidth:
          "760px",
        margin:
          "0 auto",
        padding:
          "24px 18px 72px",
      }}
    >
      <Link
        href="/activity"
        className="taste-entity-link"
        style={{
          display:
            "inline-flex",
          marginBottom:
            "18px",
          fontSize:
            "11px",
          textDecoration:
            "none",
        }}
      >
        ← Aktivita v hospodě
      </Link>

      <section
        className="taste-card"
        style={{
          padding:
            "18px",
          border:
            `1px solid ${config.accent}40`,
          background:
            config.group ===
            "news"
              ? `
                radial-gradient(
                  circle at 90% 0%,
                  ${config.accent}24,
                  transparent 30%
                ),
                linear-gradient(
                  150deg,
                  rgba(73,42,22,.45),
                  rgba(22,17,13,.98) 65%
                )
              `
              : undefined,
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "11px",
          }}
        >
          <span
            style={{
              width:
                "38px",
              height:
                "38px",
              flexShrink:
                0,
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              border:
                `1px solid ${config.accent}40`,
              borderRadius:
                "11px",
              background:
                `${config.accent}13`,
              color:
                config.accent,
            }}
          >
            <AppIcon
              name={
                config.icon
              }
              size={21}
            />
          </span>

          <div>
            <div
              className="taste-label"
              style={{
                marginBottom:
                  "4px",
              }}
            >
              {config.group ===
              "news"
                ? "Novinky"
                : "Poslední dění"}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize:
                  "24px",
                lineHeight:
                  1.08,
                letterSpacing:
                  "-0.025em",
              }}
            >
              {config.title}
            </h1>
          </div>
        </div>

        <p
          style={{
            margin:
              "10px 0 0",
            color:
              "var(--taste-text-muted)",
            fontSize:
              "11px",
            lineHeight:
              1.5,
          }}
        >
          {config.subtitle}.
          Přehled je vedený
          od 1. 9. 2026.
        </p>

        <div
          style={{
            display:
              "grid",
            gap:
              "8px",
            marginTop:
              "18px",
          }}
        >
          {items.length ===
            0 && (
            <div
              style={{
                padding:
                  "18px 0 6px",
                color:
                  "var(--taste-text-muted)",
                fontSize:
                  "11px",
              }}
            >
              Zatím tu není
              žádná položka.
            </div>
          )}

          {items.map(
            (
              item,
              index
            ) => {
              const flag =
                activityItemFlag(
                  kind,
                  item
                );

              return (
                <Link
                  key={
                    item.id
                  }
                  href={activityItemHref(
                    kind,
                    item
                  )}
                  prefetch={
                    false
                  }
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "36px minmax(0,1fr) auto",
                    alignItems:
                      "center",
                    gap:
                      "10px",
                    minHeight:
                      "48px",
                    padding:
                      "7px 9px",
                    border:
                      index ===
                      0
                        ? `1px solid ${config.accent}35`
                        : "1px solid rgba(255,255,255,.055)",
                    borderRadius:
                      "10px",
                    background:
                      index ===
                      0
                        ? `${config.accent}0d`
                        : "rgba(255,255,255,.014)",
                    color:
                      "inherit",
                    textDecoration:
                      "none",
                  }}
                >
                  {item.logoUrl ? (
                    <AutoLogoFrame
                      src={
                        item.logoUrl
                      }
                      size={36}
                      padding={2}
                    />
                  ) : flag ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "36px",
                        height:
                          "36px",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          "1px solid rgba(255,255,255,.08)",
                        borderRadius:
                          "9px",
                        background:
                          "rgba(255,255,255,.025)",
                        fontSize:
                          "20px",
                      }}
                    >
                      {flag}
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        width:
                          "36px",
                        height:
                          "36px",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        border:
                          `1px solid ${config.accent}35`,
                        borderRadius:
                          "9px",
                        background:
                          `${config.accent}10`,
                        color:
                          config.accent,
                        fontSize:
                          "10px",
                        fontWeight:
                          850,
                      }}
                    >
                      {config.group ===
                      "news"
                        ? "NEW"
                        : index +
                          1}
                    </span>
                  )}

                  <span
                    style={{
                      minWidth:
                        0,
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        "var(--taste-text)",
                      fontSize:
                        "12px",
                      fontWeight:
                        index ===
                        0
                          ? 800
                          : 650,
                    }}
                  >
                    {activityItemDisplayName(
                      kind,
                      item
                    )}
                  </span>

                  <span
                    style={{
                      display:
                        "grid",
                      justifyItems:
                        "end",
                      gap:
                        "2px",
                    }}
                  >
                    {config.group ===
                      "recent" &&
                      item.count && (
                      <span
                        style={{
                          color:
                            item.count > 1
                              ? config.accent
                              : "var(--taste-text-muted)",
                          fontSize:
                            "9px",
                          fontWeight:
                            800,
                          fontVariantNumeric:
                            "tabular-nums",
                        }}
                      >
                        {item.count}×
                      </span>
                    )}

                    <time
                      dateTime={
                        item.date
                      }
                      style={{
                        color:
                          index ===
                          0
                            ? config.accent
                            : "var(--taste-text-muted)",
                        fontSize:
                          "10px",
                        fontWeight:
                          700,
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {formatDate(
                        item.date
                      )}
                    </time>
                  </span>
                </Link>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}
