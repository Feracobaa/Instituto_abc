-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('institution_assets', 'institution_assets', true)
ON CONFLICT (id) DO NOTHING;


-- 3. Policy: Public Read Access
-- Permite que cualquier persona (incluso sin iniciar sesión) pueda ver/descargar los logos
DROP POLICY IF EXISTS "Logos public access" ON storage.objects;
CREATE POLICY "Logos public access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'institution_assets');

-- 4. Policy: Authenticated Insert
-- Permite subir archivos solo a usuarios autenticados
DROP POLICY IF EXISTS "Logos auth insert" ON storage.objects;
CREATE POLICY "Logos auth insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'institution_assets' 
  AND auth.role() = 'authenticated'
);

-- 5. Policy: Authenticated Update
-- Permite actualizar/sobreescribir archivos solo a usuarios autenticados
DROP POLICY IF EXISTS "Logos auth update" ON storage.objects;
CREATE POLICY "Logos auth update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'institution_assets' 
  AND auth.role() = 'authenticated'
);

-- 6. Policy: Authenticated Delete
-- Permite borrar archivos solo a usuarios autenticados
DROP POLICY IF EXISTS "Logos auth delete" ON storage.objects;
CREATE POLICY "Logos auth delete" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'institution_assets' 
  AND auth.role() = 'authenticated'
);
