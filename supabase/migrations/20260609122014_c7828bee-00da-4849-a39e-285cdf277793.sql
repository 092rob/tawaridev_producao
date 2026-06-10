
-- CBHPM: restrict writes to admins
DROP POLICY IF EXISTS "Allow write for authenticated users" ON public.cbhpm_procedimentos;
CREATE POLICY "Admins manage cbhpm_procedimentos" ON public.cbhpm_procedimentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow write for authenticated users" ON public.cbhpm_portes;
CREATE POLICY "Admins manage cbhpm_portes" ON public.cbhpm_portes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow all management for authenticated users" ON public.cbhpm_versoes;
CREATE POLICY "Authenticated read cbhpm_versoes" ON public.cbhpm_versoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cbhpm_versoes" ON public.cbhpm_versoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- prazos_operadoras: split read (all authenticated) from write (admin only)
DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.prazos_operadoras_records;
CREATE POLICY "Authenticated read prazos_operadoras_records" ON public.prazos_operadoras_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prazos_operadoras_records" ON public.prazos_operadoras_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Acesso total para usuários autenticados" ON public.prazos_operadoras_uploads;
CREATE POLICY "Authenticated read prazos_operadoras_uploads" ON public.prazos_operadoras_uploads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prazos_operadoras_uploads" ON public.prazos_operadoras_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage: allow responsible_id of a demand to read its attachments
DROP POLICY IF EXISTS "Users read own demand attachments" ON storage.objects;
CREATE POLICY "Users read own demand attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'demand_attachments'
    AND (
      auth.uid() = owner
      OR (auth.uid())::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.agendas_positivas d
        WHERE (d.id)::text = (storage.foldername(name))[1]
          AND d.responsible_id = auth.uid()
      )
    )
  );

-- Revoke public/anon EXECUTE on SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.get_glosa_distinct_values(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_glosa_distinct_values(text) TO authenticated, service_role;
