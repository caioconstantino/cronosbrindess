-- Criar tabela de recursos do sistema
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de permissões (relaciona roles com recursos)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, resource_id)
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para resources
CREATE POLICY "Admins can manage resources"
ON public.resources
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view resources"
ON public.resources
FOR SELECT
TO authenticated
USING (true);

-- Políticas para role_permissions
CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Inserir recursos padrão do sistema
INSERT INTO public.resources (name, description) VALUES
  ('dashboard', 'Painel de controle principal'),
  ('produtos', 'Gerenciamento de produtos'),
  ('categorias', 'Gerenciamento de categorias'),
  ('pedidos', 'Gerenciamento de pedidos'),
  ('clientes', 'Gerenciamento de clientes'),
  ('usuarios', 'Gerenciamento de usuários'),
  ('banners', 'Gerenciamento de banners do site'),
  ('site_clientes', 'Gerenciamento de logos de clientes no site')
ON CONFLICT (name) DO NOTHING;

-- Configurar permissões padrão para admin (acesso total)
INSERT INTO public.role_permissions (role, resource_id, can_view, can_create, can_edit, can_delete)
SELECT 'admin', id, true, true, true, true
FROM public.resources
ON CONFLICT (role, resource_id) DO NOTHING;

-- Configurar permissões padrão para vendedor (apenas pedidos e produtos - visualizar e criar)
INSERT INTO public.role_permissions (role, resource_id, can_view, can_create, can_edit, can_delete)
SELECT 'vendedor', id, true, true, false, false
FROM public.resources
WHERE name IN ('pedidos', 'produtos')
ON CONFLICT (role, resource_id) DO NOTHING;

-- Função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _resource text,
  _action text -- 'view', 'create', 'edit', 'delete'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  has_perm boolean;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar permissão
  SELECT 
    CASE _action
      WHEN 'view' THEN rp.can_view
      WHEN 'create' THEN rp.can_create
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      ELSE false
    END INTO has_perm
  FROM public.role_permissions rp
  JOIN public.resources r ON r.id = rp.resource_id
  WHERE rp.role = user_role AND r.name = _resource;
  
  RETURN COALESCE(has_perm, false);
END;
$$;