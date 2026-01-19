-- Allow vendors to update their own orders
CREATE POLICY "Vendedores can update their own orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'vendedor'::app_role) 
  AND user_id = auth.uid()
);

-- Allow vendors to update order items of their own orders
CREATE POLICY "Vendedores can update order items of their orders"
ON public.order_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);