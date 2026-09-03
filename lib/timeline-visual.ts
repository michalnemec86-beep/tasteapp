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

const TIMELINE_VISUALS: TimelineVisual[] = [
  {
    icon: "beer",
    accent: "#f2b63f",
    background:
      "rgba(242,182,63,0.14)",
    border:
      "rgba(242,182,63,0.42)",
    glow:
      "rgba(242,182,63,0.34)",
  },
  {
    icon: "hop",
    accent: "#9cad47",
    background:
      "rgba(156,173,71,0.13)",
    border:
      "rgba(156,173,71,0.40)",
    glow:
      "rgba(156,173,71,0.32)",
  },
  {
    icon: "barley",
    accent: "#b77a36",
    background:
      "rgba(183,122,54,0.13)",
    border:
      "rgba(183,122,54,0.39)",
    glow:
      "rgba(183,122,54,0.30)",
  },
  {
    icon: "globe",
    accent: "#d65b42",
    background:
      "rgba(214,91,66,0.12)",
    border:
      "rgba(214,91,66,0.39)",
    glow:
      "rgba(214,91,66,0.30)",
  },
  {
    icon: "bottle",
    accent: "#e88835",
    background:
      "rgba(232,136,53,0.13)",
    border:
      "rgba(232,136,53,0.40)",
    glow:
      "rgba(232,136,53,0.32)",
  },
  {
    icon: "can",
    accent: "#c68139",
    background:
      "rgba(198,129,57,0.13)",
    border:
      "rgba(198,129,57,0.39)",
    glow:
      "rgba(198,129,57,0.30)",
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