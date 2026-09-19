"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CATALOG_ADMIN_USER_ID = "17be5dc3-a3f9-4fd2-ae90-dee7692034fc";

export async function confirmCatalogBeer(beerId: number) {
  if (!Number.isInteger(beerId) || beerId < 1) throw new Error("Neplatné ID piva.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== CATALOG_ADMIN_USER_ID) {
    throw new Error("Katalogové pivo může potvrdit pouze správce katalogu.");
  }

  const { error } = await supabase.rpc("confirm_catalog_beer", { p_beer_id: beerId });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/beers");
  revalidatePath(`/beers/${beerId}`);
  revalidatePath("/breweries");
  revalidatePath("/tastings/new");
  return { success: true };
}
