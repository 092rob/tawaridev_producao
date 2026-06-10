DROP POLICY IF EXISTS "Authenticated users can read demand attachments" ON storage.objects;

CREATE POLICY "Users read own demand attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'demand_attachments'
  AND (
    auth.uid() = owner
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);