"use client";

import { useEffect } from "react";
import { notifyAchievementsUpdated } from "@/lib/achievement-notifications";

export default function AchievementNotificationRefresh({ signature }: { signature: string }) {
  useEffect(() => {
    if (signature) notifyAchievementsUpdated();
  }, [signature]);
  return null;
}
