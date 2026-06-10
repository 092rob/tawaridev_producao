
-- 1. Restrict EXECUTE on SECURITY DEFINER has_role to only authenticated role (used by RLS).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Add RESTRICTIVE policies on user_roles so only admins can ever INSERT/UPDATE/DELETE,
-- even if a permissive policy is ever added by mistake. Prevents privilege escalation.
CREATE POLICY "Only admins can insert roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Restrict avatar bucket SELECT so files can be read but bucket cannot be enumerated
-- by listing without knowing the user folder. Drop broad public-read policy and replace.
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;

-- Allow public read of individual avatar files (path must include a uuid folder).
CREATE POLICY "Avatars public read by path"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
);
