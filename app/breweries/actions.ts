"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readOptionalInteger(
  formData: FormData,
  key: string
): number | null {
  const value = String(
    formData.get(key) || ""
  ).trim();

  if (!value) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new Error(
      `Pole ${key} musí být celé číslo.`
    );
  }

  return number;
}

function readOptionalNumber(
  formData: FormData,
  key: string
): number | null {
  const value = String(
    formData.get(key) || ""
  )
    .trim()
    .replace(",", ".");

  if (!value) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      `Pole ${key} musí být číslo.`
    );
  }

  return number;
}

async function getCanonicalCountry(
  countryName: string
) {
  if (!countryName) {
    return null;
  }

  const supabase =
    await createClient();

  const {
    data: countries,
    error,
  } = await supabase
    .from("countries")
    .select("name");

  if (error) {
    throw new Error(
      error.message
    );
  }

  const normalized =
    normalizeText(countryName);

  const country =
    countries?.find(
      (item) =>
        normalizeText(
          item.name
        ) === normalized
    ) ?? null;

  if (!country) {
    throw new Error(
      "Zadaná země není v katalogu."
    );
  }

  return country.name;
}

async function requireUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Uživatel není přihlášen."
    );
  }

  return {
    supabase,
    user,
  };
}

function readBreweryFormData(
  formData: FormData
) {
  const name = String(
    formData.get("name") || ""
  ).trim();

  const city = String(
    formData.get("city") || ""
  ).trim();

  const country = String(
    formData.get("country") || ""
  ).trim();

  const address = String(
    formData.get("address") || ""
  ).trim();

  const website = String(
    formData.get("website") || ""
  ).trim();

  const foundedYear =
    readOptionalInteger(
      formData,
      "foundedYear"
    );

  const closedYear =
    readOptionalInteger(
      formData,
      "closedYear"
    );

  const latitude =
    readOptionalNumber(
      formData,
      "latitude"
    );

  const longitude =
    readOptionalNumber(
      formData,
      "longitude"
    );

  if (!name) {
    throw new Error(
      "Název pivovaru je povinný."
    );
  }

  if (
    foundedYear !== null &&
    (foundedYear < 1000 ||
      foundedYear > 2100)
  ) {
    throw new Error(
      "Rok založení není platný."
    );
  }

  if (
    closedYear !== null &&
    (closedYear < 1000 ||
      closedYear > 2100)
  ) {
    throw new Error(
      "Rok ukončení není platný."
    );
  }

  if (
    foundedYear !== null &&
    closedYear !== null &&
    closedYear < foundedYear
  ) {
    throw new Error(
      "Rok ukončení nemůže být před rokem založení."
    );
  }

  if (
    latitude !== null &&
    (latitude < -90 ||
      latitude > 90)
  ) {
    throw new Error(
      "Zeměpisná šířka musí být mezi -90 a 90."
    );
  }

  if (
    longitude !== null &&
    (longitude < -180 ||
      longitude > 180)
  ) {
    throw new Error(
      "Zeměpisná délka musí být mezi -180 a 180."
    );
  }

  return {
    name,
    city,
    country,
    address,
    website,
    foundedYear,
    closedYear,
    latitude,
    longitude,
  };
}

export async function createBrewery(
  formData: FormData
) {
  const {
    supabase,
  } = await requireUser();

  const values =
    readBreweryFormData(
      formData
    );

  const canonicalCountry =
    await getCanonicalCountry(
      values.country
    );

  const {
    data: breweries,
    error: breweriesError,
  } = await supabase
    .from("breweries")
    .select("id, name");

  if (breweriesError) {
    throw new Error(
      breweriesError.message
    );
  }

  const duplicate =
    breweries?.find(
      (brewery) =>
        normalizeText(
          brewery.name
        ) ===
        normalizeText(
          values.name
        )
    );

  if (duplicate) {
    throw new Error(
      "Pivovar s tímto názvem už v katalogu existuje."
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from("breweries")
    .insert({
      name: values.name,
      city:
        values.city || null,
      country:
        canonicalCountry,
      address:
        values.address || null,
      website:
        values.website || null,
      founded_year:
        values.foundedYear,
      closed_year:
        values.closedYear,
      latitude:
        values.latitude,
      longitude:
        values.longitude,
    });

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }

  revalidatePath(
    "/breweries"
  );
}

export async function updateBrewery(
  breweryId: number,
  formData: FormData
) {
  const {
    supabase,
  } = await requireUser();

  if (
    !Number.isInteger(
      breweryId
    ) ||
    breweryId < 1
  ) {
    throw new Error(
      "Neplatné ID pivovaru."
    );
  }

  const values =
    readBreweryFormData(
      formData
    );

  const canonicalCountry =
    await getCanonicalCountry(
      values.country
    );

  const {
    data: breweries,
    error: breweriesError,
  } = await supabase
    .from("breweries")
    .select("id, name");

  if (breweriesError) {
    throw new Error(
      breweriesError.message
    );
  }

  const duplicate =
    breweries?.find(
      (brewery) =>
        brewery.id !==
          breweryId &&
        normalizeText(
          brewery.name
        ) ===
          normalizeText(
            values.name
          )
    );

  if (duplicate) {
    throw new Error(
      "Jiný pivovar s tímto názvem už v katalogu existuje."
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("breweries")
    .update({
      name: values.name,
      city:
        values.city || null,
      country:
        canonicalCountry,
      address:
        values.address || null,
      website:
        values.website || null,
      founded_year:
        values.foundedYear,
      closed_year:
        values.closedYear,
      latitude:
        values.latitude,
      longitude:
        values.longitude,
    })
    .eq(
      "id",
      breweryId
    );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidatePath(
    "/breweries"
  );
  revalidatePath(
    "/beers"
  );
  revalidatePath(
    "/"
  );
}

// ==================================================
// HISTORIE NÁZVU PIVOVARU
// ==================================================

export async function addBreweryNameHistory(
  breweryId: number,
  formData: FormData
) {
  const {
    supabase,
  } = await requireUser();

  if (
    !Number.isInteger(
      breweryId
    ) ||
    breweryId < 1
  ) {
    throw new Error(
      "Neplatné ID pivovaru."
    );
  }

  const previousName =
    String(
      formData.get(
        "previousName"
      ) || ""
    ).trim();

  const fromYear =
    readOptionalInteger(
      formData,
      "fromYear"
    );

  const changedYear =
    readOptionalInteger(
      formData,
      "changedYear"
    );

  if (!previousName) {
    throw new Error(
      "Předchozí název je povinný."
    );
  }

  if (
    fromYear !== null &&
    (
      fromYear < 1000 ||
      fromYear > 2100
    )
  ) {
    throw new Error(
      "Počáteční rok není platný."
    );
  }

  if (
    changedYear !== null &&
    (
      changedYear < 1000 ||
      changedYear > 2100
    )
  ) {
    throw new Error(
      "Koncový rok není platný."
    );
  }

  if (
    fromYear !== null &&
    changedYear !== null &&
    changedYear < fromYear
  ) {
    throw new Error(
      "Koncový rok nemůže být před počátečním rokem."
    );
  }

  const {
    data: brewery,
    error: breweryError,
  } = await supabase
    .from("breweries")
    .select("id, name")
    .eq("id", breweryId)
    .single();

  if (
    breweryError ||
    !brewery
  ) {
    throw new Error(
      breweryError?.message ||
        "Pivovar nebyl nalezen."
    );
  }

  if (
    normalizeText(
      brewery.name
    ) ===
    normalizeText(
      previousName
    )
  ) {
    throw new Error(
      "Historický název nemůže být stejný jako současný název pivovaru."
    );
  }

  const {
    data: existingHistory,
    error: historyError,
  } = await supabase
    .from(
      "brewery_name_history"
    )
    .select(
      "id, previous_name, from_year, changed_year"
    )
    .eq(
      "brewery_id",
      breweryId
    );

  if (historyError) {
    throw new Error(
      historyError.message
    );
  }

  const duplicate =
    existingHistory?.find(
      (item) =>
        normalizeText(
          item.previous_name
        ) ===
          normalizeText(
            previousName
          ) &&
        item.from_year ===
          fromYear &&
        item.changed_year ===
          changedYear
    );

  if (duplicate) {
    throw new Error(
      "Tento historický název už je u pivovaru uložený."
    );
  }

  const {
    error: insertError,
  } = await supabase
    .from(
      "brewery_name_history"
    )
    .insert({
      brewery_id:
        breweryId,
      previous_name:
        previousName,
      from_year:
        fromYear,
      changed_year:
        changedYear,
    });

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }

  revalidatePath(
    "/breweries"
  );

  revalidatePath(
    `/breweries/${breweryId}`
  );
}

export async function updateBreweryNameHistory(
  breweryId: number,
  historyId: number,
  formData: FormData
) {
  const {
    supabase,
  } = await requireUser();

  if (
    !Number.isInteger(breweryId) ||
    breweryId < 1 ||
    !Number.isInteger(historyId) ||
    historyId < 1
  ) {
    throw new Error(
      "Neplatný záznam historie."
    );
  }

  const previousName = String(
    formData.get("previousName") || ""
  ).trim();

  const fromYear =
    readOptionalInteger(
      formData,
      "fromYear"
    );

  const changedYear =
    readOptionalInteger(
      formData,
      "changedYear"
    );

  if (!previousName) {
    throw new Error(
      "Historický název je povinný."
    );
  }

  if (
    fromYear !== null &&
    (fromYear < 1000 ||
      fromYear > 2100)
  ) {
    throw new Error(
      "Počáteční rok není platný."
    );
  }

  if (
    changedYear !== null &&
    (changedYear < 1000 ||
      changedYear > 2100)
  ) {
    throw new Error(
      "Koncový rok není platný."
    );
  }

  if (
    fromYear !== null &&
    changedYear !== null &&
    changedYear < fromYear
  ) {
    throw new Error(
      "Koncový rok nemůže být před počátečním rokem."
    );
  }

  const {
    data: brewery,
    error: breweryError,
  } = await supabase
    .from("breweries")
    .select("id, name")
    .eq("id", breweryId)
    .single();

  if (
    breweryError ||
    !brewery
  ) {
    throw new Error(
      breweryError?.message ||
        "Pivovar nebyl nalezen."
    );
  }

  if (
    normalizeText(brewery.name) ===
    normalizeText(previousName)
  ) {
    throw new Error(
      "Historický název nemůže být stejný jako současný název pivovaru."
    );
  }

  const {
    data: history,
    error: historyError,
  } = await supabase
    .from("brewery_name_history")
    .select(
      "id, previous_name, from_year, changed_year"
    )
    .eq("brewery_id", breweryId);

  if (historyError) {
    throw new Error(
      historyError.message
    );
  }

  const duplicate =
    history?.find(
      (item) =>
        item.id !== historyId &&
        normalizeText(
          item.previous_name
        ) ===
          normalizeText(
            previousName
          ) &&
        item.from_year ===
          fromYear &&
        item.changed_year ===
          changedYear
    );

  if (duplicate) {
    throw new Error(
      "Stejný historický záznam už existuje."
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("brewery_name_history")
    .update({
      previous_name:
        previousName,
      from_year:
        fromYear,
      changed_year:
        changedYear,
    })
    .eq("id", historyId)
    .eq("brewery_id", breweryId);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  revalidatePath("/breweries");
  revalidatePath(
    `/breweries/${breweryId}`
  );
}

export async function deleteBreweryNameHistory(
  breweryId: number,
  historyId: number
) {
  const {
    supabase,
  } = await requireUser();

  if (
    !Number.isInteger(breweryId) ||
    breweryId < 1 ||
    !Number.isInteger(historyId) ||
    historyId < 1
  ) {
    throw new Error(
      "Neplatný záznam historie."
    );
  }

  const {
    error,
  } = await supabase
    .from("brewery_name_history")
    .delete()
    .eq("id", historyId)
    .eq("brewery_id", breweryId);

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath("/breweries");
  revalidatePath(
    `/breweries/${breweryId}`
  );
}

const CATALOG_ADMIN_USER_ID =
  "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

function readCatalogBeerHopNames(
  formData: FormData
) {
  return Array.from(
    new Set(
      formData
        .getAll("hopNames")
        .flatMap((value) =>
          String(value)
            .split(",")
            .map((item) =>
              item.trim()
            )
        )
        .filter(Boolean)
    )
  );
}

async function resolveCatalogBeerStyle(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  styleName: string
) {
  if (!styleName) {
    return null;
  }

  const {
    data: styles,
    error,
  } = await supabase
    .from("beer_styles")
    .select(
      "id, name, aliases"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const normalized =
    normalizeText(styleName);

  const style =
    styles?.find(
      (item) =>
        normalizeText(
          item.name
        ) === normalized ||
        (
          item.aliases ?? []
        ).some(
          (alias: string) =>
            normalizeText(
              alias
            ) === normalized
        )
    ) ?? null;

  if (!style) {
    throw new Error(
      "Zadaný pivní styl není v katalogu."
    );
  }

  return style.id;
}

async function resolveCatalogBeerHops(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  hopNames: string[]
) {
  if (
    hopNames.length === 0
  ) {
    return [];
  }

  const {
    data: hops,
    error,
  } = await supabase
    .from("hops")
    .select(
      "id, name, aliases"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const hopIds: number[] = [];

  for (
    const hopName
    of hopNames
  ) {
    const normalized =
      normalizeText(
        hopName
      );

    const hop =
      hops?.find(
        (item) =>
          normalizeText(
            item.name
          ) === normalized ||
          (
            item.aliases ?? []
          ).some(
            (alias: string) =>
              normalizeText(
                alias
              ) === normalized
          )
      ) ?? null;

    if (!hop) {
      throw new Error(
        `Chmel "${hopName}" není v katalogu.`
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

export async function createCatalogBeer(
  breweryId: number,
  formData: FormData
) {
  const {
    supabase,
    user,
  } = await requireUser();

  if (
    user.id !==
    CATALOG_ADMIN_USER_ID
  ) {
    throw new Error(
      "Tuto akci může provést pouze administrátor."
    );
  }

  if (
    !Number.isInteger(
      breweryId
    ) ||
    breweryId < 1
  ) {
    throw new Error(
      "Neplatné ID pivovaru."
    );
  }

  const name = String(
    formData.get("name") ||
      ""
  ).trim();

  const styleName =
    String(
      formData.get(
        "styleName"
      ) || ""
    ).trim();

  const plato =
    readOptionalNumber(
      formData,
      "plato"
    );

  const abv =
    readOptionalNumber(
      formData,
      "abv"
    );

  const ibu =
    readOptionalNumber(
      formData,
      "ibu"
    );

  const hopNames =
    readCatalogBeerHopNames(
      formData
    );

  if (!name) {
    throw new Error(
      "Název piva je povinný."
    );
  }

  const {
    data: brewery,
    error: breweryError,
  } = await supabase
    .from("breweries")
    .select("id, name")
    .eq(
      "id",
      breweryId
    )
    .single();

  if (
    breweryError ||
    !brewery
  ) {
    throw new Error(
      breweryError?.message ||
        "Pivovar nebyl nalezen."
    );
  }

  const {
    data: breweryBeers,
    error:
      breweryBeersError,
  } = await supabase
    .from("beers")
    .select("id, name")
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

  const duplicate =
    breweryBeers?.find(
      (beer) =>
        normalizeText(
          beer.name
        ) ===
        normalizeText(name)
    ) ?? null;

  if (duplicate) {
    throw new Error(
      "Pivo s tímto názvem už u tohoto pivovaru existuje."
    );
  }

  const styleId =
    await resolveCatalogBeerStyle(
      supabase,
      styleName
    );

  const hopIds =
    await resolveCatalogBeerHops(
      supabase,
      hopNames
    );

  const {
    data: newBeer,
    error: beerError,
  } = await supabase
    .from("beers")
    .insert({
      name,
      brewery_id:
        breweryId,
      style_id:
        styleId,
      plato,
      abv,
      ibu,
    })
    .select("id")
    .single();

  if (
    beerError ||
    !newBeer
  ) {
    throw new Error(
      beerError?.message ||
        "Pivo se nepodařilo vytvořit."
    );
  }

  if (
    hopIds.length > 0
  ) {
    const {
      error: hopsError,
    } = await supabase
      .from("beer_hops")
      .insert(
        hopIds.map(
          (hopId) => ({
            beer_id:
              newBeer.id,
            hop_id:
              hopId,
          })
        )
      );

    if (hopsError) {
      await supabase
        .from("beers")
        .delete()
        .eq(
          "id",
          newBeer.id
        );

      throw new Error(
        hopsError.message
      );
    }
  }

  revalidatePath("/");
  revalidatePath(
    "/breweries"
  );
  revalidatePath(
    `/breweries/${breweryId}`
  );
  revalidatePath(
    "/tastings/new"
  );

  return {
    success: true,
    beerId:
      newBeer.id,
  };
}
async function replaceCatalogBeerHops(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  beerId: number,
  hopIds: number[]
) {
  const {
    error: deleteError,
  } = await supabase
    .from("beer_hops")
    .delete()
    .eq("beer_id", beerId);

  if (deleteError) {
    throw new Error(
      deleteError.message
    );
  }

  if (hopIds.length === 0) {
    return;
  }

  const {
    error: insertError,
  } = await supabase
    .from("beer_hops")
    .insert(
      hopIds.map((hopId) => ({
        beer_id: beerId,
        hop_id: hopId,
      }))
    );

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }
}

function revalidateCatalogBeerPages(
  breweryId: number
) {
  revalidatePath("/");
  revalidatePath("/beers");
  revalidatePath("/breweries");
  revalidatePath(
    `/breweries/${breweryId}`
  );
  revalidatePath(
    "/tastings/new"
  );
  revalidatePath("/me");
  revalidatePath("/profiles");
  revalidatePath("/stats");
}

export async function updateCatalogBeer(
  breweryId: number,
  beerId: number,
  formData: FormData
) {
  const {
    supabase,
    user,
  } = await requireUser();

  if (
    user.id !==
    CATALOG_ADMIN_USER_ID
  ) {
    throw new Error(
      "Tuto akci může provést pouze administrátor."
    );
  }

  if (
    !Number.isInteger(
      breweryId
    ) ||
    breweryId < 1
  ) {
    throw new Error(
      "Neplatné ID pivovaru."
    );
  }

  if (
    !Number.isInteger(
      beerId
    ) ||
    beerId < 1
  ) {
    throw new Error(
      "Neplatné ID piva."
    );
  }

  const name = String(
    formData.get("name") ||
      ""
  ).trim();

  const styleName =
    String(
      formData.get(
        "styleName"
      ) || ""
    ).trim();

  const plato =
    readOptionalNumber(
      formData,
      "plato"
    );

  const abv =
    readOptionalNumber(
      formData,
      "abv"
    );

  const ibu =
    readOptionalNumber(
      formData,
      "ibu"
    );

  const hopNames =
    readCatalogBeerHopNames(
      formData
    );

  if (!name) {
    throw new Error(
      "Název piva je povinný."
    );
  }

  const {
    data: existingBeer,
    error: existingBeerError,
  } = await supabase
    .from("beers")
    .select(`
      id,
      name,
      brewery_id,
      style_id,
      plato,
      abv,
      ibu
    `)
    .eq("id", beerId)
    .eq(
      "brewery_id",
      breweryId
    )
    .maybeSingle();

  if (existingBeerError) {
    throw new Error(
      existingBeerError.message
    );
  }

  if (!existingBeer) {
    throw new Error(
      "Pivo nebylo nalezeno u tohoto pivovaru."
    );
  }

  const {
    data: otherBeers,
    error: otherBeersError,
  } = await supabase
    .from("beers")
    .select("id, name")
    .eq(
      "brewery_id",
      breweryId
    )
    .neq("id", beerId);

  if (otherBeersError) {
    throw new Error(
      otherBeersError.message
    );
  }

  const duplicate =
    otherBeers?.find(
      (beer) =>
        normalizeText(
          beer.name
        ) ===
        normalizeText(name)
    ) ?? null;

  if (duplicate) {
    throw new Error(
      "Pivo s tímto názvem už u tohoto pivovaru existuje."
    );
  }

  const styleId =
    await resolveCatalogBeerStyle(
      supabase,
      styleName
    );

  const hopIds =
    await resolveCatalogBeerHops(
      supabase,
      hopNames
    );

  const {
    data: oldHopRows,
    error: oldHopsError,
  } = await supabase
    .from("beer_hops")
    .select("hop_id")
    .eq(
      "beer_id",
      beerId
    );

  if (oldHopsError) {
    throw new Error(
      oldHopsError.message
    );
  }

  const oldHopIds =
    (oldHopRows ?? []).map(
      (row) => row.hop_id
    );

  const {
    error: updateError,
  } = await supabase
    .from("beers")
    .update({
      name,
      style_id: styleId,
      plato,
      abv,
      ibu,
    })
    .eq("id", beerId)
    .eq(
      "brewery_id",
      breweryId
    );

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  try {
    await replaceCatalogBeerHops(
      supabase,
      beerId,
      hopIds
    );
  } catch (error) {
    const {
      error: beerRollbackError,
    } = await supabase
      .from("beers")
      .update({
        name:
          existingBeer.name,
        style_id:
          existingBeer.style_id,
        plato:
          existingBeer.plato,
        abv:
          existingBeer.abv,
        ibu:
          existingBeer.ibu,
      })
      .eq("id", beerId)
      .eq(
        "brewery_id",
        breweryId
      );

    if (
      beerRollbackError
    ) {
      console.error(
        "Catalog beer rollback failed:",
        beerRollbackError
      );
    }

    try {
      await replaceCatalogBeerHops(
        supabase,
        beerId,
        oldHopIds
      );
    } catch (
      hopsRollbackError
    ) {
      console.error(
        "Catalog beer hops rollback failed:",
        hopsRollbackError
      );
    }

    throw error;
  }

  revalidateCatalogBeerPages(
    breweryId
  );

  return {
    success: true,
    beerId,
  };
}

export async function deleteCatalogBeer(
  breweryId: number,
  beerId: number
) {
  const {
    supabase,
    user,
  } = await requireUser();

  if (
    user.id !==
    CATALOG_ADMIN_USER_ID
  ) {
    throw new Error(
      "Tuto akci může provést pouze administrátor."
    );
  }

  if (
    !Number.isInteger(
      breweryId
    ) ||
    breweryId < 1
  ) {
    throw new Error(
      "Neplatné ID pivovaru."
    );
  }

  if (
    !Number.isInteger(
      beerId
    ) ||
    beerId < 1
  ) {
    throw new Error(
      "Neplatné ID piva."
    );
  }

  const {
    data: beer,
    error: beerError,
  } = await supabase
    .from("beers")
    .select(
      "id, name, brewery_id"
    )
    .eq("id", beerId)
    .eq(
      "brewery_id",
      breweryId
    )
    .maybeSingle();

  if (beerError) {
    throw new Error(
      beerError.message
    );
  }

  if (!beer) {
    throw new Error(
      "Pivo nebylo nalezeno u tohoto pivovaru."
    );
  }

  const {
    data: tastingRows,
    error: tastingsError,
  } = await supabase
    .from("tastings")
    .select("id")
    .eq(
      "beer_id",
      beerId
    )
    .limit(1);

  if (tastingsError) {
    throw new Error(
      tastingsError.message
    );
  }

  if (
    (tastingRows ?? [])
      .length > 0
  ) {
    throw new Error(
      "Pivo nelze smazat, protože má evidované ochutnávky."
    );
  }

  const {
    data: oldHopRows,
    error: oldHopsError,
  } = await supabase
    .from("beer_hops")
    .select("hop_id")
    .eq(
      "beer_id",
      beerId
    );

  if (oldHopsError) {
    throw new Error(
      oldHopsError.message
    );
  }

  const oldHopIds =
    (oldHopRows ?? []).map(
      (row) => row.hop_id
    );

  await replaceCatalogBeerHops(
    supabase,
    beerId,
    []
  );

  const {
    data: deletedBeer,
    error: deleteError,
  } = await supabase
    .from("beers")
    .delete()
    .eq("id", beerId)
    .eq(
      "brewery_id",
      breweryId
    )
    .select("id")
    .maybeSingle();

  if (
    deleteError ||
    !deletedBeer
  ) {
    try {
      await replaceCatalogBeerHops(
        supabase,
        beerId,
        oldHopIds
      );
    } catch (
      hopsRollbackError
    ) {
      console.error(
        "Catalog beer delete rollback failed:",
        hopsRollbackError
      );
    }

    throw new Error(
      deleteError?.message ||
        "Pivo se nepodařilo smazat."
    );
  }

  revalidateCatalogBeerPages(
    breweryId
  );

  return {
    success: true,
    beerId,
  };
}
