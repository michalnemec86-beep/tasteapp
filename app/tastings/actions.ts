"use server";

import { createClient } from "@/lib/supabase/server";
import { syncUserAchievements } from "@/lib/achievement-sync";
import { isPackaging, type Packaging } from "@/lib/packaging";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type TastingFormValues = {
  existingBeerId: string;
  beerName: string;
  brandName: string;
  breweryName: string;
  breweryCountry: string;
  styleName: string;
  platoValue: string;
  abvValue: string;
  ibuValue: string;
  isNonAlcoholic: boolean;
  tastedOn: string;
  packaging: Packaging | null;
  quantity: number;
  place: string;
  notes: string;
  hopNames: string[];
  collaboratorBreweryIds: number[];
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readTastingFormData(formData: FormData): TastingFormValues {
  const existingBeerId = String(formData.get("existingBeerId") || "").trim();
  const beerName = String(formData.get("beerName") || "").trim();
  const brandName = String(formData.get("brandName") || "").trim();
  const breweryName = String(formData.get("brewery") || "").trim();
  const breweryCountry = String(formData.get("breweryCountry") || "").trim();
  const styleName = String(formData.get("style") || "").trim();
  const platoValue = String(formData.get("plato") || "").trim();
  const abvValue = String(formData.get("abv") || "").trim();
  const ibuValue = String(formData.get("ibu") || "").trim();
  const isNonAlcoholic = formData.get("isNonAlcoholic") === "on";
  const tastedOn = String(formData.get("tastedOn") || "").trim();
  const packagingValue = String(formData.get("packaging") || "").trim();
  const quantityValue = String(formData.get("quantity") || "1").trim();
  const place = String(formData.get("place") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const hopNames = formData
    .getAll("hops")
    .map((hop) => String(hop).trim())
    .filter(Boolean);

  const collaboratorBreweryIds = [
    ...new Set(
      formData
        .getAll("collaboratorBreweryIds")
        .map((value) => Number(String(value)))
        .filter((value) => Number.isInteger(value) && value > 0)
    ),
  ];

  if (!beerName || !breweryName) {
    throw new Error("Musí být vyplněný název piva a pivovar.");
  }

  if (!tastedOn) {
    throw new Error("Musí být vyplněné datum ochutnávky.");
  }

  if (packagingValue && !isPackaging(packagingValue)) {
    throw new Error("Neplatný typ podání nebo obalu.");
  }

  const packaging: Packaging | null =
    packagingValue && isPackaging(packagingValue) ? packagingValue : null;

  const quantity = Number(quantityValue);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Počet musí být celé číslo alespoň 1.");
  }

  return {
    existingBeerId,
    beerName,
    brandName,
    breweryName,
    breweryCountry,
    styleName,
    platoValue,
    abvValue,
    ibuValue,
    isNonAlcoholic,
    tastedOn,
    packaging,
    quantity,
    place,
    notes,
    hopNames,
    collaboratorBreweryIds,
  };
}

async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Uživatel není přihlášen.");
  return user;
}

async function resolveBrewery(
  supabase: SupabaseClient,
  values: TastingFormValues
) {
  let canonicalCountry = "";

  if (values.breweryCountry) {
    const { data: countries, error } = await supabase
      .from("countries")
      .select("name");
    if (error) throw new Error(error.message);

    const country = countries?.find(
      (item) => normalizeText(item.name) === normalizeText(values.breweryCountry)
    );
    if (!country) {
      throw new Error("Zadaná země není v katalogu. Vyberte existující zemi.");
    }
    canonicalCountry = country.name;
  }

  const [breweriesResult, historyResult] = await Promise.all([
    supabase.from("breweries").select("id, name, country"),
    supabase.from("brewery_name_history").select("brewery_id, previous_name"),
  ]);

  if (breweriesResult.error) throw new Error(breweriesResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);

  const query = normalizeText(values.breweryName);
  let brewery = breweriesResult.data?.find(
    (item) => normalizeText(item.name) === query
  ) ?? null;

  if (!brewery) {
    const historyMatch = historyResult.data?.find(
      (item) => normalizeText(item.previous_name) === query
    );
    if (historyMatch) {
      brewery = breweriesResult.data?.find(
        (item) => item.id === historyMatch.brewery_id
      ) ?? null;
    }
  }

  if (!brewery) {
    const { data: created, error } = await supabase
      .from("breweries")
      .insert({
        name: values.breweryName,
        country: canonicalCountry || null,
      })
      .select("id, name, country")
      .single();
    if (error || !created) {
      throw new Error(error?.message || "Pivovar se nepodařilo vytvořit.");
    }
    brewery = created;
  } else if (canonicalCountry && brewery.country !== canonicalCountry) {
    const { data: updated, error } = await supabase
      .from("breweries")
      .update({ country: canonicalCountry })
      .eq("id", brewery.id)
      .select("id, name, country")
      .single();
    if (error || !updated) {
      throw new Error(error?.message || "Pivovar se nepodařilo aktualizovat.");
    }
    brewery = updated;
  }

  return brewery;
}

async function resolveBrandId(
  supabase: SupabaseClient,
  brandName: string
) {
  const cleanName = brandName.trim();
  if (!cleanName) {
    throw new Error(
      "U nového piva je značka povinná. Pivovar, značka a pivo se evidují samostatně."
    );
  }

  const { data: brands, error } = await supabase
    .from("brands")
    .select("id, name");
  if (error) throw new Error(error.message);

  const query = normalizeText(cleanName);
  const existing = brands?.find(
    (brand) => normalizeText(brand.name) === query
  );
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("brands")
    .insert({ name: cleanName })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Značku se nepodařilo vytvořit.");
  }

  return created.id;
}

async function validateCollaboratorBreweryIds(
  supabase: SupabaseClient,
  ids: number[],
  primaryBreweryId: number
) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.includes(primaryBreweryId)) {
    throw new Error("Hlavní pivovar nemůže být zároveň kolaborantem.");
  }
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("breweries")
    .select("id")
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== uniqueIds.length) {
    throw new Error("Některý kolaborující pivovar už v katalogu neexistuje.");
  }
  return uniqueIds;
}

async function ensureTastingVersionBrewery(
  supabase: SupabaseClient,
  tastingId: number,
  versionId: number,
  beerId: number,
  breweryId: number,
  tastedOn: string
) {
  const { data: assigned, error } = await supabase
    .from("beer_versions")
    .select("id, beer_id, brewery_id, version_year, plato, abv, ibu, style_id")
    .eq("id", versionId)
    .single();

  if (error || !assigned) {
    throw new Error(error?.message || "Nepodařilo se načíst verzi piva.");
  }

  if (assigned.brewery_id === breweryId) return assigned.id;

  const versionYear = Number(tastedOn.slice(0, 4));
  const { data: candidates, error: candidateError } = await supabase
    .from("beer_versions")
    .select("id, brewery_id, version_year, plato, abv, ibu")
    .eq("beer_id", beerId);
  if (candidateError) throw new Error(candidateError.message);

  const same = (a: number | null, b: number | null) =>
    a == null && b == null ? true : Number(a) === Number(b);

  let matching = (candidates ?? []).find((candidate) =>
    candidate.brewery_id === breweryId &&
    candidate.version_year === versionYear &&
    same(candidate.plato, assigned.plato) &&
    same(candidate.abv, assigned.abv) &&
    same(candidate.ibu, assigned.ibu)
  );

  if (!matching) {
    const { data: created, error: createError } = await supabase
      .from("beer_versions")
      .insert({
        beer_id: beerId,
        brewery_id: breweryId,
        version_year: versionYear,
        plato: assigned.plato,
        abv: assigned.abv,
        ibu: assigned.ibu,
        style_id: assigned.style_id,
        is_current: false,
        notes: "Verze vytvořená z konkrétní ochutnávky s odlišným výrobním pivovarem",
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message || "Nepodařilo se vytvořit historickou verzi piva.");
    }

    const { data: hopRows, error: hopsError } = await supabase
      .from("beer_version_hops")
      .select("hop_id")
      .eq("beer_version_id", versionId);
    if (hopsError) throw new Error(hopsError.message);

    if ((hopRows ?? []).length > 0) {
      const { error: copyError } = await supabase
        .from("beer_version_hops")
        .insert(
          (hopRows ?? []).map((row) => ({
            beer_version_id: created.id,
            hop_id: row.hop_id,
          }))
        );
      if (copyError) throw new Error(copyError.message);
    }

    matching = {
      ...assigned,
      id: created.id,
      brewery_id: breweryId,
      version_year: versionYear,
    };
  }

  const { error: tastingUpdateError } = await supabase
    .from("tastings")
    .update({ beer_version_id: matching.id })
    .eq("id", tastingId);
  if (tastingUpdateError) throw new Error(tastingUpdateError.message);

  return matching.id;
}

async function addVersionCollaborators(
  supabase: SupabaseClient,
  versionId: number,
  collaboratorIds: number[]
) {
  if (collaboratorIds.length === 0) return;

  const { error } = await supabase
    .from("beer_version_collaborators")
    .upsert(
      collaboratorIds.map((breweryId, index) => ({
        beer_version_id: versionId,
        brewery_id: breweryId,
        display_order: index + 1,
      })),
      { onConflict: "beer_version_id,brewery_id" }
    );
  if (error) throw new Error(error.message);
}

async function resolveStyle(
  supabase: SupabaseClient,
  styleName: string
) {
  if (!styleName) return null;

  const { data, error } = await supabase
    .from("beer_styles")
    .select("id, name, aliases");
  if (error) throw new Error(error.message);

  const query = normalizeText(styleName);
  const style = data?.find(
    (item) =>
      normalizeText(item.name) === query ||
      (item.aliases ?? []).some((alias: string) => normalizeText(alias) === query)
  );

  if (!style) {
    throw new Error("Zadaný pivní styl není v katalogu. Vyberte existující styl.");
  }

  return style.id;
}

async function resolveBeer(
  supabase: SupabaseClient,
  values: TastingFormValues,
  breweryId: number,
  styleId: number | null
) {
  if (values.existingBeerId) {
    const parsedBeerId = Number(values.existingBeerId);
    if (!Number.isInteger(parsedBeerId) || parsedBeerId < 1) {
      throw new Error("Neplatné ID piva.");
    }

    const { data: selectedBeer, error } = await supabase
      .from("beers")
      .select("id")
      .eq("id", parsedBeerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!selectedBeer) throw new Error("Vybrané pivo už v katalogu neexistuje.");

    return { beerId: selectedBeer.id, isNewBeer: false };
  }

  const { data: breweryBeers, error: breweryBeersError } = await supabase
    .from("beers")
    .select("id, name")
    .eq("brewery_id", breweryId);
  if (breweryBeersError) throw new Error(breweryBeersError.message);

  const existingBeer = breweryBeers?.find(
    (beer) => normalizeText(beer.name) === normalizeText(values.beerName)
  );

  if (existingBeer) {
    return { beerId: existingBeer.id, isNewBeer: false };
  }

  const brandId = await resolveBrandId(supabase, values.brandName);

  const { data: newBeer, error: beerError } = await supabase
    .from("beers")
    .insert({
      name: values.beerName,
      brewery_id: breweryId,
      brand_id: brandId,
      style_id: styleId,
      plato: values.platoValue ? Number(values.platoValue) : null,
      abv: values.abvValue ? Number(values.abvValue) : null,
      ibu: values.ibuValue ? Number(values.ibuValue) : null,
      is_non_alcoholic: values.isNonAlcoholic,
    })
    .select("id")
    .single();

  if (beerError || !newBeer) {
    throw new Error(beerError?.message || "Pivo se nepodařilo vytvořit.");
  }

  return { beerId: newBeer.id, isNewBeer: true };
}

async function resolveHopIds(
  supabase: SupabaseClient,
  hopNames: string[]
) {
  const hopIds: number[] = [];
  if (hopNames.length === 0) return hopIds;

  const { data: allHops, error } = await supabase
    .from("hops")
    .select("id, name, aliases");
  if (error) throw new Error(error.message);

  for (const hopName of hopNames) {
    const query = normalizeText(hopName);
    const hop = allHops?.find(
      (item) =>
        normalizeText(item.name) === query ||
        (item.aliases ?? []).some((alias: string) => normalizeText(alias) === query)
    );

    if (!hop) {
      throw new Error(`Chmel "${hopName}" není v katalogu. Vyberte existující chmel.`);
    }

    if (!hopIds.includes(hop.id)) hopIds.push(hop.id);
  }

  return hopIds;
}

async function addBeerHops(
  supabase: SupabaseClient,
  beerId: number,
  hopIds: number[]
) {
  for (const hopId of hopIds) {
    const { data: existing, error } = await supabase
      .from("beer_hops")
      .select("beer_id")
      .eq("beer_id", beerId)
      .eq("hop_id", hopId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (!existing) {
      const { error: insertError } = await supabase
        .from("beer_hops")
        .insert({ beer_id: beerId, hop_id: hopId });
      if (insertError) throw new Error(insertError.message);
    }
  }
}

async function resolveCatalogData(
  supabase: SupabaseClient,
  values: TastingFormValues
) {
  const brewery = await resolveBrewery(supabase, values);
  const styleId = await resolveStyle(supabase, values.styleName);
  const { beerId, isNewBeer } = await resolveBeer(
    supabase,
    values,
    brewery.id,
    styleId
  );
  const hopIds = await resolveHopIds(supabase, values.hopNames);

  if (isNewBeer) {
    await addBeerHops(supabase, beerId, hopIds);
  }

  return { beerId, breweryId: brewery.id };
}

function revalidateTastingPages(userId: string) {
  revalidatePath("/");
  revalidatePath("/stats");
  revalidatePath("/tastings");
  revalidatePath("/profiles");
  revalidatePath(`/profiles/${userId}`);
}

async function saveTastingCore(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  const values = readTastingFormData(formData);
  const { beerId, breweryId } = await resolveCatalogData(supabase, values);

  const collaboratorBreweryIds = await validateCollaboratorBreweryIds(
    supabase,
    values.collaboratorBreweryIds,
    breweryId
  );

  const { data: insertedTasting, error: tastingError } = await supabase
    .from("tastings")
    .insert({
      user_id: user.id,
      beer_id: beerId,
      tasted_on: values.tastedOn,
      packaging: values.packaging,
      quantity: values.quantity,
      plato: values.platoValue ? Number(values.platoValue) : null,
      abv: values.abvValue ? Number(values.abvValue) : null,
      ibu: values.ibuValue ? Number(values.ibuValue) : null,
      place: values.place || null,
      notes: values.notes || null,
    })
    .select("id, beer_version_id")
    .single();

  if (tastingError || !insertedTasting) {
    throw new Error(tastingError?.message || "Ochutnávku se nepodařilo uložit.");
  }

  if (insertedTasting.beer_version_id) {
    const finalVersionId = await ensureTastingVersionBrewery(
      supabase,
      insertedTasting.id,
      insertedTasting.beer_version_id,
      beerId,
      breweryId,
      values.tastedOn
    );

    await addVersionCollaborators(
      supabase,
      finalVersionId,
      collaboratorBreweryIds
    );
  }

  try {
    await syncUserAchievements(user.id);
  } catch (error) {
    console.error("Achievement sync failed:", error);
  }

  revalidateTastingPages(user.id);
  return { success: true };
}

export async function updateTastingInModal(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  const tastingId = Number(String(formData.get("tastingId") || "").trim());
  if (!Number.isInteger(tastingId) || tastingId < 1) {
    throw new Error("Neplatné ID ochutnávky.");
  }

  const { data: existingTasting, error: existingTastingError } = await supabase
    .from("tastings")
    .select("id")
    .eq("id", tastingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingTastingError) throw new Error(existingTastingError.message);
  if (!existingTasting) {
    throw new Error("Ochutnávka nebyla nalezena nebo ji nemáte oprávnění upravit.");
  }

  const values = readTastingFormData(formData);
  const beerId = Number(values.existingBeerId);
  if (!Number.isInteger(beerId) || beerId < 1) {
    throw new Error("Při editaci ochutnávky vyberte existující pivo z katalogu.");
  }

  const { data: selectedBeer, error: selectedBeerError } = await supabase
    .from("beers")
    .select("id")
    .eq("id", beerId)
    .maybeSingle();
  if (selectedBeerError) throw new Error(selectedBeerError.message);
  if (!selectedBeer) throw new Error("Vybrané pivo už v katalogu neexistuje.");

  const { error: updateError } = await supabase
    .from("tastings")
    .update({
      beer_id: beerId,
      tasted_on: values.tastedOn,
      packaging: values.packaging,
      quantity: values.quantity,
      plato: values.platoValue ? Number(values.platoValue) : null,
      abv: values.abvValue ? Number(values.abvValue) : null,
      ibu: values.ibuValue ? Number(values.ibuValue) : null,
      place: values.place || null,
      notes: values.notes || null,
    })
    .eq("id", tastingId)
    .eq("user_id", user.id);
  if (updateError) throw new Error(updateError.message);

  try {
    await syncUserAchievements(user.id);
  } catch (error) {
    console.error("Achievement sync failed:", error);
  }

  revalidateTastingPages(user.id);
  return { success: true };
}

export async function deleteTastingInModal(tastingId: number) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!Number.isInteger(tastingId) || tastingId < 1) {
    throw new Error("Neplatné ID ochutnávky.");
  }

  const { data: existingTasting, error: existingTastingError } = await supabase
    .from("tastings")
    .select("id")
    .eq("id", tastingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingTastingError) throw new Error(existingTastingError.message);
  if (!existingTasting) {
    throw new Error("Ochutnávka nebyla nalezena nebo ji nemáte oprávnění smazat.");
  }

  const { error: deleteError } = await supabase
    .from("tastings")
    .delete()
    .eq("id", tastingId)
    .eq("user_id", user.id);
  if (deleteError) throw new Error(deleteError.message);

  revalidateTastingPages(user.id);
  return { success: true };
}

export async function saveTastingAndRedirect(formData: FormData) {
  await saveTastingCore(formData);
  redirect("/");
}

export async function saveTastingInModal(formData: FormData) {
  await saveTastingCore(formData);
  return { success: true };
}
