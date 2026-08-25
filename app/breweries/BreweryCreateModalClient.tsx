"use client";

import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Country = {
  id: number;
  name: string;
};

type BreweryCreateModalClientProps = {
  countries: Country[];
  createBreweryAction: (
    formData: FormData
  ) => Promise<void>;
};

export default function BreweryCreateModalClient({
  countries,
  createBreweryAction,
}: BreweryCreateModalClientProps) {
  const [open, setOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const router = useRouter();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, saving]);

  function closeModal() {
    if (saving) {
      return;
    }

    setError("");
    setOpen(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    setSaving(true);
    setError("");

    try {
      await createBreweryAction(
        formData
      );

      form.reset();
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
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="taste-button-primary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          fontSize: "12px",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: "17px",
            lineHeight: 1,
          }}
        >
          +
        </span>

        Přidat pivovar
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-brewery-title"
            onClick={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeModal();
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
              background:
                "rgba(5, 4, 3, 0.80)",
              backdropFilter:
                "blur(18px)",
              WebkitBackdropFilter:
                "blur(18px)",
            }}
          >
            <div
              onClick={(event) =>
                event.stopPropagation()
              }
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "620px",
                maxHeight: "88vh",
                overflowY: "auto",
                overscrollBehavior:
                  "contain",
                border:
                  "1px solid var(--taste-border-strong)",
                borderRadius:
                  "var(--taste-radius-lg)",
                background: `
                  radial-gradient(
                    circle at 88% 0%,
                    rgba(231,166,47,0.09),
                    transparent 18rem
                  ),
                  linear-gradient(
                    145deg,
                    rgba(255,255,255,0.018),
                    transparent 42%
                  ),
                  var(--taste-surface-raised)
                `,
                color:
                  "var(--taste-text)",
                boxShadow:
                  "0 30px 90px rgba(0,0,0,0.68)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                  gap: "20px",
                  padding:
                    "18px 20px 16px",
                  borderBottom:
                    "1px solid var(--taste-border)",
                }}
              >
                <div>
                  <div
                    className="taste-label"
                    style={{
                      marginBottom:
                        "5px",
                      fontSize: "9px",
                    }}
                  >
                    Katalog pivovarů
                  </div>

                  <h2
                    id="new-brewery-title"
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      lineHeight: 1.1,
                      fontWeight: 800,
                      letterSpacing:
                        "-0.025em",
                    }}
                  >
                    Přidat pivovar
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Zavřít"
                  style={{
                    width: "34px",
                    height: "34px",
                    border:
                      "1px solid var(--taste-border)",
                    borderRadius:
                      "9px",
                    background:
                      "transparent",
                    color:
                      "var(--taste-text-muted)",
                    fontSize: "19px",
                    cursor: saving
                      ? "default"
                      : "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                style={{
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <Field
                    label="Jméno"
                    required
                  >
                    <input
                      name="name"
                      required
                      autoFocus
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <Field label="Město">
                    <input
                      name="city"
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <Field
                    label="Stát"
                    required
                  >
                    <select
                      name="country"
                      required
                      defaultValue=""
                      style={
                        inputStyle
                      }
                    >
                      <option
                        value=""
                        disabled
                      >
                        Vyber stát
                      </option>

                      {countries.map(
                        (
                          country
                        ) => (
                          <option
                            key={
                              country.id
                            }
                            value={
                              country.name
                            }
                          >
                            {
                              country.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Adresa">
                    <input
                      name="address"
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <Field label="Web">
                    <input
                      name="website"
                      placeholder="https://…"
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <Field label="Rok založení">
                    <input
                      name="foundedYear"
                      type="number"
                      min="1000"
                      max="2100"
                      inputMode="numeric"
                      style={
                        inputStyle
                      }
                    />
                  </Field>

                  <Field label="Rok ukončení provozu">
                    <input
                      name="closedYear"
                      type="number"
                      min="1000"
                      max="2100"
                      inputMode="numeric"
                      style={
                        inputStyle
                      }
                    />
                  </Field>
                </div>

                {error && (
                  <div
                    role="alert"
                    style={{
                      marginTop:
                        "15px",
                      padding:
                        "10px 12px",
                      border:
                        "1px solid rgba(220,100,75,0.35)",
                      borderRadius:
                        "9px",
                      background:
                        "rgba(220,100,75,0.08)",
                      color:
                        "var(--taste-text)",
                      fontSize:
                        "12px",
                      lineHeight: 1.45,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    gap: "9px",
                    marginTop:
                      "20px",
                    paddingTop:
                      "16px",
                    borderTop:
                      "1px solid var(--taste-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="taste-button-secondary"
                  >
                    Zrušit
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="taste-button-primary"
                  >
                    {saving
                      ? "Ukládám…"
                      : "Přidat pivovar"}
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
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "6px",
      }}
    >
      <span
        style={{
          color:
            "var(--taste-text-muted)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform:
            "uppercase",
          letterSpacing:
            "0.055em",
        }}
      >
        {label}
        {required && (
          <span
            style={{
              color:
                "var(--taste-amber-bright)",
            }}
          >
            {" "}
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  height: "40px",
  boxSizing: "border-box",
  padding: "0 11px",
  border:
    "1px solid var(--taste-border)",
  borderRadius: "9px",
  background:
    "var(--taste-surface)",
  color: "var(--taste-text)",
  fontSize: "12px",
  outline: "none",
} as const;
