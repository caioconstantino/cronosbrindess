-- Adicionar novo tipo de role ao enum existente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';