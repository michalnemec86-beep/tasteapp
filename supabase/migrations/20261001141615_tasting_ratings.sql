-- Unrated tastings remain NULL and never contribute a zero to averages.
ALTER TABLE public.tastings
  ADD CONSTRAINT tastings_rating_stars_check
  CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5 AND rating = trunc(rating))),
  ADD COLUMN rated_at timestamptz;

CREATE FUNCTION private.set_tasting_rating_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.rating IS NULL THEN
    NEW.rated_at := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.rated_at := CURRENT_TIMESTAMP;
  ELSIF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.beer_id IS DISTINCT FROM OLD.beer_id THEN
    NEW.rated_at := CURRENT_TIMESTAMP;
  ELSE
    NEW.rated_at := OLD.rated_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tastings_set_rating_timestamp
BEFORE INSERT OR UPDATE ON public.tastings
FOR EACH ROW EXECUTE FUNCTION private.set_tasting_rating_timestamp();

CREATE INDEX tastings_rated_at_idx
ON public.tastings (rated_at DESC, id DESC)
WHERE rating IS NOT NULL;

COMMENT ON COLUMN public.tastings.rating IS 'Optional tasting score: integer 1–5 stars. NULL means unrated.';
COMMENT ON COLUMN public.tastings.rated_at IS 'Time the score or rated beer last changed, maintained by the database.';
