import { useId } from "react";
import type { AchievementDefinition, AchievementMedal as Medal } from "@/lib/achievements";
import HomeStatIcon from "@/components/home/HomeStatIcon";

const MATERIALS: Record<Medal, [string, string, string]> = {
  cloth: ["#e5d0a9", "#a58a64", "#60503b"],
  wood: ["#ecb66b", "#a86630", "#4d2a16"],
  bronze: ["#ffd09a", "#bb7540", "#613519"],
  silver: ["#f7f6e9", "#b6bdc2", "#4e5b66"],
  gold: ["#fff1a6", "#e5af32", "#805019"],
  diamond: ["#effffd", "#9ad9d8", "#347887"],
  master: ["#ffe6aa", "#e39944", "#8e3520"],
};

const CATEGORY_COLORS = {
  beers: ["#eaba52", "#70431c"],
  breweries: ["#df9b60", "#673418"],
  styles: ["#de8268", "#6a2f26"],
  countries: ["#8ac2cf", "#244a65"],
  hops: ["#b9cb6e", "#3e5927"],
} as const;

export default function AchievementMedal({ achievement }: { achievement: AchievementDefinition }) {
  const prefix = useId().replace(/:/g, "");
  const material = achievement.medal ?? "bronze";
  const [light, mid, dark] = MATERIALS[material];
  const [ribbon, ribbonDark] = CATEGORY_COLORS[achievement.series ?? "beers"];
  const kind = achievement.series === "breweries" ? "brewery"
    : achievement.series === "countries" ? "globe"
    : achievement.series === "hops" ? "hop" : "mug";
  const metalId = `${prefix}-metal`;
  const ribbonId = `${prefix}-ribbon`;
  const faceId = `${prefix}-face`;

  return (
    <svg className="taste-achievement-medal" viewBox="0 0 220 250" fill="none" aria-hidden="true" data-material={material} data-category={achievement.series ?? "first_tasting"}>
      <defs>
        <linearGradient id={metalId} x1="54" y1="75" x2="169" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor={light} /><stop offset=".27" stopColor={mid} />
          <stop offset=".5" stopColor={light} /><stop offset=".73" stopColor={mid} /><stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={ribbonId} x1="69" y1="8" x2="155" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor={ribbon} /><stop offset=".45" stopColor={ribbonDark} /><stop offset=".72" stopColor={ribbon} /><stop offset="1" stopColor={ribbonDark} />
        </linearGradient>
        <radialGradient id={faceId} cx=".35" cy=".25" r=".85">
          <stop stopColor="#473019" /><stop offset=".7" stopColor="#21180f" /><stop offset="1" stopColor="#110d09" />
        </radialGradient>
      </defs>
      <path d="M66 12h34l35 71-32 22-37-93Z" fill={`url(#${ribbonId})`} stroke={ribbon} strokeWidth="2" />
      <path d="M154 12h-34L85 83l32 22 37-93Z" fill={`url(#${ribbonId})`} stroke={ribbon} strokeWidth="2" />
      <path d="m77 17 29 67m37-67-29 67" stroke="#fff0c5" strokeWidth="2" opacity=".38" />
      <ellipse cx="110" cy="91" rx="13" ry="16" fill={dark} stroke={`url(#${metalId})`} strokeWidth="5" />
      <circle cx="110" cy="158" r="76" fill={`url(#${metalId})`} stroke={light} strokeWidth="1.5" />
      <circle cx="110" cy="158" r="68" stroke={dark} strokeWidth="2" />
      <circle cx="110" cy="158" r="62" fill={`url(#${faceId})`} stroke={light} strokeWidth="1.5" />
      {material === "wood" && <g stroke={dark} strokeWidth="1" opacity=".45">
        <path d="M47 120c22-13 88-17 127 0M40 136c45-12 96-8 141 0M37 179c35 13 112 9 146-2M51 207c41 10 79 10 120-1" />
      </g>}
      {material === "cloth" && <circle cx="110" cy="158" r="72" stroke={dark} strokeWidth="2" strokeDasharray="2 4" />}
      {material === "diamond" && <path d="m110 83 54 22 22 53-22 53-54 23-54-23-22-53 22-53 54-22Z" stroke="white" strokeWidth="1.5" opacity=".42" />}
      <g fill={`url(#${metalId})`} stroke={light} strokeWidth=".7">
        {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`rotate(${i * 18} 110 158)`}>
          <path d="M53 150c-9-5-13-13-11-22 9 4 13 12 11 22Z" />
          <path d="M167 150c9-5 13-13 11-22-9 4-13 12-11 22Z" />
        </g>)}
      </g>
      <path d="M52 162c7 30 28 46 49 48m67-48c-7 30-28 46-49 48" stroke={`url(#${metalId})`} strokeWidth="2" />
      <g transform={achievement.series === "styles" ? "translate(72 119) scale(1.5)" : "translate(78 117) scale(1.9)"}>
        <HomeStatIcon kind={kind} />
      </g>
      {achievement.series === "styles" && <g transform="translate(109 133) scale(1.1)"><HomeStatIcon kind="bottle" /></g>}
      <path d="m110 194 3.5 7.5 8 1-6 5.5 1.5 8-7-4-7 4 1.5-8-6-5.5 8-1 3.5-7.5Z" fill={`url(#${metalId})`} stroke={light} strokeWidth="1" />
      {material === "master" && <path d="m91 109 5 13 14-16 14 16 5-13-2 22H93l-2-22Z" fill={`url(#${metalId})`} stroke={light} strokeWidth="1.2" />}
      <path d="M61 103c23-20 60-24 88-7" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".36" />
    </svg>
  );
}
