CREATE OR REPLACE FUNCTION public.get_api_zg_item_column_types()
RETURNS TABLE(column_name text, data_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, information_schema
AS $$
  SELECT column_name::text, data_type::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'api_zg_item';
$$;

REVOKE EXECUTE ON FUNCTION public.get_api_zg_item_column_types() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_zg_item_column_types() TO service_role;