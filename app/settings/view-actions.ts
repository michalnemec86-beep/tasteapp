"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCatalogAdminUser, setAdminViewCookie } from "@/lib/adminView";

export async function updateCatalogView(mode: "normal" | "admin") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isCatalogAdminUser(user.id)) throw new Error("Toto nastavení je dostupné pouze správci.");
  if (mode !== "normal" && mode !== "admin") throw new Error("Neplatný režim zobrazení.");
  await setAdminViewCookie(mode);
  revalidatePath("/", "layout");
}
