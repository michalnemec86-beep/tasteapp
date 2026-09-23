"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BeerStyle = { id: number; name: string; aliases: string[] | null };
type Hop = { id: number; name: string; aliases: string[] | null };

type BeerSeed = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;
  isNonAlcoholic: boolean;
  styleName: string;
  hopNames: string[];
  tastingCount: number;
};

type Props = {
  mode: "create" | "edit";
  breweryName: string;
  styles: BeerStyle[];
  hops: Hop[];
  beer?: BeerSeed;
  saveAction: (formData: FormData) => Promise<{ success: boolean; beerId: number }>;
  deleteAction?: () => Promise<{ success: boolean; beerId: number }>;
};

type FormState = {
  name: string;
  brandName: string;
  styleName: string;
  plato: string;
  abv: string;
  ibu: string;
  ebc: string;
  hopNames: string;
  collaboratorNames: string;
  photoUrl: string;
  notes: string;
  isNonAlcoholic: boolean;
};

const emptyState: FormState = {
  name: "",
  brandName: "",
  styleName: "",
  plato: "",
  abv: "",
  ibu: "",
  ebc: "",
  hopNames: "",
  collaboratorNames: "",
  photoUrl: "",
  notes: "",
  isNonAlcoholic: false,
};

export default function CatalogBeerModalClient({
  mode,
  breweryName,
  styles,
  hops,
  beer,
  saveAction,
  deleteAction,
}: Props) {
  const router = useRouter();
  const id = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [breweryOptions, setBreweryOptions] = useState<Array<{
    value: string;
    label: string;
    currentName: string;
  }>>([]);
  const [form, setForm] = useState<FormState>(() =>
    beer
      ? {
          ...emptyState,
          name: beer.name,
          styleName: beer.styleName,
          plato: beer.plato == null ? "" : String(beer.plato),
          abv: beer.abv == null ? "" : String(beer.abv),
          ibu: beer.ibu == null ? "" : String(beer.ibu),
          hopNames: beer.hopNames.join(", "),
          isNonAlcoholic: beer.isNonAlcoholic,
        }
      : emptyState
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function prepareOpen() {
    setError("");
    setOpen(true);
    setLoadingDetails(true);

    try {
      const supabase = createClient();
      const [brandsResult, breweriesResult] = await Promise.all([
        supabase.from("brands").select("name").order("name"),
        supabase
          .from("breweries")
          .select(`
            name,
            brewery_name_history (
              previous_name
            )
          `)
          .order("name"),
      ]);

      setBrandOptions((brandsResult.data ?? []).map((item) => item.name));
      setBreweryOptions(
        (breweriesResult.data ?? []).flatMap((item) => {
          const history = (item.brewery_name_history ?? []) as Array<{
            previous_name: string;
          }>;

          return [
            {
              value: item.name,
              label: item.name,
              currentName: item.name,
            },
            ...history
              .map((row) => row.previous_name?.trim())
              .filter((name): name is string => Boolean(name))
              .map((name) => ({
                value: name,
                label: `${name} → ${item.name}`,
                currentName: item.name,
              })),
          ];
        })
      );
      if (mode === "edit" && beer) {
        const detailResult = await supabase
          .from("beers")
          .select(`
            ebc, notes, photo_url,
            brands ( name ),
            beer_versions (
              id, is_current,
              beer_version_collaborators (
                display_order,
                breweries ( name )
              )
            )
          `)
          .eq("id", beer.id)
          .maybeSingle();

        if (detailResult.error) throw detailResult.error;
        const raw = detailResult.data as any;
        const brandRelation = Array.isArray(raw?.brands) ? raw.brands[0] : raw?.brands;
        const currentVersion = (raw?.beer_versions ?? []).find((version: any) => version.is_current);
        const collaborators = (currentVersion?.beer_version_collaborators ?? [])
          .slice()
          .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((item: any) => Array.isArray(item.breweries) ? item.breweries[0]?.name : item.breweries?.name)
          .filter(Boolean);

        setForm({
          name: beer.name,
          brandName: brandRelation?.name ?? "",
          styleName: beer.styleName,
          plato: beer.plato == null ? "" : String(beer.plato),
          abv: beer.abv == null ? "" : String(beer.abv),
          ibu: beer.ibu == null ? "" : String(beer.ibu),
          ebc: raw?.ebc == null ? "" : String(raw.ebc),
          hopNames: beer.hopNames.join(", "),
          collaboratorNames: collaborators.join(", "),
          photoUrl: raw?.photo_url ?? "",
          notes: raw?.notes ?? "",
          isNonAlcoholic: beer.isNonAlcoholic,
        });
      } else {
        setForm(emptyState);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Podrobnosti piva se nepodařilo načíst.");
    } finally {
      setLoadingDetails(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.plato.trim() && !form.abv.trim()) {
      setError("Vyplň alespoň stupňovitost nebo obsah alkoholu.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      await saveAction(formData);
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Pivo se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!beer || !deleteAction) return;
    const hasTastings = beer.tastingCount > 0;
    if (hasTastings) return;

    const warning = `Opravdu smazat pivo „${beer.name}“ z katalogu?`;
    if (!window.confirm(warning)) return;

    setDeleting(true);
    setError("");
    try {
      await deleteAction();
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Pivo se nepodařilo smazat.");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting || loadingDetails;
  const canDelete = Boolean(beer && deleteAction && beer.tastingCount === 0);

  return (
    <>
      <button
        type="button"
        className="taste-button-secondary"
        onClick={prepareOpen}
        style={{ padding: mode === "edit" ? "5px 8px" : undefined, fontSize: mode === "edit" ? "10px" : "11px", fontWeight: 700, whiteSpace: "nowrap" }}
      >
        {mode === "create" ? "+ Přidat sortiment" : "Upravit"}
      </button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`catalog-beer-${id}`}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", background: "rgba(5,4,3,.82)", backdropFilter: "blur(18px)" }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: "100%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--taste-border-strong)", borderRadius: "var(--taste-radius-lg)", background: "var(--taste-surface-raised)", color: "var(--taste-text)", boxShadow: "0 30px 90px rgba(0,0,0,.68)" }}
          >
            <div style={{ position: "relative", padding: "18px 20px 16px", borderBottom: "1px solid var(--taste-border)" }}>
              <div className="taste-label" style={{ marginBottom: "5px", fontSize: "9px" }}>Katalog piva</div>
              <h2 id={`catalog-beer-${id}`} style={{ margin: 0, paddingRight: "45px", fontSize: "23px" }}>
                {mode === "create" ? "Přidat sortiment" : "Upravit verzi piva"}
              </h2>
              <div style={{ marginTop: "5px", color: "var(--taste-text-muted)", fontSize: "11px" }}>{breweryName}</div>
              <button type="button" aria-label="Zavřít" disabled={busy} onClick={() => setOpen(false)} style={{ position: "absolute", top: "15px", right: "16px", width: "34px", height: "34px", border: "1px solid var(--taste-border)", borderRadius: "9px", background: "transparent", color: "var(--taste-text-muted)", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {error && <div role="alert" style={errorStyle}>{error}</div>}

              <div style={gridStyle}>
                <Field label="Název piva" required>
                  <input name="name" required readOnly={mode === "edit"} aria-readonly={mode === "edit"} value={form.name} onChange={(e) => setField("name", e.target.value)} style={mode === "edit" ? lockedInputStyle : inputStyle} />
                </Field>

                <Field label="Značka" required>
                  <input name="brandName" required readOnly={mode === "edit"} aria-readonly={mode === "edit"} list={mode === "create" ? `brands-${id}` : undefined} value={form.brandName} onChange={(e) => setField("brandName", e.target.value)} placeholder="Např. Kozel" style={mode === "edit" ? lockedInputStyle : inputStyle} />
                  <datalist id={`brands-${id}`}>{brandOptions.map((name) => <option key={name} value={name} />)}</datalist>
                </Field>

                <Field label="Pivní styl" required>
                  <input name="styleName" required list={`styles-${id}`} value={form.styleName} onChange={(e) => setField("styleName", e.target.value)} placeholder="Např. IPA" style={inputStyle} />
                  <datalist id={`styles-${id}`}>{styles.map((style) => <option key={style.id} value={style.name} />)}</datalist>
                </Field>

                <Field label="Stupňovitost °P">
                  <input type="number" step="0.01" name="plato" value={form.plato} onChange={(e) => setField("plato", e.target.value)} style={inputStyle} />
                </Field>

                <Field label="Alkohol %">
                  <input type="number" step="0.01" name="abv" value={form.abv} onChange={(e) => setField("abv", e.target.value)} style={inputStyle} />
                </Field>

                <Field label="IBU">
                  <input type="number" step="0.1" name="ibu" value={form.ibu} onChange={(e) => setField("ibu", e.target.value)} style={inputStyle} />
                </Field>

                <Field label="EBC">
                  <input type="number" step="0.1" name="ebc" value={form.ebc} onChange={(e) => setField("ebc", e.target.value)} style={inputStyle} />
                </Field>

                <Field label="Chmely">
                  <input name="hopNames" list={`hops-${id}`} value={form.hopNames} onChange={(e) => setField("hopNames", e.target.value)} placeholder="Citra, Mosaic, Žatecký poloraný červeňák" style={inputStyle} />
                  <datalist id={`hops-${id}`}>{hops.map((hop) => <option key={hop.id} value={hop.name} />)}</datalist>
                </Field>

                <Field label="Spolupracující pivovary">
                  <input name="collaboratorNames" list={`breweries-${id}`} value={form.collaboratorNames} onChange={(e) => setField("collaboratorNames", e.target.value)} placeholder="Oddělit čárkou" style={inputStyle} />
                  <datalist id={`breweries-${id}`}>
                    {breweryOptions
                      .filter((option) => option.currentName !== breweryName)
                      .map((option) => (
                        <option
                          key={`${option.currentName}-${option.value}`}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                  </datalist>
                </Field>

                <Field label="URL fotografie">
                  <input name="photoUrl" value={form.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} placeholder="https://…" style={inputStyle} />
                </Field>
              </div>

              <div
                style={{
                  margin: "-3px 0 14px",
                  color: "var(--taste-text-muted)",
                  fontSize: "10px",
                  lineHeight: 1.45,
                }}
              >
                Pro katalog je povinný styl a alespoň jeden údaj: stupňovitost °P nebo alkohol %.
              </div>

              <Field label="Poznámka">
                <textarea name="notes" rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} style={{ ...inputStyle, height: "auto", padding: "10px 11px", resize: "vertical" }} />
              </Field>

              <label style={{ display: "flex", alignItems: "center", gap: "9px", margin: "12px 0 18px", color: "var(--taste-text-soft)", fontSize: "12px", cursor: "pointer" }}>
                <input name="isNonAlcoholic" type="checkbox" checked={form.isNonAlcoholic} onChange={(e) => setField("isNonAlcoholic", e.target.checked)} />
                <strong style={{ color: "var(--taste-text)" }}>Nealkoholické pivo</strong>
              </label>

              <button type="submit" disabled={busy} className="taste-button-primary" style={{ width: "100%", justifyContent: "center", minHeight: "44px" }}>
                {saving ? "Ukládám…" : mode === "create" ? "Přidat pivo do sortimentu" : "Uložit změny"}
              </button>

              {mode === "edit" && beer && deleteAction && (
                <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid var(--taste-border)" }}>
                  {canDelete ? (
                    <div style={{ display: "grid", gap: "7px" }}>
                      <button type="button" disabled={busy} onClick={handleDelete} style={deleteButtonStyle}>
                        {deleting ? "Mažu…" : "Smazat pivo z katalogu"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: "var(--taste-text-muted)", fontSize: "11px", lineHeight: 1.45 }}>
                      Pivo má {beer.tastingCount} evidovaných ochutnávek, proto ho nelze fyzicky smazat ani administrátorem. Historie musí zůstat zachovaná.
                    </div>
                  )}
                </div>
              )}
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
    <label style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
      <span style={{ color: "var(--taste-text-muted)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".055em" }}>
        {label}{required ? <span style={{ color: "var(--taste-amber-bright)" }}> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0 14px" } as const;
const inputStyle = { width: "100%", height: "40px", boxSizing: "border-box", padding: "0 11px", border: "1px solid var(--taste-border)", borderRadius: "9px", background: "var(--taste-surface)", color: "var(--taste-text)", fontSize: "12px", outline: "none" } as const;
const lockedInputStyle = { ...inputStyle, color: "var(--taste-text-muted)", background: "rgba(255,255,255,.025)", cursor: "not-allowed" } as const;
const errorStyle = { marginBottom: "16px", padding: "10px 12px", border: "1px solid rgba(220,100,75,.35)", borderRadius: "9px", background: "rgba(220,100,75,.08)", color: "var(--taste-text)", fontSize: "12px" } as const;
const deleteButtonStyle = { width: "100%", minHeight: "42px", padding: "10px 14px", border: "1px solid rgba(214,91,66,.55)", borderRadius: "9px", background: "rgba(214,91,66,.08)", color: "#e3765f", cursor: "pointer", fontWeight: 700, fontSize: "12px" } as const;
