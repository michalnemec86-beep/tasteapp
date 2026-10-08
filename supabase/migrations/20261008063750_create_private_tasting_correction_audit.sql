-- A non-public, reversible record of manually verified tasting corrections.
-- The application never reads this table and it is not exposed in the Data API.
CREATE TABLE IF NOT EXISTS private.tasting_correction_audit (
  tasting_id bigint PRIMARY KEY,
  retained_tasting_id bigint NOT NULL,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  correction_reason text NOT NULL,
  original_row jsonb NOT NULL
);

REVOKE ALL ON private.tasting_correction_audit FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.tasting_correction_audit IS
  'Private, reversible copies of individually removed duplicate tasting records; not available through the public API.';
