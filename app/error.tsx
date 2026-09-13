"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TasteApp page error:", error);
  }, [error]);

  return (
    <main
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "54px 24px 80px",
      }}
    >
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "32px",
          border: "1px solid rgba(145,176,72,0.28)",
          borderRadius: "var(--taste-radius-xl)",
          background: `
            radial-gradient(circle at 92% 10%, rgba(145,176,72,0.13), transparent 18rem),
            var(--taste-surface)
          `,
          boxShadow: "var(--taste-shadow-soft)",
        }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "18px",
            border: "1px solid rgba(145,176,72,0.32)",
            borderRadius: "13px",
            background: "rgba(145,176,72,0.09)",
            color: "#9fb84f",
            fontSize: "22px",
          }}
        >
          ↻
        </div>

        <div
          className="taste-label"
          style={{
            marginBottom: "7px",
            color: "#9fb84f",
          }}
        >
          TasteApp
        </div>

        <h1
          style={{
            margin: 0,
            color: "var(--taste-text)",
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
          }}
        >
          Stránku se nepodařilo načíst
        </h1>

        <p
          style={{
            maxWidth: "620px",
            margin: "12px 0 0",
            color: "var(--taste-text-soft)",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          Občas může některý z datových dotazů selhat nebo trvat déle.
          Nemusíš obnovovat celý prohlížeč, TasteApp může načtení zkusit znovu přímo.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "22px",
            padding: "11px 16px",
            border: "1px solid rgba(159,184,79,0.42)",
            borderRadius: "11px",
            background: "rgba(159,184,79,0.12)",
            color: "#b8c977",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Zkusit znovu
        </button>

        {error.digest && (
          <div
            style={{
              marginTop: "18px",
              color: "var(--taste-text-muted)",
              fontSize: "9px",
              opacity: 0.7,
            }}
          >
            Kód chyby: {error.digest}
          </div>
        )}
      </section>
    </main>
  );
}
