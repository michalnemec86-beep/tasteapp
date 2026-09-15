"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function OnlineUsersBadge() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function connectPresence() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted || error || !user) {
        return;
      }

      channel = supabase.channel("tasteapp-online", {
        config: {
          private: true,
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (!mounted || !channel) {
            return;
          }

          setOnlineCount(Object.keys(channel.presenceState()).length);
        })
        .subscribe(async (status) => {
          if (!mounted || !channel) {
            return;
          }

          if (status === "SUBSCRIBED") {
            const { error: trackError } = await channel.track({
              online_at: new Date().toISOString(),
            });

            if (trackError && mounted) {
              setOnlineCount(null);
            }
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setOnlineCount(null);
          }
        });
    }

    void connectPresence();

    return () => {
      mounted = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  if (onlineCount === null) {
    return null;
  }

  return (
    <div
      title="Právě připojení uživatelé"
      aria-label={onlineLabel(onlineCount)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        flexShrink: 0,
        padding: "8px 10px",
        border: "1px solid rgba(156,173,71,0.24)",
        borderRadius: "10px",
        background: "rgba(156,173,71,0.045)",
        color: "var(--taste-text-muted)",
        fontSize: "10px",
        lineHeight: 1,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "7px",
          height: "7px",
          flexShrink: 0,
          borderRadius: "999px",
          background: "var(--taste-green)",
          boxShadow: "0 0 9px rgba(156,173,71,0.55)",
        }}
      />
      <span>{onlineLabel(onlineCount)}</span>
    </div>
  );
}

function onlineLabel(count: number) {
  if (count === 1) {
    return "online 1 uživatel";
  }

  if (count >= 2 && count <= 4) {
    return `online ${count} uživatelé`;
  }

  return `online ${count} uživatelů`;
}
