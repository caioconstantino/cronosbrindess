-- Permitir que vendedores com carteira própria atualizem assigned_salesperson_id
CREATE POLICY "Vendedores podem atribuir clientes a si mesmos"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'vendedor'
    AND user_roles.client_access_type = 'own'
  )
  AND assigned_salesperson_id IS NULL
)
WITH CHECK (
  assigned_salesperson_id = auth.uid()
);