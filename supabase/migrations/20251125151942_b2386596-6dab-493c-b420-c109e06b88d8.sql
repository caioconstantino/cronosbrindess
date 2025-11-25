-- Permitir product_id null em order_items para itens customizados
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;

-- Adicionar campos para itens customizados
ALTER TABLE public.order_items ADD COLUMN custom_name TEXT;
ALTER TABLE public.order_items ADD COLUMN custom_image_url TEXT;