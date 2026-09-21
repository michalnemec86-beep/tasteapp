"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminBadge from "@/components/ui/AdminBadge";

const ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

type Country = {
  id: number;
  name: string;
};

type Props = {
  countries: Country[];
  showQuickImport?: boolean;
  createBreweryAction: (formData: FormData) => Promise<void>;
};

export default function BreweryCreateModalClient({
  countries,
  createBreweryAction,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [brandNames, setBrandNames] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  async function prepareOpen() {
    setError("");
    setOpen(true);
    const supabase = createClient();
    const [brandsResult, userResult] = await Promise.all([
      supabase.from("brands").select("name").order("name"),
      supabase.auth.getUser(),
    ]);

    setBrandOptions((brandsResult.data ?? []).map((brand) => brand.name));
    setIsAdmin(userResult.data.user?.id === ADMIN_USER_ID);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, saving]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    try {
      await createBreweryAction(new FormData(form));
      form.reset();
      setBrandNames("");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Pivovar se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={prepareOpen}
        className="taste-button-primary"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "7px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}
      >
        <span aria-hidden="true" style={{ fontSize: "17px", lineHeight: 1 }}>+</span>
        Přidat pivovar
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-brewery-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !saving) setOpen(false);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", background: "rgba(5,4,3,.80)", backdropFilter: "blur(18px)" }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: "100%", maxWidth: "640px", maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--taste-border-strong)", borderRadius: "var(--taste-radius-lg)", background: "var(--taste-surface-raised)", color: "var(--taste-text)", boxShadow: "0 30px 90px rgba(0,0,0,.68)" }}
          >
            <div style={{ position: "relative", padding: "18px 20px 16px", borderBottom: "1px solid var(--taste-border)" }}>
              <div className="taste-label" style={{ marginBottom: "5px", fontSize: "9px" }}>Katalog pivovarů</div>
              <h2 id="new-brewery-title" style={{ margin: 0, fontSize: "22px" }}>Přidat pivovar</h2>
              <button type="button" aria-label="Zavřít" disabled={saving} onClick={() => setOpen(false)} style={{ position: "absolute", top: "15px", right: "16px", width: "34px", height: "34px", border: "1px solid var(--taste-border)", borderRadius: "9px", background: "transparent", color: "var(--taste-text-muted)", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {error && <div role="alert" style={errorStyle}>{error}</div>}

              <div style={gridStyle}>
                <Field label="Jméno" required><input name="name" required autoFocus style={inputStyle} /></Field>
                <Field label="Město"><input name="city" style={inputStyle} /></Field>
                <Field label="Stát" required>
                  <select name="country" required defaultValue="" style={inputStyle}>
                    <option value="" disabled>Vyber stát</option>
                    {countries.map((country) => <option key={country.id} value={country.name}>{country.name}</option>)}
                  </select>
                </Field>
                <Field label="Adresa"><input name="address" style={inputStyle} /></Field>
                <Field label="Web"><input name="website" placeholder="https://…" style={inputStyle} /></Field>
                <Field label="Značky">
                  <input name="brandNames" list="new-brewery-brands" value={brandNames} onChange={(event) => setBrandNames(event.target.value)} placeholder="Např. Kozel, Excelent" style={inputStyle} />
                  <datalist id="new-brewery-brands">{brandOptions.map((name) => <option key={name} value={name} />)}</datalist>
                </Field>
                <Field label="Rok založení"><input name="foundedYear" type="number" min="1000" max="2100" inputMode="numeric" style={inputStyle} /></Field>
                <Field label="Rok ukončení provozu"><input name="closedYear" type="number" min="1000" max="2100" inputMode="numeric" style={inputStyle} /></Field>

              </div>

              {isAdmin && (
                <section
                  style={{
                    marginTop: "16px",
                    padding: "14px",
                    border: "1px solid rgba(214,91,66,0.30)",
                    borderRadius: "12px",
                    background: "rgba(214,91,66,0.035)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div className="taste-label">Souřadnice pro mapu</div>
                    <AdminBadge />
                  </div>

                  <div style={gridStyle}>
                    <Field label="Zeměpisná šířka">
                      <input
                        name="latitude"
                        type="number"
                        min="-90"
                        max="90"
                        step="any"
                        inputMode="decimal"
                        placeholder="např. 49.8175"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Zeměpisná délka">
                      <input
                        name="longitude"
                        type="number"
                        min="-180"
                        max="180"
                        step="any"
                        inputMode="decimal"
                        placeholder="např. 14.4782"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </section>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: "9px", minHeight: "42px", marginTop: "4px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>
                <input name="isNomadic" type="checkbox" />
                <strong style={{ color: "var(--taste-text)" }}>Letající pivovar</strong>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--taste-border)" }}>
                <button type="button" onClick={() => setOpen(false)} disabled={saving} className="taste-button-secondary">Zrušit</button>
                <button type="submit" disabled={saving} className="taste-button-primary">{saving ? "Ukládám…" : "Přidat pivovar"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={{ color: "var(--taste-text-muted)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>
        {label}{required ? <span style={{ color: "var(--taste-amber-bright)" }}> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" } as const;
const inputStyle = { width: "100%", height: "40px", boxSizing: "border-box", padding: "0 11px", border: "1px solid var(--taste-border)", borderRadius: "9px", background: "var(--taste-surface)", color: "var(--taste-text)", fontSize: "12px", outline: "none" } as const;
const errorStyle = { marginBottom: "15px", padding: "10px 12px", border: "1px solid rgba(220,100,75,.35)", borderRadius: "9px", background: "rgba(220,100,75,.08)", color: "var(--taste-text)", fontSize: "12px" } as const;
