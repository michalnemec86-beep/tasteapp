"use client";

import { useEffect, useState } from "react";

import { HopMark } from "@/components/brand/PivnikMark";

export default function PivnikLaunchScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const hide = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setVisible(false);
        });
      });
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(hide, hide);
    } else {
      hide();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`pivnik-launch-screen ${visible ? "is-visible" : "is-hidden"}`}
      aria-hidden="true"
    >
      <div className="pivnik-launch-mark">
        <HopMark width={52} height={61} />
      </div>
      <div className="pivnik-launch-name">Pivník</div>
      <div className="pivnik-launch-tagline">Pivní deník</div>
    </div>
  );
}
