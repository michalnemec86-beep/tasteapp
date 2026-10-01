"use server";

import { getAchievementByKey } from "@/lib/achievements";
import type { AchievementNotification } from "@/lib/achievement-notifications";
import { FEATURES } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";

export async function getPendingAchievementNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !FEATURES.achievements) {
    return { userId: user?.id ?? null, notifications: [] as AchievementNotification[] };
  }

  const { data, error } = await supabase
    .from("user_achievements")
    .select("id, achievement_key")
    .eq("user_id", user.id)
    .eq("show_in_timeline", true)
    .is("notification_seen_at", null)
    .order("unlocked_at")
    .order("id");

  if (error) throw new Error(error.message);

  const notifications: AchievementNotification[] = [];
  for (const row of data ?? []) {
    const achievement = getAchievementByKey(row.achievement_key);
    if (achievement) notifications.push({ id: String(row.id), achievement });
  }
  return { userId: user.id, notifications };
}

export async function dismissAchievementNotification(id: string) {
  if (!/^\d{1,20}$/.test(id)) throw new Error("Neplatné ID ocenění.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("user_achievements")
    .update({ notification_seen_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("notification_seen_at", null);

  if (error) throw new Error(error.message);
}
