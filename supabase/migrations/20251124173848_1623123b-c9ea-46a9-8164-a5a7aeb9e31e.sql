-- Create bucket for order PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-pdfs', 'order-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for order-pdfs bucket
CREATE POLICY "Admins can upload order PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update order PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'order-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can read order PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete order PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);