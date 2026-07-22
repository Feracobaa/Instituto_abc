-- Fix: allow authenticated users to SELECT storage objects in the institution_assets bucket
-- This is required by Supabase Storage API on upload to verify / return object metadata
DROP POLICY IF EXISTS "Logos auth select" ON storage.objects;
CREATE POLICY "Logos auth select" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'institution_assets' 
  AND auth.role() = 'authenticated'
);
