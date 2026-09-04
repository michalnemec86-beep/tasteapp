"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const RESUME_SYNC_AFTER_MS = 60_000;

export default function AuthSessionSync() {
  const router = useRouter();
  const lastActiveAt = useRef(Date.now());

  useEffect(() => {
    const supabase = createClient();
    let refreshScheduled = false;

    function refreshServerState() {
      if (refreshScheduled) {
        return;
      }

      refreshScheduled = true;

      window.setTimeout(() => {
        refreshScheduled = false;
        router.refresh();
      }, 0);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_OUT"
      ) {
        refreshServerState();
      }
    });

    async function syncAfterResume() {
      const now = Date.now();
      const inactiveFor =
        now - lastActiveAt.current;

      lastActiveAt.current = now;

      if (
        inactiveFor < RESUME_SYNC_AFTER_MS
      ) {
        return;
      }

      await supabase.auth.getSession();
      refreshServerState();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        lastActiveAt.current = Date.now();
        return;
      }

      void syncAfterResume();
    }

    function handleFocus() {
      void syncAfterResume();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      subscription.unsubscribe();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [router]);

  return null;
}
