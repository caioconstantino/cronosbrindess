-- Add contact_preference column to orders table
ALTER TABLE public.orders ADD COLUMN contact_preference TEXT;

-- Add selected_variants column to order_items table to store variant selections
ALTER TABLE public.order_items ADD COLUMN selected_variants JSONB DEFAULT '{}'::jsonb;