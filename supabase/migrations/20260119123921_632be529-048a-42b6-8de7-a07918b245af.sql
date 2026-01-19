-- Add DELETE policy for order_items for admins
CREATE POLICY "Admins can delete order items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for order_items for vendedores (salespeople)
CREATE POLICY "Vendedores can delete order items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'vendedor'::app_role));