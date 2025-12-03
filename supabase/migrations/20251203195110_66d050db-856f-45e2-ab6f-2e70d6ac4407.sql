-- Add shipping_type column to orders table for CIF/FOB selection
ALTER TABLE public.orders 
ADD COLUMN shipping_type text DEFAULT 'CIF';