-- Add NCM and dimensions fields to products table
ALTER TABLE public.products
ADD COLUMN ncm TEXT,
ADD COLUMN altura NUMERIC,
ADD COLUMN largura NUMERIC,
ADD COLUMN comprimento NUMERIC;