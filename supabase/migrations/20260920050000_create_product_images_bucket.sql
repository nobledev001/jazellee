-- Ensure product-images storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to product-images
DROP POLICY IF EXISTS "Public product images access" ON storage.objects;
CREATE POLICY "Public product images access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users / admins to upload, update and delete product images
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
