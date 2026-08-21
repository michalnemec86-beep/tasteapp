"use server";

import { createClient } from "@/lib/supabase/server";
import { syncUserAchievements } from "@/lib/achievement-sync";
import {
  isPackaging,
  type Packaging,
} from "@/lib/packaging";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type SupabaseClient =
  Awaited<ReturnType<typeof createClient>>;

type TastingFormValues = {
  existingBeerId: string;

  beerName: string;
  breweryName: string;
  breweryCountry: string;
  styleName: string;

  platoValue: string;
  abvValue: string;
  ibuValue: string;

  tastedOn: string;

  packaging:
    | Packaging
    | null;

  quantity: number;

  place: string;
  notes: string;

  hopNames: string[];
};

// ==================================================
// NORMALIZACE TEXTU
// ==================================================

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ==================================================
// NAČTENÍ A KONTROLA FORMULÁŘE
// ==================================================

function readTastingFormData(
  formData: FormData
): TastingFormValues {
  const existingBeerId =
    String(
      formData.get(
        "existingBeerId"
      ) || ""
    ).trim();

  const beerName =
    String(
      formData.get(
        "beerName"
      ) || ""
    ).trim();

  const breweryName =
    String(
      formData.get(
        "brewery"
      ) || ""
    ).trim();

  const breweryCountry =
    String(
      formData.get(
        "breweryCountry"
      ) || ""
    ).trim();

  const styleName =
    String(
      formData.get(
        "style"
      ) || ""
    ).trim();

  const platoValue =
    String(
      formData.get(
        "plato"
      ) || ""
    ).trim();

  const abvValue =
    String(
      formData.get(
        "abv"
      ) || ""
    ).trim();

  const ibuValue =
    String(
      formData.get(
        "ibu"
      ) || ""
    ).trim();

  const tastedOn =
    String(
      formData.get(
        "tastedOn"
      ) || ""
    ).trim();

  const packagingValue =
    String(
      formData.get(
        "packaging"
      ) || ""
    ).trim();

  const quantityValue =
    String(
      formData.get(
        "quantity"
      ) || "1"
    ).trim();

  const place =
    String(
      formData.get(
        "place"
      ) || ""
    ).trim();

  const notes =
    String(
      formData.get(
        "notes"
      ) || ""
    ).trim();

  const hopNames =
    formData
      .getAll("hops")
      .map(
        (hop) =>
          String(hop).trim()
      )
      .filter(Boolean);

  // ==================================================
  // POVINNÁ POLE
  // ==================================================

  if (
    !beerName ||
    !breweryName
  ) {
    throw new Error(
      "Musí být vyplněný název piva a pivovar."
    );
  }

  if (!tastedOn) {
    throw new Error(
      "Musí být vyplněné datum ochutnávky."
    );
  }

  // ==================================================
  // OBAL
  // ==================================================

  if (
    packagingValue &&
    !isPackaging(
      packagingValue
    )
  ) {
    throw new Error(
      "Neplatný typ podání nebo obalu."
    );
  }

  const packaging:
    Packaging | null =
    packagingValue &&
    isPackaging(
      packagingValue
    )
      ? packagingValue
      : null;

  // ==================================================
  // POČET
  // ==================================================

  const quantity =
    Number(
      quantityValue
    );

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {
    throw new Error(
      "Počet musí být celé číslo alespoň 1."
    );
  }

  return {
    existingBeerId,

    beerName,
    breweryName,
    breweryCountry,
    styleName,

    platoValue,
    abvValue,
    ibuValue,

    tastedOn,
    packaging,
    quantity,

    place,
    notes,

    hopNames,
  };
}

// ==================================================
// PŘIHLÁŠENÝ UŽIVATEL
// ==================================================

async function getCurrentUser(
  supabase: SupabaseClient
) {
  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Uživatel není přihlášen."
    );
  }

  return user;
}

// ==================================================
// PIVOVAR
// ==================================================

async function resolveBrewery(
  supabase: SupabaseClient,
  values: TastingFormValues
) {
  let canonicalCountry =
    "";

  if (values.breweryCountry) {
    const {
      data: countries,
      error: countriesError,
    } =
      await supabase
        .from("countries")
        .select("name");

    if (countriesError) {
      throw new Error(
        countriesError.message
      );
    }

    const country =
      countries?.find(
        (item) =>
          normalizeText(
            item.name
          ) ===
          normalizeText(
            values.breweryCountry
          )
      ) ?? null;

    if (!country) {
      throw new Error(
        "Zadaná země není v katalogu. Vyberte existující zemi."
      );
    }

    canonicalCountry =
      country.name;
  }
  const {
    data: allBreweries,
    error:
      allBreweriesError,
  } =
    await supabase
      .from("breweries")
      .select(
        "id, name, country"
      );

  if (
    allBreweriesError
  ) {
    throw new Error(
      allBreweriesError.message
    );
  }

  let brewery =
    allBreweries?.find(
      (item) =>
        normalizeText(
          item.name
        ) ===
        normalizeText(
          values.breweryName
        )
    ) ?? null;

  // ==================================================
  // NOVÝ PIVOVAR
  // ==================================================

  if (!brewery) {
    const {
      data:
        newBrewery,
      error:
        breweryError,
    } =
      await supabase
        .from(
          "breweries"
        )
        .insert({
          name:
            values.breweryName,

          country:
            canonicalCountry ||
            null,
        })
        .select(
          "id, name, country"
        )
        .single();

    if (
      breweryError
    ) {
      throw new Error(
        breweryError.message
      );
    }

    brewery =
      newBrewery;
  }

  // ==================================================
  // EXISTUJÍCÍ PIVOVAR + AKTUALIZACE ZEMĚ
  // ==================================================

  else if (
    canonicalCountry
  ) {
    const {
      data:
        updatedBrewery,
      error:
        breweryUpdateError,
    } =
      await supabase
        .from(
          "breweries"
        )
        .update({
          country:
            canonicalCountry,
        })
        .eq(
          "id",
          brewery.id
        )
        .select(
          "id, name, country"
        )
        .single();

    if (
      breweryUpdateError
    ) {
      throw new Error(
        breweryUpdateError.message
      );
    }

    brewery =
      updatedBrewery;
  }

  return brewery;
}

// ==================================================
// PIVNÍ STYL
// ==================================================

async function resolveStyle(
  supabase: SupabaseClient,
  styleName: string
) {
  if (!styleName) {
    return null;
  }

  const {
    data: allStyles,
    error:
      allStylesError,
  } =
    await supabase
      .from(
        "beer_styles"
      )
      .select(
        "id, name, aliases"
      );

  if (
    allStylesError
  ) {
    throw new Error(
      allStylesError.message
    );
  }

  const normalizedStyleName =
    normalizeText(styleName);

  const style =
    allStyles?.find(
      (item) =>
        normalizeText(
          item.name
        ) ===
          normalizedStyleName ||
        (item.aliases ?? []).some(
          (alias: string) =>
            normalizeText(alias) ===
            normalizedStyleName
        )
    ) ?? null;

  if (!style) {
    throw new Error(
      "Zadaný pivní styl není v katalogu. Vyberte existující styl."
    );
  }

  return style.id;
}

// ==================================================
// PIVO
// ==================================================

async function resolveBeer(
  supabase: SupabaseClient,
  values: TastingFormValues,
  breweryId: number,
  styleId: number | null
) {
  let beerId:
    number | null =
    null;

  let beerAlreadyExists =
    false;

  // ==================================================
  // PIVO VYBRANÉ Z KATALOGU
  // ==================================================

  if (
    values.existingBeerId
  ) {
    const parsedBeerId =
      Number(
        values.existingBeerId
      );

    if (
      !Number.isInteger(
        parsedBeerId
      ) ||
      parsedBeerId < 1
    ) {
      throw new Error(
        "Neplatné ID piva."
      );
    }

    beerId =
      parsedBeerId;

    beerAlreadyExists =
      true;
  }

  // ==================================================
  // ZKUSÍME NAJÍT PIVO PODLE NÁZVU + PIVOVARU
  // ==================================================

  else {
    const {
      data:
        breweryBeers,
      error:
        breweryBeersError,
    } =
      await supabase
        .from("beers")
        .select(
          "id, name"
        )
        .eq(
          "brewery_id",
          breweryId
        );

    if (
      breweryBeersError
    ) {
      throw new Error(
        breweryBeersError.message
      );
    }

    const existingBeer =
      breweryBeers?.find(
        (beer) =>
          normalizeText(
            beer.name
          ) ===
          normalizeText(
            values.beerName
          )
      ) ?? null;

    if (
      existingBeer
    ) {
      beerId =
        existingBeer.id;

      beerAlreadyExists =
        true;
    }
  }

  // ==================================================
  // EXISTUJÍCÍ PIVO
  // ==================================================

  if (
    beerAlreadyExists &&
    beerId !== null
  ) {
    const beerUpdate: {
      brewery_id: number;
      style_id?: number;
      plato?: number;
      abv?: number;
      ibu?: number;
    } = {
      brewery_id:
        breweryId,
    };

    if (
      styleId !== null
    ) {
      beerUpdate.style_id =
        styleId;
    }

    if (
      values.platoValue
    ) {
      beerUpdate.plato =
        Number(
          values.platoValue
        );
    }

    if (
      values.abvValue
    ) {
      beerUpdate.abv =
        Number(
          values.abvValue
        );
    }

    if (
      values.ibuValue
    ) {
      beerUpdate.ibu =
        Number(
          values.ibuValue
        );
    }

    const {
      error:
        beerUpdateError,
    } =
      await supabase
        .from("beers")
        .update(
          beerUpdate
        )
        .eq(
          "id",
          beerId
        );

    if (
      beerUpdateError
    ) {
      throw new Error(
        beerUpdateError.message
      );
    }
  }

  // ==================================================
  // NOVÉ PIVO
  // ==================================================

  if (
    beerId === null
  ) {
    const {
      data: newBeer,
      error:
        beerError,
    } =
      await supabase
        .from("beers")
        .insert({
          name:
            values.beerName,

          brewery_id:
            breweryId,

          style_id:
            styleId,

          plato:
            values.platoValue
              ? Number(
                  values.platoValue
                )
              : null,

          abv:
            values.abvValue
              ? Number(
                  values.abvValue
                )
              : null,

          ibu:
            values.ibuValue
              ? Number(
                  values.ibuValue
                )
              : null,
        })
        .select("id")
        .single();

    if (
      beerError
    ) {
      throw new Error(
        beerError.message
      );
    }

    beerId =
      newBeer.id;
  }

  return beerId;
}

// ==================================================
// NAJDEME / VYTVOŘÍME CHMELY
// ==================================================

async function resolveHopIds(
  supabase: SupabaseClient,
  hopNames: string[]
) {
  const hopIds:
    number[] =
    [];

  if (
    hopNames.length ===
    0
  ) {
    return hopIds;
  }

  const {
    data: allHops,
    error:
      allHopsError,
  } =
    await supabase
      .from("hops")
      .select(
        "id, name, aliases"
      );

  if (
    allHopsError
  ) {
    throw new Error(
      allHopsError.message
    );
  }

  for (
    const hopName
    of hopNames
  ) {
    const hop =
      allHops?.find(
        (item) => {
          const query =
            normalizeText(
              hopName
            );

          return (
            normalizeText(
              item.name
            ) === query ||
            item.aliases.some(
              (alias: string) =>
                normalizeText(
                  alias
                ) === query
            )
          );
        }
      ) ?? null;

    if (!hop) {
      throw new Error(
        `Chmel "${hopName}" není v katalogu. Vyberte existující chmel.`
      );
    }

    if (
      !hopIds.includes(
        hop.id
      )
    ) {
      hopIds.push(
        hop.id
      );
    }
  }

  return hopIds;
}

// ==================================================
// PŘIDÁNÍ CHMELŮ K PIVU
//
// Používá se při NOVÉ ochutnávce.
// Existující chmely nemažeme.
// ==================================================

async function addBeerHops(
  supabase: SupabaseClient,
  beerId: number,
  hopIds: number[]
) {
  for (
    const hopId
    of hopIds
  ) {
    const {
      data:
        existingBeerHop,
      error:
        existingBeerHopError,
    } =
      await supabase
        .from(
          "beer_hops"
        )
        .select(
          "beer_id"
        )
        .eq(
          "beer_id",
          beerId
        )
        .eq(
          "hop_id",
          hopId
        )
        .maybeSingle();

    if (
      existingBeerHopError
    ) {
      throw new Error(
        existingBeerHopError.message
      );
    }

    if (
      !existingBeerHop
    ) {
      const {
        error:
          beerHopError,
      } =
        await supabase
          .from(
            "beer_hops"
          )
          .insert({
            beer_id:
              beerId,
            hop_id:
              hopId,
          });

      if (
        beerHopError
      ) {
        throw new Error(
          beerHopError.message
        );
      }
    }
  }
}

// ==================================================
// NAHRAZENÍ CHMELŮ PIVA
//
// Používá se při EDITACI.
// Seznam z formuláře bude výsledný seznam chmelů.
// ==================================================

async function replaceBeerHops(
  supabase: SupabaseClient,
  beerId: number,
  hopIds: number[]
) {
  const {
    error:
      deleteError,
  } =
    await supabase
      .from(
        "beer_hops"
      )
      .delete()
      .eq(
        "beer_id",
        beerId
      );

  if (
    deleteError
  ) {
    throw new Error(
      deleteError.message
    );
  }

  if (
    hopIds.length ===
    0
  ) {
    return;
  }

  const rows =
    hopIds.map(
      (hopId) => ({
        beer_id:
          beerId,

        hop_id:
          hopId,
      })
    );

  const {
    error:
      insertError,
  } =
    await supabase
      .from(
        "beer_hops"
      )
      .insert(rows);

  if (
    insertError
  ) {
    throw new Error(
      insertError.message
    );
  }
}

// ==================================================
// VYŘEŠENÍ KATALOGOVÝCH DAT
// ==================================================

async function resolveCatalogData(
  supabase: SupabaseClient,
  values: TastingFormValues,
  replaceHops: boolean
) {
  const brewery =
    await resolveBrewery(
      supabase,
      values
    );

  const styleId =
    await resolveStyle(
      supabase,
      values.styleName
    );

  const beerId =
    await resolveBeer(
      supabase,
      values,
      brewery.id,
      styleId
    );

  if (beerId === null) {
    throw new Error(
      "Nepodařilo se určit pivo."
    );
  }

  if (beerId === null) {
    throw new Error(
      "Nepodařilo se určit pivo."
    );
  }

  const hopIds =
    await resolveHopIds(
      supabase,
      values.hopNames
    );

  if (replaceHops) {
    await replaceBeerHops(
      supabase,
      beerId,
      hopIds
    );
  } else {
    await addBeerHops(
      supabase,
      beerId,
      hopIds
    );
  }

  return beerId;
}

// ==================================================
// OBNOVENÍ STRÁNEK
// ==================================================

function revalidateTastingPages(
  userId: string
) {
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/beers");
  revalidatePath("/tastings");
  revalidatePath("/profiles");

  revalidatePath(
    `/profiles/${userId}`
  );
}

// ==================================================
// NOVÁ OCHUTNÁVKA
// ==================================================

async function saveTastingCore(
  formData: FormData
) {
  const supabase =
    await createClient();

  const user =
    await getCurrentUser(
      supabase
    );

  const values =
    readTastingFormData(
      formData
    );

  const beerId =
    await resolveCatalogData(
      supabase,
      values,
      false
    );

  const {
    error:
      tastingError,
  } =
    await supabase
      .from("tastings")
      .insert({
        user_id:
          user.id,

        beer_id:
          beerId,

        tasted_on:
          values.tastedOn,

        packaging:
          values.packaging,

        quantity:
          values.quantity,

        plato:
          values.platoValue
            ? Number(
                values.platoValue
              )
            : null,

        abv:
          values.abvValue
            ? Number(
                values.abvValue
              )
            : null,

        ibu:
          values.ibuValue
            ? Number(
                values.ibuValue
              )
            : null,

        place:
          values.place ||
          null,

        notes:
          values.notes ||
          null,
      });

  if (
    tastingError
  ) {
    throw new Error(
      tastingError.message
    );
  }

  try {
    await syncUserAchievements(
      user.id
    );
  } catch (error) {
    console.error(
      "Achievement sync failed:",
      error
    );
  }

  revalidateTastingPages(
    user.id
  );

  return {
    success: true,
  };
}

// ==================================================
// EDITACE OCHUTNÁVKY
// ==================================================

export async function updateTastingInModal(
  formData: FormData
) {
  const supabase =
    await createClient();

  const user =
    await getCurrentUser(
      supabase
    );

  // ==================================================
  // ID OCHUTNÁVKY
  // ==================================================

  const tastingIdValue =
    String(
      formData.get(
        "tastingId"
      ) || ""
    ).trim();

  const tastingId =
    Number(
      tastingIdValue
    );

  if (
    !Number.isInteger(
      tastingId
    ) ||
    tastingId < 1
  ) {
    throw new Error(
      "Neplatné ID ochutnávky."
    );
  }

  // ==================================================
  // OVĚŘENÍ VLASTNICTVÍ
  // ==================================================

  const {
    data:
      existingTasting,
    error:
      existingTastingError,
  } =
    await supabase
      .from("tastings")
      .select(
        "id, user_id"
      )
      .eq(
        "id",
        tastingId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    existingTastingError
  ) {
    throw new Error(
      existingTastingError.message
    );
  }

  if (
    !existingTasting
  ) {
    throw new Error(
      "Ochutnávka nebyla nalezena nebo ji nemáte oprávnění upravit."
    );
  }

  // ==================================================
  // DATA Z FORMULÁŘE
  // ==================================================

  const values =
    readTastingFormData(
      formData
    );

  // Při editaci seznam chmelů přesně synchronizujeme.
  const beerId =
    await resolveCatalogData(
      supabase,
      values,
      true
    );

  // ==================================================
  // UPDATE
  // ==================================================

  const {
    error:
      updateError,
  } =
    await supabase
      .from("tastings")
      .update({
        beer_id:
          beerId,

        tasted_on:
          values.tastedOn,

        packaging:
          values.packaging,

        quantity:
          values.quantity,

        plato:
          values.platoValue
            ? Number(
                values.platoValue
              )
            : null,

        abv:
          values.abvValue
            ? Number(
                values.abvValue
              )
            : null,

        ibu:
          values.ibuValue
            ? Number(
                values.ibuValue
              )
            : null,

        place:
          values.place ||
          null,

        notes:
          values.notes ||
          null,
      })
      .eq(
        "id",
        tastingId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    updateError
  ) {
    throw new Error(
      updateError.message
    );
  }

  try {
    await syncUserAchievements(
      user.id
    );
  } catch (error) {
    console.error(
      "Achievement sync failed:",
      error
    );
  }

  revalidateTastingPages(
    user.id
  );

  return {
    success: true,
  };
}

// ==================================================
// SMAZÁNÍ OCHUTNÁVKY
// ==================================================

export async function deleteTastingInModal(
  tastingId: number
) {
  const supabase =
    await createClient();

  const user =
    await getCurrentUser(
      supabase
    );

  if (
    !Number.isInteger(
      tastingId
    ) ||
    tastingId < 1
  ) {
    throw new Error(
      "Neplatné ID ochutnávky."
    );
  }

  // ==================================================
  // OVĚŘENÍ VLASTNICTVÍ
  // ==================================================

  const {
    data:
      existingTasting,
    error:
      existingTastingError,
  } =
    await supabase
      .from("tastings")
      .select(
        "id, user_id"
      )
      .eq(
        "id",
        tastingId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    existingTastingError
  ) {
    throw new Error(
      existingTastingError.message
    );
  }

  if (
    !existingTasting
  ) {
    throw new Error(
      "Ochutnávka nebyla nalezena nebo ji nemáte oprávnění smazat."
    );
  }

  // ==================================================
  // DELETE
  // ==================================================

  const {
    error:
      deleteError,
  } =
    await supabase
      .from("tastings")
      .delete()
      .eq(
        "id",
        tastingId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    deleteError
  ) {
    throw new Error(
      deleteError.message
    );
  }

  revalidateTastingPages(
    user.id
  );

  return {
    success: true,
  };
}

// ==================================================
// NOVÁ OCHUTNÁVKA + REDIRECT
// ==================================================

export async function saveTastingAndRedirect(
  formData: FormData
) {
  await saveTastingCore(
    formData
  );

  redirect("/");
}

// ==================================================
// NOVÁ OCHUTNÁVKA V MODALU
// ==================================================

export async function saveTastingInModal(
  formData: FormData
) {
  await saveTastingCore(
    formData
  );

  return {
    success: true,
  };
}