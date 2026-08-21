import { createClient } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import TastingForm from "./TastingForm";

import { saveTastingAndRedirect } from "../actions";

// ==================================================
// JEDNA RELACE ZE SUPABASE
// ==================================================

function singleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(value)) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

// ==================================================
// NOVÁ OCHUTNÁVKA
// ==================================================

export default async function NewTastingPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  // ==================================================
  // PIVA
  // ==================================================

  const {
    data: beers,
    error: beersError,
  } =
    await supabase
      .from("beers")
      .select(`
        id,
        name,
        plato,
        abv,
        ibu,
        breweries (
          id,
          name,
          country
        ),
        beer_styles (
          id,
          name
        )
      `)
      .order("name");

  if (beersError) {
    throw new Error(
      beersError.message
    );
  }

  /*
   * Supabase typová inference u vnořených relací
   * někdy vrací pole, i když aplikace pracuje
   * s jedním pivovarem / jedním stylem.
   *
   * Tady data sjednotíme do skutečného tvaru,
   * který očekává TastingForm.
   */

  const normalizedBeers =
    (beers ?? []).map(
      (beer) => ({
        ...beer,

        breweries:
          singleRelation(
            beer.breweries
          ),

        beer_styles:
          singleRelation(
            beer.beer_styles
          ),
      })
    );

  // ==================================================
  // PIVOVARY
  // ==================================================

  const {
    data: breweries,
    error: breweriesError,
  } =
    await supabase
      .from("breweries")
      .select(
        "id, name, country"
      )
      .order("name");

  if (breweriesError) {
    throw new Error(
      breweriesError.message
    );
  }

  // ==================================================
  // ZEMĚ
  // ==================================================

  const {
    data: countries,
    error: countriesError,
  } =
    await supabase
      .from("countries")
      .select(
        "id, name"
      )
      .order("name");

  if (countriesError) {
    throw new Error(
      countriesError.message
    );
  }

  // ==================================================
  // STYLY
  // ==================================================

  const {
    data: styles,
    error: stylesError,
  } =
    await supabase
      .from("beer_styles")
      .select(
        "id, name, aliases"
      )
      .order("name");

  if (stylesError) {
    throw new Error(
      stylesError.message
    );
  }

  // ==================================================
  // CHMELY
  // ==================================================

  const {
    data: hops,
    error: hopsError,
  } =
    await supabase
      .from("hops")
      .select(
        "id, name"
      )
      .order("name");

  if (hopsError) {
    throw new Error(
      hopsError.message
    );
  }

  // ==================================================
  // VÝSTUP
  // ==================================================

  return (
    <main
      style={{
        padding:
          "40px",

        maxWidth:
          "650px",

        margin:
          "0 auto",
      }}
    >
      <h1>
        🍺 Zapsat ochutnávku
      </h1>

      <p
        style={{
          marginBottom:
            "30px",
        }}
      >
        Začni názvem piva.
        Pokud ho TasteApp zná,
        použije existující
        záznam. Pokud ne,
        vytvoří nové pivo a
        zároveň uloží
        ochutnávku.
      </p>

      <TastingForm
        saveTastingAction={
          saveTastingAndRedirect
        }
        beers={
          normalizedBeers
        }
        breweries={
          breweries ?? []
        }
        countries={
          countries ?? []
        }
        styles={
          styles ?? []
        }
        hops={
          hops ?? []
        }
      />
    </main>
  );
}