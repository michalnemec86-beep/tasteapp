"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import AchievementMedal from "@/components/achievements/AchievementMedal";
import { ACHIEVEMENTS_UPDATED_EVENT, type AchievementNotification } from "@/lib/achievement-notifications";
import { dismissAchievementNotification, getPendingAchievementNotifications } from "./achievements/actions";

const UNITS = {
  beers: "různých piv",
  breweries: "různých pivovarů",
  styles: "různých pivních stylů",
  countries: "různých zemí",
  hops: "různých odrůd chmele",
} as const;

export default function AchievementCelebrationClient({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [queue, setQueue] = useState<AchievementNotification[]>([]);
  const dismissed = useRef(new Set<string>());
  const closeButton = useRef<HTMLButtonElement>(null);
  const current = queue[0];
  const hasNotification = Boolean(current);

  const dismiss = useCallback(() => {
    if (!current) return;
    dismissed.current.add(current.id);
    setQueue((items) => items.filter((item) => item.id !== current.id));
    void dismissAchievementNotification(current.id).catch((error) => {
      console.error("Achievement notification dismissal failed:", error);
    });
  }, [current]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getPendingAchievementNotifications();
        if (!active || result.userId !== userId) return;
        setQueue((existing) => {
          const ids = new Set(existing.map((item) => item.id));
          return [...existing, ...result.notifications.filter((item) => !ids.has(item.id) && !dismissed.current.has(item.id))];
        });
      } catch (error) {
        console.error("Achievement notification load failed:", error);
      }
    }
    void load();
    window.addEventListener(ACHIEVEMENTS_UPDATED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(ACHIEVEMENTS_UPDATED_EVENT, load);
    };
  }, [userId, pathname]);

  useEffect(() => {
    if (!hasNotification) return;
    const previousFocus = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [hasNotification]);

  useEffect(() => {
    if (!hasNotification) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [hasNotification, dismiss]);

  if (!current) return null;
  const achievement = current.achievement;

  return createPortal(
    <div
      className="taste-achievement-backdrop"
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <section
        className="taste-achievement-celebration"
        role="dialog"
        aria-modal="true"
        aria-labelledby="taste-achievement-title"
        aria-describedby="taste-achievement-description"
      >
        <button ref={closeButton} type="button" className="taste-achievement-close" aria-label="Zavřít oznámení o ocenění" onClick={dismiss}>×</button>
        <p className="taste-achievement-eyebrow">Nové hospodské ocenění</p>
        <h2 id="taste-achievement-title">{achievement.seriesName ?? achievement.name}</h2>
        <AchievementMedal key={current.id} achievement={achievement} />
        {achievement.medalName && <p className="taste-achievement-material">{achievement.medalName}</p>}
        <p id="taste-achievement-description" className="taste-achievement-description">
          {achievement.series ? <>Ochutnal jsi <strong>{achievement.target.toLocaleString("cs-CZ")} {UNITS[achievement.series]}</strong>.</> : "Tvoje první ochutnávka je zapsaná. Na zdraví!"}
        </p>
        <p className="taste-achievement-dismiss-hint">{queue.length > 1 ? `Ještě ${queue.length - 1} ocenění · klepni mimo pro další` : "Klepni mimo medaili pro zavření"}</p>
      </section>
    </div>,
    document.body
  );
}
