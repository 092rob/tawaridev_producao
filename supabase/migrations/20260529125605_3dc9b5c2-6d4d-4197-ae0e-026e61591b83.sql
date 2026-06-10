CREATE POLICY "Authenticated users can view operadoras"
ON public.operadoras FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view setores"
ON public.setores FOR SELECT
TO authenticated
USING (true);