import { useId } from "react";
import { isRating } from "@/lib/ratings";

export function RatingStar({ filled = true }: { filled?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="taste-rating-star">
    <defs><linearGradient id={id} x1=".2" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox">
      <stop stopColor={filled ? "#fff0b6" : "#6d5940"}/><stop offset=".35" stopColor={filled ? "#ffc957" : "#3c3025"}/>
      <stop offset=".7" stopColor={filled ? "#c7771e" : "#241c16"}/><stop offset="1" stopColor={filled ? "#8e4212" : "#19130e"}/>
    </linearGradient></defs>
    <path d="m20 3 5.3 10.8 11.9 1.7-8.6 8.4 2 11.8L20 30.1 9.4 35.7l2-11.8-8.6-8.4 11.9-1.7Z"
      fill={`url(#${id})`} stroke={filled ? "#ecc273" : "#8b6b43"} strokeWidth="1.1" strokeLinejoin="round"/>
    <path d="M20 5.7v16.8L6.4 16.5l9.7-1.4Z" fill="#fff9d9" opacity={filled ? ".28" : ".07"}/>
    <path d="m20 22.5 8.7 10.5-1.8-9.8 7.3-6.7Z" fill="#71320b" opacity=".22"/>
  </svg>;
}

export default function RatingStars({ rating, compact = false }: { rating: number | null | undefined; compact?: boolean }) {
  if (!isRating(rating)) return null;
  return <span className={`taste-rating-display${compact ? " taste-rating-display-compact" : ""}`} aria-label={`Hodnocení ${rating} z 5 hvězd`}>
    {compact ? <RatingStar/> : <span className="taste-rating-star-row">{[1,2,3,4,5].map(value => <RatingStar key={value} filled={value <= rating}/>)}</span>}
    <span>{rating}/5</span>
  </span>;
}
