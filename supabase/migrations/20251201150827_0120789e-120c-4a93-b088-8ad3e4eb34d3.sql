-- Add shipping_cost field to orders table
ALTER TABLE public.orders ADD COLUMN shipping_cost numeric DEFAULT 0;

-- Remove price field from products table
ALTER TABLE public.products DROP COLUMN price;