-- Add payment, delivery and validity fields to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_terms TEXT DEFAULT '21 DDL, CONTADOS A PARTIR DA EMISSÃO DA NF DE VENDA.',
ADD COLUMN delivery_terms TEXT DEFAULT 'A COMBINAR',
ADD COLUMN validity_terms TEXT DEFAULT '10 DIAS - SUJEITO A CONFIRMAÇÃO DE ESTOQUE NO ATO DA FORMALIZAÇÃO DA COMPRA.';