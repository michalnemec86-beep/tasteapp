"use client";

import { useEffect, useRef, useState } from "react";
import { getNewsSection, isNewsTimestamp, NavigationNewsController, type NavigationNews } from "@/lib/navigation-news";
import { getNavigationNews } from "./navigation-news/client";
import { PUSH_CHANGE, hasPushDevice, syncPushNews } from "@/lib/push-news-client";

function displayedUntil(search: string) {
  const value = new URLSearchParams(search).get("newUntil");
  return isNewsTimestamp(value) ? value : undefined;
}

export default function useNavigationNews(userId: string | null, pathname: string) {
  const [news, setNews] = useState<NavigationNews | null>(null);
  const controller = useRef<NavigationNewsController | null>(null);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    if (!userId) return;
    const current = new NavigationNewsController(userId, getNavigationNews, setNews);
    controller.current = current;
    void current.visit(getNewsSection(path.current), false, displayedUntil(window.location.search));
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void current.refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      current.dispose();
      controller.current = null;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId]);

  useEffect(() => { void controller.current?.visit(getNewsSection(pathname), false, displayedUntil(window.location.search)); }, [userId, pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      void syncPushNews(userId, news).catch(() => undefined);
      // An opted-in visible phone sends a small heartbeat, without reloading
      // counters. The background sender then avoids interrupting an active app.
      if (hasPushDevice(userId) && document.visibilityState === "visible") timer = setTimeout(sync, 60_000);
    };
    sync();
    window.addEventListener(PUSH_CHANGE, sync);
    document.addEventListener("visibilitychange", sync);
    return () => { clearTimeout(timer); window.removeEventListener(PUSH_CHANGE, sync); document.removeEventListener("visibilitychange", sync); };
  }, [userId, news]);

  return {
    news: news?.userId === userId ? news : null,
    reopen: (href: string) => {
      const [targetPath, search = ""] = href.split("?");
      const target = getNewsSection(targetPath);
      if (target && target === getNewsSection(pathname)) void controller.current?.visit(target, true, displayedUntil(search));
    },
  };
}
