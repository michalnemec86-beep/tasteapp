import type { AchievementDefinition } from "./achievements";

export type AchievementNotification = {
  id: string;
  achievement: AchievementDefinition;
};

export const ACHIEVEMENTS_UPDATED_EVENT = "pivnik:achievements-updated";

export function notifyAchievementsUpdated() {
  window.dispatchEvent(new Event(ACHIEVEMENTS_UPDATED_EVENT));
}
