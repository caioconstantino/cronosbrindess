-- Adicionar coluna para controlar tipo de acesso à carteira de clientes
ALTER TABLE public.user_roles 
ADD COLUMN client_access_type text DEFAULT 'own' CHECK (client_access_type IN ('master', 'own'));

-- Comentário explicando a coluna
COMMENT ON COLUMN public.user_roles.client_access_type IS 'Define o tipo de acesso do vendedor aos clientes: master (todos) ou own (apenas próprios)';

-- Adicionar coluna para relacionar cliente com vendedor
ALTER TABLE public.profiles 
ADD COLUMN assigned_salesperson_id uuid REFERENCES auth.users(id);

-- Comentário explicando a coluna
COMMENT ON COLUMN public.profiles.assigned_salesperson_id IS 'ID do vendedor responsável por este cliente';

-- Atualizar política de visualização de profiles para respeitar a carteira
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Vendedores com acesso master podem ver todos os clientes
CREATE POLICY "Salespersons with master access can view all clients"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'vendedor' 
    AND client_access_type = 'master'
  )
);

-- Vendedores com acesso own podem ver apenas seus clientes
CREATE POLICY "Salespersons can view their own clients"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'vendedor' 
    AND client_access_type = 'own'
  )
  AND assigned_salesperson_id = auth.uid()
);