"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function BreweryBrandAddClient({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action(new FormData(event.currentTarget));
      setName("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Značku se nepodařilo přidat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="taste-brewery-brand-form" onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      <input name="brandName" aria-label="Název nové značky" placeholder="Název značky" required maxLength={120}
        value={name} onChange={(event) => setName(event.target.value)}
        style={{ minHeight: 36, padding: "6px 10px", border: "1px solid var(--taste-border)", borderRadius: 8, background: "var(--taste-surface)", color: "var(--taste-text)" }} />
      <button type="submit" disabled={busy} className="taste-button-primary taste-brewery-add-brand">{busy ? "Přidávám…" : "Přidat značku"}</button>
      {error && <span role="alert" style={{ width: "100%", color: "var(--taste-amber-bright)" }}>{error}</span>}
    </form>
  );
}
