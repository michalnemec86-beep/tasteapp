CREATE OR REPLACE FUNCTION public.get_beer_tasting_totals(p_beer_ids bigint[])
 RETURNS TABLE(beer_id bigint, tasting_count bigint, quantity_total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    t.beer_id::bigint,
    count(*)::bigint as tasting_count,
    coalesce(
      sum(
        coalesce(
          t.quantity,
          1
        )
      ),
      0
    )::bigint as quantity_total
  from public.tastings t
  where t.beer_id = any(
    coalesce(
      p_beer_ids,
      array[]::bigint[]
    )
  )
  group by t.beer_id;
$function$


revoke all on function public.get_beer_tasting_totals(bigint[])
  from public;

grant execute on function public.get_beer_tasting_totals(bigint[])
  to authenticated;
