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
    accent: "#f3b43f",
    background:
      "rgba(243,180,63,0.10)",
    border:
      "rgba(243,180,63,0.28)",
    glow:
      "rgba(243,180,63,0.24)",
  },
  {
    icon: "hop",
    accent: "#9fbd4b",
    background:
      "rgba(159,189,75,0.10)",
    border:
      "rgba(159,189,75,0.30)",
    glow:
      "rgba(159,189,75,0.24)",
  },
  {
    icon: "barley",
    accent: "#d9a23a",
    background:
      "rgba(217,162,58,0.10)",
    border:
      "rgba(217,162,58,0.28)",
    glow:
      "rgba(217,162,58,0.22)",
  },
  {
    icon: "globe",
    accent: "#db8240",
    background:
      "rgba(219,130,64,0.10)",
    border:
      "rgba(219,130,64,0.29)",
    glow:
      "rgba(219,130,64,0.23)",
  },
  {
    icon: "bottle",
    accent: "#c97b45",
    background:
      "rgba(201,123,69,0.10)",
    border:
      "rgba(201,123,69,0.28)",
    glow:
      "rgba(201,123,69,0.22)",
  },
  {
    icon: "can",
    accent: "#8fae9c",
    background:
      "rgba(143,174,156,0.10)",
    border:
      "rgba(143,174,156,0.29)",
    glow:
      "rgba(143,174,156,0.22)",
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