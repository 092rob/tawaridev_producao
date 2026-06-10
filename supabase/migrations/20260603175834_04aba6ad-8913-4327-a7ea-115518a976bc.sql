REVOKE EXECUTE ON FUNCTION public.get_api_zg_item_columns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_zg_item_columns() TO service_role;