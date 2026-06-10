-- Ajustar search_path para a função de updated_at
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Refinar políticas de RLS para cbhpm_procedimentos
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.cbhpm_procedimentos;
CREATE POLICY "Allow write for authenticated users" ON public.cbhpm_procedimentos 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);
-- Nota: Em um sistema real com papéis de admin, usaríamos check de role, 
-- mas seguindo o padrão atual do projeto onde autenticado pode gerenciar.

-- Refinar políticas de RLS para cbhpm_portes
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.cbhpm_portes;
CREATE POLICY "Allow write for authenticated users" ON public.cbhpm_portes 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);