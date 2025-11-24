-- Adicionar política para permitir que vendedores vejam perfis de clientes nos pedidos que criaram
CREATE POLICY "Vendedores podem ver perfis de seus pedidos"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.customer_email = profiles.email
    AND orders.user_id = auth.uid()
  )
);