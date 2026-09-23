"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminBadge from "@/components/ui/AdminBadge";

type BreweryEditData = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  website: string | null;
  isNomadic: boolean;
  foundedYear: number | null;
  closedYear: number | null;
  latitude: number | null;
  longitude: number | null;
};

type BreweryEditModalClientProps = {
  brewery: BreweryEditData;
  updateBreweryAction: (
    breweryId: number,
    formData: FormData
  ) => Promise<void>;
  variant?: "subtle" | "primary";
  isAdmin?: boolean;
};

export default function BreweryEditModalClient({
  brewery,
  updateBreweryAction,
  variant = "subtle",
  isAdmin = false,
}: BreweryEditModalClientProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newBrandNames, setNewBrandNames] = useState("");
  const [linkedBrandNames, setLinkedBrandNames] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeModal() {
    if (saving) return;
    setError("");
    setOpen(false);
  }

  async function prepareOpen() {
    setError("");
    setNewBrandNames("");
    setOpen(true);

    const supabase = createClient();
    const [brandsResult, linkedResult] = await Promise.all([
      supabase.from("brands").select("name").order("name"),
      supabase
        .from("brewery_brands")
        .select("brands ( name )")
        .eq("brewery_id", brewery.id),
    ]);

    if (brandsResult.error || linkedResult.error) {
      setError(
        brandsResult.error?.message ||
          linkedResult.error?.message ||
          "Značky se nepodařilo načíst."
      );
      return;
    }

    setBrandOptions((brandsResult.data ?? []).map((brand) => brand.name));

    const linkedRows = (linkedResult.data ?? []) as unknown as Array<{
      brands: { name: string } | Array<{ name: string }> | null;
    }>;

    setLinkedBrandNames(
      linkedRows
        .map((row) =>
          Array.isArray(row.brands)
            ? row.brands[0]?.name
            : row.brands?.name
        )
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b, "cs", { sensitivity: "base" }))
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError("");

    try {
      await updateBreweryAction(brewery.id, formData);
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Pivovar se nepodařilo uložit."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={prepareOpen}
        title="Upravit pivovar"
        className={
          variant === "primary"
            ? "taste-button-primary"
            : "brewery-edit-trigger"
        }
        style={
          variant === "primary"
            ? {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }
            : {
                display: "inline-flex",
                alignItems: "center",
                padding: "1px 4px",
                border: 0,
                background: "transparent",
                color: "var(--taste-text-muted)",
                fontSize: "9px",
                fontWeight: 600,
                lineHeight: 1.2,
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: 0.65,
              }
        }
      >
        {variant === "primary" ? "Upravit pivovar" : "Upravit"}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-brewery-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
              background: "rgba(5, 4, 3, 0.80)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "640px",
                maxHeight: "88vh",
                overflowY: "auto",
                overscrollBehavior: "contain",
                border: "1px solid var(--taste-border-strong)",
                borderRadius: "var(--taste-radius-lg)",
                background: `
                  radial-gradient(circle at 88% 0%, rgba(231,166,47,0.09), transparent 18rem),
                  linear-gradient(145deg, rgba(255,255,255,0.018), transparent 42%),
                  var(--taste-surface-raised)
                `,
                color: "var(--taste-text)",
                boxShadow: "0 30px 90px rgba(0,0,0,0.68)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  padding: "18px 20px 16px",
                  borderBottom: "1px solid var(--taste-border)",
                }}
              >
                <div>
                  <div
                    className="taste-label"
                    style={{ marginBottom: "5px", fontSize: "9px" }}
                  >
                    Katalog pivovarů
                  </div>
                  <h2
                    id="edit-brewery-title"
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      lineHeight: 1.1,
                      fontWeight: 800,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    Upravit pivovar
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Zavřít"
                  style={closeButtonStyle}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
                <section style={sectionStyle}>
                  <div
                    className="taste-label"
                    style={{ marginBottom: "10px", color: "var(--taste-amber-bright)" }}
                  >
                    Identita pivovaru
                  </div>

                  <div style={gridStyle}>
                    <Field label="Současný název">
                      <input
                        value={brewery.name}
                        readOnly
                        aria-readonly="true"
                        style={lockedInputStyle}
                      />
                    </Field>

                    <Field label="Nový název">
                      <input
                        name="newName"
                        placeholder="Vyplň pouze při přejmenování"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Rok změny názvu">
                      <input
                        name="renameChangedYear"
                        type="number"
                        min="1000"
                        max="2100"
                        inputMode="numeric"
                        placeholder="Volitelné"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      color: "var(--taste-text-muted)",
                      fontSize: "10px",
                      lineHeight: 1.45,
                    }}
                  >
                    Pokud zadáš nový název, původní se automaticky přesune do historie.
                    Pivovar zůstane stejnou databázovou entitou, takže piva, ochutnávky
                    a další vazby zůstanou zachované.
                  </div>
                </section>

                <section style={{ marginBottom: "18px" }}>
                  <div className="taste-label" style={{ marginBottom: "10px" }}>
                    Základní údaje
                  </div>

                  <div style={gridStyle}>
                    <Field label="Rok založení">
                      <input
                        name="foundedYear"
                        type="number"
                        defaultValue={brewery.foundedYear ?? ""}
                        min="1000"
                        max="2100"
                        inputMode="numeric"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Rok uzavření">
                      <input
                        name="closedYear"
                        type="number"
                        defaultValue={brewery.closedYear ?? ""}
                        min="1000"
                        max="2100"
                        inputMode="numeric"
                        style={inputStyle}
                      />
                    </Field>

                    <Field label="Adresa">
                      <input
                        name="address"
                        defaultValue={brewery.address ?? ""}
                        disabled={brewery.isNomadic}
                        placeholder={brewery.isNomadic ? "Letající pivovar" : undefined}
                        style={brewery.isNomadic ? lockedInputStyle : inputStyle}
                      />
                    </Field>

                    <Field label="Web">
                      <input
                        name="website"
                        defaultValue={brewery.website ?? ""}
                        placeholder="https://…"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </section>

                {isAdmin && (
                  <section
                    style={{
                      ...sectionStyle,
                      borderColor: "rgba(214,91,66,0.30)",
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
                          defaultValue={brewery.latitude ?? ""}
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
                          defaultValue={brewery.longitude ?? ""}
                          min="-180"
                          max="180"
                          step="any"
                          inputMode="decimal"
                          placeholder="např. 14.4782"
                          style={inputStyle}
                        />
                      </Field>
                    </div>

                    <div
                      style={{
                        marginTop: "9px",
                        color: "var(--taste-text-muted)",
                        fontSize: "10px",
                        lineHeight: 1.45,
                      }}
                    >
                      Tyto údaje slouží k umístění pivovaru na mapě ČR a jsou
                      dostupné pouze v administrátorském režimu.
                    </div>
                  </section>
                )}

                <section style={sectionStyle}>
                  <div className="taste-label" style={{ marginBottom: "9px" }}>
                    Značky pivovaru
                  </div>

                  {linkedBrandNames.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "11px",
                      }}
                    >
                      {linkedBrandNames.map((name) => (
                        <span
                          key={name}
                          style={{
                            padding: "5px 8px",
                            border: "1px solid var(--taste-border)",
                            borderRadius: "999px",
                            background: "rgba(231,166,47,0.045)",
                            color: "var(--taste-text-soft)",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginBottom: "10px",
                        color: "var(--taste-text-muted)",
                        fontSize: "10px",
                      }}
                    >
                      Zatím není přiřazena žádná značka.
                    </div>
                  )}

                  <Field label="Přidat novou značku">
                    <input
                      name="brandNames"
                      list={`brewery-brands-${brewery.id}`}
                      value={newBrandNames}
                      onChange={(event) => setNewBrandNames(event.target.value)}
                      placeholder="Existující nebo nový název značky"
                      style={inputStyle}
                    />
                    <datalist id={`brewery-brands-${brewery.id}`}>
                      {brandOptions
                        .filter((name) => !linkedBrandNames.includes(name))
                        .map((name) => (
                          <option key={name} value={name} />
                        ))}
                    </datalist>
                  </Field>
                </section>

                <details
                  style={{
                    marginBottom: "18px",
                    border: "1px solid var(--taste-border)",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.015)",
                  }}
                >
                  <summary
                    style={{
                      padding: "12px 14px",
                      color: "var(--taste-text-soft)",
                      fontSize: "11px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    + Zapsat další historický název
                  </summary>

                  <div
                    style={{
                      padding: "2px 14px 14px",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <Field label="Historický název">
                      <input name="historicalName" style={inputStyle} />
                    </Field>

                    <div style={gridStyle}>
                      <Field label="Od roku">
                        <input
                          name="historicalFromYear"
                          type="number"
                          min="1000"
                          max="2100"
                          inputMode="numeric"
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="Do roku">
                        <input
                          name="historicalChangedYear"
                          type="number"
                          min="1000"
                          max="2100"
                          inputMode="numeric"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  </div>
                </details>

                {error && (
                  <div role="alert" style={errorStyle}>
                    {error}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "9px",
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--taste-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="taste-button-secondary"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="taste-button-primary"
                  >
                    {saving ? "Ukládám…" : "Uložit změny"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span
        style={{
          color: "var(--taste-text-muted)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.055em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
} as const;

const sectionStyle = {
  marginBottom: "18px",
  padding: "15px",
  border: "1px solid rgba(245,184,63,0.24)",
  borderRadius: "12px",
  background: "rgba(231,166,47,0.035)",
} as const;

const inputStyle = {
  width: "100%",
  height: "40px",
  boxSizing: "border-box",
  padding: "0 11px",
  border: "1px solid var(--taste-border)",
  borderRadius: "9px",
  background: "var(--taste-surface)",
  color: "var(--taste-text)",
  fontSize: "12px",
  outline: "none",
} as const;

const lockedInputStyle = {
  ...inputStyle,
  color: "var(--taste-text-muted)",
  background: "rgba(255,255,255,0.02)",
} as const;

const closeButtonStyle = {
  width: "34px",
  height: "34px",
  border: "1px solid var(--taste-border)",
  borderRadius: "9px",
  background: "transparent",
  color: "var(--taste-text-muted)",
  fontSize: "19px",
  cursor: "pointer",
} as const;

const errorStyle = {
  marginTop: "15px",
  padding: "10px 12px",
  border: "1px solid rgba(220,100,75,0.35)",
  borderRadius: "9px",
  background: "rgba(220,100,75,0.08)",
  color: "var(--taste-text)",
  fontSize: "12px",
  lineHeight: 1.45,
} as const;
