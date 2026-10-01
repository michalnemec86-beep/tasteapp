"use client";

import { useId, useState } from "react";
import { isRating } from "@/lib/ratings";
import { RatingStar } from "./RatingStars";

export default function StarRatingInput({ defaultValue }: { defaultValue?: number | null }) {
  const [rating, setRating] = useState<number | null>(isRating(defaultValue) ? defaultValue : null);
  const id = useId();
  return <fieldset className="taste-rating-input" aria-describedby={`${id}-help`}>
    <legend>Hodnocení</legend>
    <div className="taste-rating-input-controls">
      <div className="taste-rating-input-stars">
        {[1,2,3,4,5].map(value => <label key={value} className="taste-rating-input-choice">
          <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} z 5 hvězd`}/>
          <RatingStar filled={rating !== null && value <= rating}/>
        </label>)}
      </div>
      <span className="taste-rating-input-value" aria-live="polite">{rating === null ? "Nehodnoceno" : `${rating}/5`}</span>
      {rating !== null && <button type="button" onClick={() => setRating(null)}>Odebrat hodnocení</button>}
    </div>
    <p id={`${id}-help`}>Nepovinné. Bez hvězd se ochutnávka do hodnocení nepočítá.</p>
  </fieldset>;
}
