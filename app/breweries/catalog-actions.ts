"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CATALOG_ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Pole ${key} musí být číslo.`);
  return value;
}

function readOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readNames(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .flatMap((value) => String(value).split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Uživatel není přihlášen.");
  return { supabase, user };
}

async function resolveStyleId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  styleName: string | null
) {
  if (!styleName) return null;

  const { data, error } = await supabase
    .from("beer_styles")
    .select("id, name, aliases");
  if (error) throw new Error(error.message);

  const query = normalizeText(styleName);
  const style = data?.find((item) =>
    normalizeText(item.name) === query ||
    (item.aliases ?? []).some((alias: string) => normalizeText(alias) === query)
  );

  if (!style) throw new Error(`Pivní styl „${styleName}“ není v katalogu.`);
  return style.id;
}

async function resolveHopIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hopNames: string[]
) {
  if (hopNames.length === 0) return [] as number[];

  const { data, error } = await supabase
    .from("hops")
    .select("id, name, aliases");
  if (error) throw new Error(error.message);

  return hopNames.map((hopName) => {
    const query = normalizeText(hopName);
    const hop = data?.find((item) =>
      normalizeText(item.name) === query ||
      (item.aliases ?? []).some((alias: string) => normalizeText(alias) === query)
    );
    if (!hop) throw new Error(`Chmel „${hopName}“ není v katalogu.`);
    return hop.id;
  });
}

async function resolveBrandId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandName: string
) {
  const cleanBrandName = brandName.trim();
  if (!cleanBrandName) {
    throw new Error("Značka piva je povinná.");
  }

  const { data: brands, error } = await supabase
    .from("brands")
    .select("id, name");
  if (error) throw new Error(error.message);

  const query = normalizeText(cleanBrandName);
  const existing = brands?.find((brand) => normalizeText(brand.name) === query);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("brands")
    .insert({ name: cleanBrandName })
    .select("id")
    .single();
  if (createError || !created) {
    throw new Error(createError?.message || "Značku se nepodařilo vytvořit.");
  }
  return created.id;
}

async function resolveCollaboratorIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  breweryId: number,
  names: string[]
) {
  if (names.length === 0) return [] as number[];

  const [{ data: breweries, error }, { data: history, error: historyError }] =
    await Promise.all([
      supabase.from("breweries").select("id, name"),
      supabase.from("brewery_name_history").select("brewery_id, previous_name"),
    ]);
  if (error) throw new Error(error.message);
  if (historyError) throw new Error(historyError.message);

  const ids: number[] = [];
  for (const name of names) {
    const query = normalizeText(name);
    const current = breweries?.find((item) => normalizeText(item.name) === query);
    const historical = history?.find((item) => normalizeText(item.previous_name) === query);
    const id = current?.id ?? historical?.brewery_id ?? null;
    if (!id) throw new Error(`Pivovar „${name}“ nebyl nalezen.`);
    if (id !== breweryId && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

async function replaceBeerHops(
  supabase: Awaited<ReturnType<typeof createClient>>,
  beerId: number,
  hopIds: number[]
) {
  const { error: deleteError } = await supabase
    .from("beer_hops")
    .delete()
    .eq("beer_id", beerId);
  if (deleteError) throw new Error(deleteError.message);

  if (hopIds.length > 0) {
    const { error } = await supabase
      .from("beer_hops")
      .insert(hopIds.map((hopId) => ({ beer_id: beerId, hop_id: hopId })));
    if (error) throw new Error(error.message);
  }
}

async function replaceVersionHops(
  supabase: Awaited<ReturnType<typeof createClient>>,
  versionId: number,
  hopIds: number[]
) {
  const { error: deleteError } = await supabase
    .from("beer_version_hops")
    .delete()
    .eq("beer_version_id", versionId);
  if (deleteError) throw new Error(deleteError.message);

  if (hopIds.length > 0) {
    const { error } = await supabase
      .from("beer_version_hops")
      .insert(hopIds.map((hopId) => ({ beer_version_id: versionId, hop_id: hopId })));
    if (error) throw new Error(error.message);
  }
}

async function replaceCollaborators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  versionId: number,
  breweryIds: number[]
) {
  const { error: deleteError } = await supabase
    .from("beer_version_collaborators")
    .delete()
    .eq("beer_version_id", versionId);
  if (deleteError) throw new Error(deleteError.message);

  if (breweryIds.length > 0) {
    const { error } = await supabase
      .from("beer_version_collaborators")
      .insert(
        breweryIds.map((breweryId, index) => ({
          beer_version_id: versionId,
          brewery_id: breweryId,
          display_order: index + 1,
        }))
      );
    if (error) throw new Error(error.message);
  }
}

function revalidateCatalog(breweryId: number, beerId?: number) {
  revalidatePath("/");
  revalidatePath("/beers");
  revalidatePath("/breweries");
  revalidatePath(`/breweries/${breweryId}`);
  if (beerId) revalidatePath(`/beers/${beerId}`);
  revalidatePath("/tastings/new");
  revalidatePath("/me");
  revalidatePath("/profiles");
  revalidatePath("/stats");
}

function readBeerValues(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brandName = String(formData.get("brandName") ?? "").trim();

  if (!name) throw new Error("Název piva je povinný.");
  if (!brandName) {
    throw new Error(
      "Značka je povinná. Pivovar, značka a konkrétní pivo se v TasteAppu evidují samostatně."
    );
  }

  return {
    name,
    brandName,
    styleName: readOptionalText(formData, "styleName"),
    plato: readOptionalNumber(formData, "plato"),
    abv: readOptionalNumber(formData, "abv"),
    ibu: readOptionalNumber(formData, "ibu"),
    ebc: readOptionalNumber(formData, "ebc"),
    notes: readOptionalText(formData, "notes"),
    photoUrl: readOptionalText(formData, "photoUrl"),
    isNonAlcoholic: formData.get("isNonAlcoholic") === "on",
    hopNames: readNames(formData, "hopNames"),
    collaboratorNames: readNames(formData, "collaboratorNames"),
  };
}

export async function createCatalogBeer(breweryId: number, formData: FormData) {
  const { supabase } = await requireUser();
  if (!Number.isInteger(breweryId) || breweryId < 1) throw new Error("Neplatné ID pivovaru.");

  const values = readBeerValues(formData);

  const { data: brewery, error: breweryError } = await supabase
    .from("breweries")
    .select("id")
    .eq("id", breweryId)
    .maybeSingle();
  if (breweryError || !brewery) throw new Error(breweryError?.message || "Pivovar nebyl nalezen.");

  const { data: beers, error: beersError } = await supabase
    .from("beers")
    .select("id, name")
    .eq("brewery_id", breweryId);
  if (beersError) throw new Error(beersError.message);
  if (beers?.some((beer) => normalizeText(beer.name) === normalizeText(values.name))) {
    throw new Error("Pivo s tímto názvem už u tohoto pivovaru existuje.");
  }

  const [styleId, hopIds, brandId, collaboratorIds] = await Promise.all([
    resolveStyleId(supabase, values.styleName),
    resolveHopIds(supabase, values.hopNames),
    resolveBrandId(supabase, values.brandName),
    resolveCollaboratorIds(supabase, breweryId, values.collaboratorNames),
  ]);

  const { data: beer, error: beerError } = await supabase
    .from("beers")
    .insert({
      name: values.name,
      brewery_id: breweryId,
      brand_id: brandId,
      style_id: styleId,
      plato: values.plato,
      abv: values.abv,
      ibu: values.ibu,
      ebc: values.ebc,
      notes: values.notes,
      photo_url: values.photoUrl,
      is_non_alcoholic: values.isNonAlcoholic,
    })
    .select("id")
    .single();
  if (beerError || !beer) throw new Error(beerError?.message || "Pivo se nepodařilo vytvořit.");

  try {
    await replaceBeerHops(supabase, beer.id, hopIds);

    const { data: version, error: versionError } = await supabase
      .from("beer_versions")
      .insert({
        beer_id: beer.id,
        brewery_id: breweryId,
        style_id: styleId,
        plato: values.plato,
        abv: values.abv,
        ibu: values.ibu,
        notes: values.notes,
        is_current: true,
      })
      .select("id")
      .single();
    if (versionError || !version) throw new Error(versionError?.message || "Aktuální verzi piva se nepodařilo vytvořit.");

    await replaceVersionHops(supabase, version.id, hopIds);
    await replaceCollaborators(supabase, version.id, collaboratorIds);
  } catch (error) {
    await supabase.from("beers").delete().eq("id", beer.id);
    throw error;
  }

  revalidateCatalog(breweryId, beer.id);
  return { success: true, beerId: beer.id };
}

export async function updateCatalogBeer(
  breweryId: number,
  beerId: number,
  formData: FormData
) {
  const { supabase } = await requireUser();
  if (!Number.isInteger(breweryId) || breweryId < 1) throw new Error("Neplatné ID pivovaru.");
  if (!Number.isInteger(beerId) || beerId < 1) throw new Error("Neplatné ID piva.");

  const values = readBeerValues(formData);

  const { data: beer, error: beerError } = await supabase
    .from("beers")
    .select("id, brewery_id")
    .eq("id", beerId)
    .eq("brewery_id", breweryId)
    .maybeSingle();
  if (beerError || !beer) throw new Error(beerError?.message || "Pivo nebylo nalezeno u tohoto pivovaru.");

  const { data: otherBeers, error: otherError } = await supabase
    .from("beers")
    .select("id, name")
    .eq("brewery_id", breweryId)
    .neq("id", beerId);
  if (otherError) throw new Error(otherError.message);
  if (otherBeers?.some((item) => normalizeText(item.name) === normalizeText(values.name))) {
    throw new Error("Pivo s tímto názvem už u tohoto pivovaru existuje.");
  }

  const [styleId, hopIds, brandId, collaboratorIds] = await Promise.all([
    resolveStyleId(supabase, values.styleName),
    resolveHopIds(supabase, values.hopNames),
    resolveBrandId(supabase, values.brandName),
    resolveCollaboratorIds(supabase, breweryId, values.collaboratorNames),
  ]);

  const { error: updateError } = await supabase
    .from("beers")
    .update({
      name: values.name,
      brand_id: brandId,
      style_id: styleId,
      plato: values.plato,
      abv: values.abv,
      ibu: values.ibu,
      ebc: values.ebc,
      notes: values.notes,
      photo_url: values.photoUrl,
      is_non_alcoholic: values.isNonAlcoholic,
    })
    .eq("id", beerId)
    .eq("brewery_id", breweryId);
  if (updateError) throw new Error(updateError.message);

  await replaceBeerHops(supabase, beerId, hopIds);

  const { data: currentVersion, error: currentError } = await supabase
    .from("beer_versions")
    .select("id")
    .eq("beer_id", beerId)
    .eq("is_current", true)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);

  let versionId = currentVersion?.id ?? null;
  if (versionId) {
    const { error } = await supabase
      .from("beer_versions")
      .update({
        brewery_id: breweryId,
        style_id: styleId,
        plato: values.plato,
        abv: values.abv,
        ibu: values.ibu,
        notes: values.notes,
      })
      .eq("id", versionId);
    if (error) throw new Error(error.message);
  } else {
    const { data: created, error } = await supabase
      .from("beer_versions")
      .insert({
        beer_id: beerId,
        brewery_id: breweryId,
        style_id: styleId,
        plato: values.plato,
        abv: values.abv,
        ibu: values.ibu,
        notes: values.notes,
        is_current: true,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message || "Aktuální verzi piva se nepodařilo vytvořit.");
    versionId = created.id;
  }

  await replaceVersionHops(supabase, versionId, hopIds);
  await replaceCollaborators(supabase, versionId, collaboratorIds);

  revalidateCatalog(breweryId, beerId);
  return { success: true, beerId };
}

export async function deleteCatalogBeer(breweryId: number, beerId: number) {
  const { supabase, user } = await requireUser();
  if (!Number.isInteger(breweryId) || breweryId < 1) throw new Error("Neplatné ID pivovaru.");
  if (!Number.isInteger(beerId) || beerId < 1) throw new Error("Neplatné ID piva.");

  const { data: beer, error: beerError } = await supabase
    .from("beers")
    .select("id")
    .eq("id", beerId)
    .eq("brewery_id", breweryId)
    .maybeSingle();
  if (beerError || !beer) throw new Error(beerError?.message || "Pivo nebylo nalezeno u tohoto pivovaru.");

  const { count, error: tastingError } = await supabase
    .from("tastings")
    .select("id", { count: "exact", head: true })
    .eq("beer_id", beerId);
  if (tastingError) throw new Error(tastingError.message);

  const tastingCount = count ?? 0;
  if (tastingCount > 0 && user.id !== CATALOG_ADMIN_USER_ID) {
    throw new Error("Ochutnané pivo může z katalogu smazat pouze administrátor.");
  }

  const { error: deleteError } = await supabase
    .from("beers")
    .delete()
    .eq("id", beerId)
    .eq("brewery_id", breweryId);

  if (deleteError) {
    if (deleteError.message.toLowerCase().includes("foreign key")) {
      throw new Error("Pivo je navázané na chráněný historický import a nelze ho odstranit běžnou katalogovou akcí.");
    }
    throw new Error(deleteError.message);
  }

  revalidateCatalog(breweryId, beerId);
  return { success: true, beerId };
}
