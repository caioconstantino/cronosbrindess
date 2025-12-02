-- Políticas para o bucket category-images
CREATE POLICY "Admins podem fazer upload de imagens de categorias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'category-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins podem atualizar imagens de categorias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'category-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins podem deletar imagens de categorias"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'category-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Imagens de categorias são publicamente acessíveis"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');