-- Fix RLS on prazos_operadoras_records: restrict SELECT to admin + dashboard access
DROP POLICY IF EXISTS "Authenticated read prazos_operadoras_records" ON public.prazos_operadoras_records;
CREATE POLICY "Authorized users read prazos_operadoras_records"
  ON public.prazos_operadoras_records FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.prazos_pagamento_dashboard_access a WHERE a.user_id = auth.uid())
  );

-- Fix RLS on prazos_operadoras_uploads
DROP POLICY IF EXISTS "Authenticated read prazos_operadoras_uploads" ON public.prazos_operadoras_uploads;
CREATE POLICY "Authorized users read prazos_operadoras_uploads"
  ON public.prazos_operadoras_uploads FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.prazos_pagamento_dashboard_access a WHERE a.user_id = auth.uid())
  );

-- Fix prazos_pagamento_dashboard_access: replace USING(true) ALL policy with admin-only
DROP POLICY IF EXISTS "Admins podem gerenciar acessos de prazos" ON public.prazos_pagamento_dashboard_access;
CREATE POLICY "Admins manage prazos dashboard access"
  ON public.prazos_pagamento_dashboard_access FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Revoke EXECUTE from anon/public on SECURITY DEFINER functions to prevent anonymous calls
REVOKE EXECUTE ON FUNCTION public.get_glosa_distinct_values(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_api_zg_item_totals(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_table_ddl(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_api_zg_item_column_types() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_api_glosa_item_columns() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_api_zg_item_columns() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_glosa_users(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_glosa_distinct_values(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_api_zg_item_totals(text, text, text, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_table_ddl(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_api_zg_item_column_types() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_api_glosa_item_columns() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_api_zg_item_columns() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_glosa_users(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;