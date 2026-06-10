-- 1. Make demand_attachments private
UPDATE storage.buckets SET public = false WHERE id = 'demand_attachments';

-- 2. Remove old, overly-permissive policies
DROP POLICY IF EXISTS "Demand attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload demand attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own demand attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own demand attachments" ON storage.objects;

-- 3. Authenticated-only read of demand attachments (no public access)
CREATE POLICY "Authenticated users can read demand attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'demand_attachments');

-- 4. Authenticated users can upload only into their own folder (uid as first segment)
CREATE POLICY "Users upload own demand attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demand_attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Users can update/delete only files they own (by owner OR by uid folder)
CREATE POLICY "Users update own demand attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'demand_attachments'
  AND ((auth.uid() = owner) OR (auth.uid())::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users delete own demand attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'demand_attachments'
  AND ((auth.uid() = owner) OR (auth.uid())::text = (storage.foldername(name))[1])
);