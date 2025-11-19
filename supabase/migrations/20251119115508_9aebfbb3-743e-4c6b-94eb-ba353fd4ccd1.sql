-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('clients', 'clients', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]),
  ('categories', 'categories', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]);

-- Políticas para product-images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas para banners
CREATE POLICY "Anyone can view banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas para clients
CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'clients');

CREATE POLICY "Admins can upload client logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clients' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update client logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clients' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete client logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clients' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas para categories
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'categories');

CREATE POLICY "Admins can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'categories' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update category images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'categories' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete category images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'categories' 
  AND has_role(auth.uid(), 'admin'::app_role)
);