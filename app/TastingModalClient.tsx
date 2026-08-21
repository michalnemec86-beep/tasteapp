"use client";

import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  useRouter,
} from "next/navigation";

import TastingForm from "./tastings/new/TastingForm";

type Brewery = {
  id: number;
  name: string;
};

type Country = {
  id: number;
  name: string;
};

type BeerStyle = {
  id: number;
  name: string;
  aliases: string[];
};

type Hop = {
  id: number;
  name: string;
};

type ExistingBeer = {
  id: number;
  name: string;
  plato: number | null;
  abv: number | null;
  ibu: number | null;

  breweries: {
    id: number;
    name: string;
  } | null;

  beer_styles: {
    id: number;
    name: string;
  } | null;
};

type TastingModalClientProps = {
  beers: ExistingBeer[];
  breweries: Brewery[];
  countries: Country[];
  styles: BeerStyle[];
  hops: Hop[];

  saveTastingAction: (
    formData: FormData
  ) => Promise<{
    success: boolean;
  }>;
};

export default function TastingModalClient({
  beers,
  breweries,
  countries,
  styles,
  hops,
  saveTastingAction,
}: TastingModalClientProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const router =
    useRouter();

  // ==================================================
  // ESC + ZAMKNUTÍ SCROLLOVÁNÍ POZADÍ
  // ==================================================

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
        event.key ===
        "Escape"
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
  }, [open]);

  // ==================================================
  // ULOŽENÍ
  // ==================================================

  async function handleSave(
    formData: FormData
  ) {
    const result =
      await saveTastingAction(
        formData
      );

    if (result.success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {/* ==================================================
          TLAČÍTKO
      ================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="taste-button-primary"
        style={{
          width: "100%",
          minHeight: "50px",

          padding:
            "11px 17px",

          fontSize: "14px",
          fontWeight: 800,

          letterSpacing:
            "-0.01em",
        }}
      >
        <span
          style={{
            width: "23px",
            height: "23px",

            display:
              "inline-flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            borderRadius:
              "7px",

            background:
              "rgba(23,16,6,0.10)",

            fontSize: "18px",
            lineHeight: 1,
          }}
        >
          +
        </span>

        Zapsat ochutnávku
      </button>

      {/* ==================================================
          MODAL
      ================================================== */}

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-tasting-title"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,

            zIndex: 1000,

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

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
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            style={{
              position:
                "relative",

              width: "100%",

              maxWidth:
                "560px",

              maxHeight:
                "86vh",

              overflowY:
                "auto",

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
            {/* ==================================================
                HLAVIČKA
            ================================================== */}

            <div
              style={{
                position:
                  "relative",

                padding:
                  "18px 20px 16px",

                borderBottom:
                  "1px solid var(--taste-border)",
              }}
            >
              <div
                className="taste-label"
                style={{
                  marginBottom:
                    "5px",

                  fontSize:
                    "9px",
                }}
              >
                Nový záznam
              </div>

              <h1
                id="new-tasting-title"
                style={{
                  margin: 0,

                  paddingRight:
                    "45px",

                  fontSize:
                    "23px",

                  lineHeight: 1.1,

                  fontWeight: 800,

                  letterSpacing:
                    "-0.03em",
                }}
              >
                Zapsat ochutnávku
              </h1>

              <p
                style={{
                  margin:
                    "6px 0 0",

                  maxWidth:
                    "430px",

                  color:
                    "var(--taste-text-muted)",

                  fontSize:
                    "11px",

                  lineHeight:
                    1.45,
                }}
              >
                Vyber existující pivo,
                nebo zapiš nové.
              </p>

              <button
                type="button"
                aria-label="Zavřít"
                onClick={() =>
                  setOpen(false)
                }
                style={{
                  position:
                    "absolute",

                  top: "16px",
                  right: "17px",

                  width: "33px",
                  height: "33px",

                  display: "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  border:
                    "1px solid var(--taste-border)",

                  borderRadius:
                    "9px",

                  background:
                    "rgba(255,255,255,0.025)",

                  color:
                    "var(--taste-text-muted)",

                  fontSize: "20px",

                  lineHeight: 1,

                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* ==================================================
                FORMULÁŘ
            ================================================== */}

            <div
              style={{
                padding:
                  "16px 20px 20px",
              }}
            >
              <TastingForm
                saveTastingAction={
                  handleSave
                }
                beers={beers}
                breweries={
                  breweries
                }
                countries={
                  countries
                }
                styles={styles}
                hops={hops}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}