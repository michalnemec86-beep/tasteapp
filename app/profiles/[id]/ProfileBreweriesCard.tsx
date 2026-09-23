import Link from "next/link";

import type {
  RankingItem,
} from "@/lib/stats";

type ProfileBreweriesCardProps = {
  items: RankingItem[];
  profileId: string;
  limit?: number;
};

const tones = [
  {
    accent: "#f2b63f",
    border:
      "rgba(242,182,63,0.45)",
    wash:
      "rgba(242,182,63,0.14)",
  },
  {
    accent: "#e88835",
    border:
      "rgba(232,136,53,0.43)",
    wash:
      "rgba(232,136,53,0.13)",
  },
  {
    accent: "#cf6540",
    border:
      "rgba(207,101,64,0.42)",
    wash:
      "rgba(207,101,64,0.12)",
  },
  {
    accent: "#b87935",
    border:
      "rgba(184,121,53,0.40)",
    wash:
      "rgba(184,121,53,0.11)",
  },
];

export default function ProfileBreweriesCard({
  items,
  profileId,
  limit = 8,
}: ProfileBreweriesCardProps) {
  const visibleItems =
    items.slice(0, limit);

  const winner =
    visibleItems[0] ?? null;

  const maxCount =
    winner?.count ?? 1;


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
          Pivovarské preference
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
          Oblíbené pivovary
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
          Pivovary seřazené
          podle počtu piv,
          která se v tomto
          profilu objevila.
        </p>
      </div>

      {winner ? (
        <article
          style={{
            display: "grid",
            gap: "10px",
            padding: "20px",
            border: "1px solid rgba(225,126,48,0.40)",
            borderRadius: "var(--taste-radius-lg)",
            background: "var(--taste-surface)",
            boxShadow: "inset 0 1px 0 rgba(255,235,200,0.035)",
          }}
        >
            {visibleItems.map(
              (
                item,
                index
              ) => {
                const tone =
                  tones[
                    index %
                      tones.length
                  ];

                const ratio =
                  maxCount > 0
                    ? item.count /
                      maxCount
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
                          transparent 74%
                        ),
                        rgba(18,12,8,0.30)
                      `,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "26px minmax(0,1fr) auto",
                        alignItems:
                          "center",
                        gap:
                          "9px",
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
                          textAlign:
                            "center",
                        }}
                      >
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <Link
                        href={`/stats?user=${profileId}&locked=1&brewery=${item.id}`}
                        style={{
                          overflow:
                            "hidden",
                          color:
                            "var(--taste-text)",
                          fontSize:
                            "12px",
                          fontWeight:
                            780,
                          textDecoration:
                            "none",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {item.name}
                      </Link>

                      <div
                        style={{
                          color:
                            tone.accent,
                          fontSize:
                            "12px",
                          fontWeight:
                            850,
                        }}
                      >
                        {item.count}×
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
                            `linear-gradient(90deg, ${tone.accent}, ${tone.accent}99)`,
                          boxShadow:
                            `0 0 12px ${tone.accent}44`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
        </article>
      ) : (
        <div
          className="taste-card"
          style={{
            padding:
              "32px",
            color:
              "var(--taste-text-muted)",
            fontSize:
              "12px",
            textAlign:
              "center",
          }}
        >
          Zatím bez dat
        </div>
      )}
    </section>
  );
}
