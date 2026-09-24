"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CatalogConfirmButton({
  beerId,
  isCatalog,
  confirmAction,
}: {
  beerId: number;
  isCatalog: boolean;
  confirmAction: (beerId: number) => Promise<{ success: boolean }>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (isCatalog) {
    return (
      <span
        title="Potvrzené katalogové pivo."
        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 9px", border: "1px solid rgba(231,166,47,.38)", borderRadius: "999px", background: "rgba(231,166,47,.10)", color: "var(--taste-amber-bright)", fontSize: "9px", fontWeight: 850 }}
      >
        ✓ Katalogové
      </span>
    );
  }

  return (
    <div style={{ display: "grid", gap: "5px" }}>
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setError("");
          try {
            await confirmAction(beerId);
            router.refresh();
          } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : "Pivo se nepodařilo potvrdit.");
          } finally {
            setSaving(false);
          }
        }}
        className="taste-button-secondary"
        style={{ padding: "6px 9px", fontSize: "9px", fontWeight: 750, cursor: saving ? "wait" : "pointer" }}
      >
        {saving ? "Potvrzuji…" : "Potvrdit jako katalogové"}
      </button>
      {error && <span role="alert" style={{ color: "#e3765f", fontSize: "9px", lineHeight: 1.35 }}>{error}</span>}
    </div>
  );
}
