import type {
  AppIconName,
} from "@/components/ui/AppIcon";

export type TimelineVisual = {
  icon: AppIconName;
  accent: string;
  background: string;
  border: string;
  glow: string;
};

/*
 * Timeline má vlastní chmelovou identitu oddělenou od
 * jantarovo-měděných statistik. Jednotlivé karty střídají
 * příbuzné zelené odstíny, takže zůstávají živé, ale pořád
 * působí jako jedna časová osa.
 */
const TIMELINE_VISUALS: TimelineVisual[] = [
  {
    icon: "hop",
    accent: "#9fb84f",
    background:
      "rgba(159,184,79,0.13)",
    border:
      "rgba(159,184,79,0.38)",
    glow:
      "rgba(159,184,79,0.25)",
  },
  {
    icon: "beer",
    accent: "#7f9f3d",
    background:
      "rgba(127,159,61,0.13)",
    border:
      "rgba(127,159,61,0.38)",
    glow:
      "rgba(127,159,61,0.24)",
  },
  {
    icon: "barley",
    accent: "#afc56a",
    background:
      "rgba(175,197,106,0.12)",
    border:
      "rgba(175,197,106,0.35)",
    glow:
      "rgba(175,197,106,0.22)",
  },
  {
    icon: "globe",
    accent: "#6f9137",
    background:
      "rgba(111,145,55,0.13)",
    border:
      "rgba(111,145,55,0.38)",
    glow:
      "rgba(111,145,55,0.24)",
  },
  {
    icon: "bottle",
    accent: "#8aaa48",
    background:
      "rgba(138,170,72,0.13)",
    border:
      "rgba(138,170,72,0.38)",
    glow:
      "rgba(138,170,72,0.24)",
  },
  {
    icon: "can",
    accent: "#b8c977",
    background:
      "rgba(184,201,119,0.11)",
    border:
      "rgba(184,201,119,0.34)",
    glow:
      "rgba(184,201,119,0.21)",
  },
];

function hashNumber(
  value: number
) {
  let x =
    value | 0;

  x =
    Math.imul(
      x ^ (x >>> 16),
      0x45d9f3b
    );

  x =
    Math.imul(
      x ^ (x >>> 16),
      0x45d9f3b
    );

  x =
    x ^ (x >>> 16);

  return x >>> 0;
}

export function getTimelineVisual(
  tastingId: number
): TimelineVisual {
  const hash =
    hashNumber(
      tastingId
    );

  return TIMELINE_VISUALS[
    hash %
      TIMELINE_VISUALS.length
  ];
}
