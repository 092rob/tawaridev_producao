CREATE OR REPLACE FUNCTION public.get_api_glosa_item_columns()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
  SELECT column_name::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'api_glosa_item';
$$;

REVOKE ALL ON FUNCTION public.get_api_glosa_item_columns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_api_glosa_item_columns() TO service_role;