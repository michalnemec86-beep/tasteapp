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
    changedYear !== null &&
    (
      changedYear < 1000 ||
      changedYear > 2100
    )
  ) {
    throw new Error(
      "Rok změny není platný."
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
      "id, previous_name, changed_year"
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
