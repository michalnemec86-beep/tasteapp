"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminView, isCatalogAdminUser } from "@/lib/adminView";
import { createClient } from "@/lib/supabase/server";

async function authorizedClient() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || !isCatalogAdminUser(user.id) || !(await isAdminView(user.id))) {
    throw new Error("Operace je dostupná pouze v administračním režimu.");
  }
  return db;
}

export async function scanRadar() {
  const db = await authorizedClient();
  const { data, error } = await db.functions.invoke("pivnik-radar", {
    body: { action: "scan" },
  });
  if (error || !data?.ok) redirect("/settings/radar?scan=error");
  revalidatePath("/settings/radar");
  redirect("/settings/radar?scan=ok");
}

export async function reviewRadarCandidate(formData: FormData) {
  const db = await authorizedClient();
  const value = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[1-9]\d*$/.test(value) || !["reviewed", "ignored", "new"].includes(status)) {
    throw new Error("Neplatná hodnota nálezu.");
  }
  const { error, data } = await db.from("radar_candidates")
    .update({ status, reviewed_at: status === "new" ? null : new Date().toISOString() })
    .eq("id", Number(value)).select("id").maybeSingle();
  if (error || !data) throw new Error("Stav nálezu se nepodařilo změnit.");
  revalidatePath("/settings/radar");
}
