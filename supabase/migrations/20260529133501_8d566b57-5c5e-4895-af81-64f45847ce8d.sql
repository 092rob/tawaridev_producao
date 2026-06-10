
-- 1) agendas_positivas: scope UPDATE/DELETE to owner or admin
DROP POLICY IF EXISTS "Users can update demands" ON public.agendas_positivas;
DROP POLICY IF EXISTS "Users can delete demands" ON public.agendas_positivas;

CREATE POLICY "Users can update their own demands or admin"
ON public.agendas_positivas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can delete their own demands or admin"
ON public.agendas_positivas
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) demand_annotations: restrict SELECT to demand owner, annotation author, or admin
DROP POLICY IF EXISTS "Annotations are viewable by authenticated users" ON public.demand_annotations;

CREATE POLICY "View annotations on accessible demands"
ON public.demand_annotations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.agendas_positivas d
    WHERE d.id = demand_annotations.demand_id
      AND (d.user_id = auth.uid() OR d.responsible_id = auth.uid())
  )
);

-- 3) motivos_glosa: remove anon access
DROP POLICY IF EXISTS "Motivos de glosa são visíveis para todos os usuários autenticados" ON public.motivos_glosa;

CREATE POLICY "Motivos de glosa visíveis para autenticados"
ON public.motivos_glosa
FOR SELECT
TO authenticated
USING (true);

-- 4) profiles: add INSERT policy enforcing self-id
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5) setores / operadoras: add RESTRICTIVE write policies (admin-only for INSERT/UPDATE/DELETE)
CREATE POLICY "Restrict setores writes to admin"
ON public.setores
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  CASE WHEN current_setting('request.method', true) IN ('GET') THEN true
  ELSE public.has_role(auth.uid(), 'admin'::public.app_role) END
)
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Restrict operadoras writes to admin"
ON public.operadoras
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  CASE WHEN current_setting('request.method', true) IN ('GET') THEN true
  ELSE public.has_role(auth.uid(), 'admin'::public.app_role) END
)
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6) Fix search_path on handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
