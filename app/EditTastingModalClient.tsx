"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PACKAGING_OPTIONS } from "@/lib/packaging";

type Brewery = {
  id: number;
  name: string;
  country: string | null;
};

type BeerStyle = {
  id: number;
  name: string;
};

type Hop = {
  id: number;
  name: string;
};

type Beer = {
  id: number;
  name: string;

  breweries: {
    id: number;
    name: string;
    country: string | null;
  } | null;

  beer_styles: {
    id: number;
    name: string;
  } | null;
};

type Tasting = {
  id: number;
  user_id: string;
  tasted_on: string;
  packaging: string | null;
  quantity: number | null;

  plato: number | null;
  abv: number | null;
  ibu: number | null;

  place: string | null;
  notes: string | null;

  beers: {
    id: number;
    name: string;

    breweries: {
      id: number;
      name: string;
      country: string | null;
    } | null;

    beer_styles: {
      id: number;
      name: string;
    } | null;

    beer_hops:
      | {
          hops: {
            id: number;
            name: string;
          } | null;
        }[]
      | null;
  } | null;
};

type Props = {
  tasting: Tasting;

  beers: Beer[];
  breweries: Brewery[];
  styles: BeerStyle[];
  hops: Hop[];

  updateTastingAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
  }>;

  deleteTastingAction: (
    tastingId: number
  ) => Promise<{
    success: boolean;
  }>;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EditTastingModalClient({
  tasting,
  beers,
  breweries,
  styles,
  hops,
  updateTastingAction,
  deleteTastingAction,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const initialBeerName =
    tasting.beers?.name ?? "";

  const initialBeerId =
    tasting.beers?.id
      ? String(tasting.beers.id)
      : "";

  const [beerName, setBeerName] =
    useState(initialBeerName);

  const [
    existingBeerId,
    setExistingBeerId,
  ] =
    useState(initialBeerId);

  const [breweryName, setBreweryName] =
    useState(
      tasting.beers?.breweries?.name ??
        ""
    );

  const [
    breweryCountry,
    setBreweryCountry,
  ] =
    useState(
      tasting.beers?.breweries
        ?.country ?? ""
    );

  const [styleName, setStyleName] =
    useState(
      tasting.beers?.beer_styles?.name ??
        ""
    );

  const [plato, setPlato] =
    useState(
      tasting.plato !== null
        ? String(tasting.plato)
        : ""
    );

  const [abv, setAbv] =
    useState(
      tasting.abv !== null
        ? String(tasting.abv)
        : ""
    );

  const [ibu, setIbu] =
    useState(
      tasting.ibu !== null
        ? String(tasting.ibu)
        : ""
    );

  const initialHops =
    tasting.beers?.beer_hops
      ?.map(
        (beerHop) =>
          beerHop.hops?.name
      )
      .filter(
        (name): name is string =>
          Boolean(name)
      )
      .join(", ") ?? "";

  const [hopText, setHopText] =
    useState(initialHops);

  const hopNames =
    hopText
      .split(",")
      .map(
        (hop) =>
          hop.trim()
      )
      .filter(Boolean);

  function handleBeerNameChange(
    value: string
  ) {
    setBeerName(value);

    if (
      normalizeText(value) ===
      normalizeText(initialBeerName)
    ) {
      setExistingBeerId(
        initialBeerId
      );
    } else {
      setExistingBeerId("");
    }
  }

  function selectBeerFromList(
    value: string
  ) {
    handleBeerNameChange(value);

    const exactBeer =
      beers.find(
        (beer) =>
          normalizeText(
            beer.name
          ) ===
          normalizeText(value)
      );

    if (!exactBeer) {
      return;
    }

    setExistingBeerId(
      String(exactBeer.id)
    );

    setBeerName(
      exactBeer.name
    );

    setBreweryName(
      exactBeer.breweries?.name ??
        ""
    );

    setBreweryCountry(
      exactBeer.breweries?.country ??
        ""
    );

    setStyleName(
      exactBeer.beer_styles?.name ??
        ""
    );
  }

  async function handleUpdate(
    formData: FormData
  ) {
    setSaving(true);
    setError("");

    try {
      const result =
        await updateTastingAction(
          formData
        );

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se uložit změny."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Opravdu chcete tuto ochutnávku smazat?"
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const result =
        await deleteTastingAction(
          tasting.id
        );

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepodařilo se ochutnávku smazat."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        style={editButtonStyle}
      >
        ✏️ Upravit
      </button>

      {open && (
        <div
          style={overlayStyle}
          onMouseDown={() =>
            setOpen(false)
          }
        >
          <div
            style={modalStyle}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* ==================================================
                HLAVIČKA
            ================================================== */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.5,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.08em",
                    marginBottom: "4px",
                  }}
                >
                  Ochutnávka
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                  }}
                >
                  ✏️ Upravit záznam
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "12px 14px",
                  border:
                    "1px solid rgba(220,70,70,0.5)",
                  borderRadius: "10px",
                  background:
                    "rgba(220,70,70,0.08)",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* ==================================================
                EDITAČNÍ FORMULÁŘ
            ================================================== */}

            <form action={handleUpdate}>
              <input
                type="hidden"
                name="tastingId"
                value={tasting.id}
              />

              <input
                type="hidden"
                name="existingBeerId"
                value={existingBeerId}
              />

              {/* PIVO */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Pivo *
                </label>

                <input
                  list={`edit-beers-${tasting.id}`}
                  name="beerName"
                  value={beerName}
                  onChange={(event) =>
                    selectBeerFromList(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="off"
                  style={inputStyle}
                />

                <datalist
                  id={`edit-beers-${tasting.id}`}
                >
                  {beers.map((beer) => (
                    <option
                      key={beer.id}
                      value={beer.name}
                    >
                      {beer.breweries
                        ?.name ?? ""}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* PIVOVAR */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Pivovar *
                </label>

                <input
                  list={`edit-breweries-${tasting.id}`}
                  name="brewery"
                  value={breweryName}
                  onChange={(event) =>
                    setBreweryName(
                      event.target.value
                    )
                  }
                  required
                  autoComplete="off"
                  style={inputStyle}
                />

                <datalist
                  id={`edit-breweries-${tasting.id}`}
                >
                  {breweries.map(
                    (brewery) => (
                      <option
                        key={brewery.id}
                        value={
                          brewery.name
                        }
                      />
                    )
                  )}
                </datalist>
              </div>

              {/* ZEMĚ */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Země původu pivovaru
                </label>

                <input
                  list={`edit-countries-${tasting.id}`}
                  name="breweryCountry"
                  value={breweryCountry}
                  onChange={(event) =>
                    setBreweryCountry(
                      event.target.value
                    )
                  }
                  autoComplete="off"
                  style={inputStyle}
                />

                <datalist
                  id={`edit-countries-${tasting.id}`}
                >
                  {Array.from(
                    new Set(
                      breweries
                        .map(
                          (brewery) =>
                            brewery.country
                        )
                        .filter(
                          (
                            country
                          ): country is string =>
                            Boolean(
                              country
                            )
                        )
                    )
                  ).map((country) => (
                    <option
                      key={country}
                      value={country}
                    />
                  ))}
                </datalist>
              </div>

              {/* STYL */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Pivní styl
                </label>

                <input
                  list={`edit-styles-${tasting.id}`}
                  name="style"
                  value={styleName}
                  onChange={(event) =>
                    setStyleName(
                      event.target.value
                    )
                  }
                  autoComplete="off"
                  style={inputStyle}
                />

                <datalist
                  id={`edit-styles-${tasting.id}`}
                >
                  {styles.map((style) => (
                    <option
                      key={style.id}
                      value={style.name}
                    />
                  ))}
                </datalist>
              </div>

              {/* PARAMETRY */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
                    Stupňovitost °P
                  </label>

                  <input
                    type="number"
                    name="plato"
                    step="0.1"
                    value={plato}
                    onChange={(event) =>
                      setPlato(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
                    Alkohol %
                  </label>

                  <input
                    type="number"
                    name="abv"
                    step="0.01"
                    value={abv}
                    onChange={(event) =>
                      setAbv(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={fieldStyle}>
                  <label
                    style={labelStyle}
                  >
                    IBU
                  </label>

                  <input
                    type="number"
                    name="ibu"
                    step="0.1"
                    value={ibu}
                    onChange={(event) =>
                      setIbu(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* CHMELY */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Chmely
                </label>

                <input
                  value={hopText}
                  onChange={(event) =>
                    setHopText(
                      event.target.value
                    )
                  }
                  placeholder="Např. Citra, Mosaic, Saaz"
                  style={inputStyle}
                />

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    opacity: 0.55,
                  }}
                >
                  Více chmelů oddělte
                  čárkou.
                </div>

                {hopNames.map(
                  (hopName, index) => (
                    <input
                      key={`${hopName}-${index}`}
                      type="hidden"
                      name="hops"
                      value={hopName}
                    />
                  )
                )}
              </div>

              <hr
                style={{
                  margin: "30px 0",
                  opacity: 0.25,
                }}
              />

              <h3
                style={{
                  margin:
                    "0 0 18px",
                }}
              >
                Ochutnávka
              </h3>

              {/* DATUM */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Datum ochutnávky *
                </label>

                <input
                  type="date"
                  name="tastedOn"
                  defaultValue={
                    tasting.tasted_on
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* OBAL */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Podání / obal
                </label>

                <select
                  name="packaging"
                  defaultValue={
                    tasting.packaging ??
                    ""
                  }
                  style={inputStyle}
                >
                  <option value="">
                    Nezadáno
                  </option>

                  {PACKAGING_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={
                          option.value
                        }
                      >
                        {option.icon}{" "}
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* POČET */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Počet *
                </label>

                <input
                  type="number"
                  name="quantity"
                  min="1"
                  step="1"
                  defaultValue={
                    tasting.quantity ??
                    1
                  }
                  required
                  style={inputStyle}
                />
              </div>

              {/* MÍSTO */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Místo
                </label>

                <input
                  name="place"
                  defaultValue={
                    tasting.place ?? ""
                  }
                  style={inputStyle}
                />
              </div>

              {/* POZNÁMKA */}

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Poznámka
                </label>

                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={
                    tasting.notes ?? ""
                  }
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  deleting
                }
                style={{
                  ...saveButtonStyle,
                  opacity:
                    saving ||
                    deleting
                      ? 0.55
                      : 1,
                }}
              >
                {saving
                  ? "Ukládám..."
                  : "💾 Uložit změny"}
              </button>
            </form>

            {/* ==================================================
                SMAZÁNÍ
            ================================================== */}

            <div
              style={{
                marginTop: "28px",
                paddingTop: "22px",
                borderTop:
                  "1px solid rgba(127,127,127,0.2)",
              }}
            >
              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  deleting ||
                  saving
                }
                style={{
                  ...deleteButtonStyle,
                  opacity:
                    deleting ||
                    saving
                      ? 0.55
                      : 1,
                }}
              >
                {deleting
                  ? "Mažu..."
                  : "🗑 Smazat ochutnávku"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================================================
// STYLY
// ==================================================

const fieldStyle = {
  marginBottom: "18px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "bold",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "11px 12px",
  border:
    "1px solid rgba(127,127,127,0.45)",
  borderRadius: "9px",
  background:
    "transparent",
  color: "inherit",
  fontSize: "15px",
};

const editButtonStyle = {
  padding: "7px 10px",
  border:
    "1px solid rgba(127,127,127,0.35)",
  borderRadius: "8px",
  background:
    "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: "12px",
  whiteSpace:
    "nowrap" as const,
};

const closeButtonStyle = {
  width: "36px",
  height: "36px",
  border:
    "1px solid rgba(127,127,127,0.3)",
  borderRadius: "50%",
  background:
    "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: "22px",
  lineHeight: 1,
};

const saveButtonStyle = {
  width: "100%",
  padding: "13px 16px",
  border:
    "1px solid currentColor",
  borderRadius: "10px",
  background:
    "transparent",
  color: "inherit",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "15px",
};

const deleteButtonStyle = {
  width: "100%",
  padding: "12px 16px",
  border:
    "1px solid rgba(220,70,70,0.65)",
  borderRadius: "10px",
  background:
    "rgba(220,70,70,0.06)",
  color: "inherit",
  cursor: "pointer",
  fontWeight: "bold",
};

const overlayStyle = {
  position:
    "fixed" as const,
  inset: 0,
  zIndex: 500,
  background:
    "rgba(0,0,0,0.68)",
  display: "flex",
  alignItems:
    "flex-start",
  justifyContent:
    "center",
  overflowY:
    "auto" as const,
  padding: "40px 18px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "680px",
  padding: "24px",
  borderRadius: "18px",
  border:
    "1px solid rgba(127,127,127,0.3)",
  background:
    "hsl(var(--background))",
  color: "inherit",
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.35)",
};