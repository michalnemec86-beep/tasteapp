-- Defense in depth: do not even grant anonymous access to the place catalog.
REVOKE ALL PRIVILEGES ON public.places FROM anon;
REVOKE ALL PRIVILEGES ON public.places FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SEQUENCE public.places_id_seq FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.places TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.places_id_seq TO authenticated;
