"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCatalogAdminUser } from "@/lib/adminView";

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (name.length < 2 || name.length > 160 || city.length > 120 || country.length > 120 ||
      (category !== "pub" && category !== "festival")) {
    throw new Error("Zkontrolujte název, město, stát a kategorii místa.");
  }
  return { name, city, country, category };
}

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isCatalogAdminUser(user.id)) {
    throw new Error("Pouze administrátor může spravovat katalog míst.");
  }
  return { supabase, user };
}

export async function createPlace(formData: FormData) {
  const { supabase, user } = await getAdmin();
  const fields = readFields(formData);
  const { error } = await supabase.from("places").insert({
    ...fields, created_by: user.id, approved: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/places");
}

export async function updatePlace(formData: FormData) {
  const { supabase } = await getAdmin();
  const id = Number(formData.get("placeId"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Neplatné ID místa.");
  const fields = readFields(formData);
  const approved = formData.get("approved") === "on";
  const { data, error } = await supabase.from("places")
    .update({ ...fields, approved })
    .eq("id", id).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Místo se nepodařilo upravit.");
  revalidatePath("/places");
}
