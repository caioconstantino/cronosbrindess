import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  id?: string;
  resource_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type AppRole = 'admin' | 'vendedor' | 'customer';

export default function Permissoes() {
  const [selectedRole, setSelectedRole] = useState<AppRole>("vendedor");
  const [resources, setResources] = useState<Resource[]>([]);
  const [permissions, setPermissions] = useState<Record<string, RolePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roles: Array<{ value: AppRole; label: string }> = [
    { value: "admin", label: "Administrador" },
    { value: "vendedor", label: "Vendedor" },
    { value: "customer", label: "Cliente" },
  ];

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissions();
    }
  }, [selectedRole]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Erro ao carregar recursos');
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('id, resource_id, can_view, can_create, can_edit, can_delete')
        .eq('role', selectedRole);

      if (error) throw error;

      const permsMap: Record<string, RolePermission> = {};
      
      // Mapear permissões existentes
      data?.forEach(perm => {
        permsMap[perm.resource_id] = {
          id: perm.id,
          resource_id: perm.resource_id,
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        };
      });

      // Inicializar recursos sem permissões
      resources.forEach(resource => {
        if (!permsMap[resource.id]) {
          permsMap[resource.id] = {
            resource_id: resource.id,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
          };
        }
      });

      setPermissions(permsMap);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (resourceId: string, field: keyof RolePermission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [resourceId]: {
        ...prev[resourceId],
        [field]: value,
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Deletar permissões existentes para esta role
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedRole);

      // Inserir novas permissões (apenas as que têm pelo menos uma permissão marcada)
      const permsToInsert = Object.values(permissions)
        .filter(perm => perm.can_view || perm.can_create || perm.can_edit || perm.can_delete)
        .map(perm => ({
          role: selectedRole,
          resource_id: perm.resource_id,
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        }));

      if (permsToInsert.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(permsToInsert);

        if (error) throw error;
      }

      toast.success('Permissões salvas com sucesso!');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  const getResourceLabel = (name: string) => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'produtos': 'Produtos',
      'categorias': 'Categorias',
      'pedidos': 'Pedidos',
      'clientes': 'Clientes',
      'usuarios': 'Usuários',
      'banners': 'Banners',
      'site_clientes': 'Clientes do Site',
    };
    return labels[name] || name;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Permissões</h1>
        <p className="text-muted-foreground mt-2">
          Configure o que cada tipo de usuário pode acessar no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione o Tipo de Usuário</CardTitle>
          <CardDescription>
            Escolha o tipo de usuário para configurar suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Permissões por Recurso</CardTitle>
            <CardDescription>
              Marque as ações que este tipo de usuário pode realizar em cada área
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {resources.map(resource => (
                <div key={resource.id} className="border-b pb-4 last:border-0">
                  <h3 className="font-semibold mb-3">{getResourceLabel(resource.name)}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${resource.id}-view`}
                        checked={permissions[resource.id]?.can_view || false}
                        onCheckedChange={(checked) => 
                          updatePermission(resource.id, 'can_view', checked as boolean)
                        }
                      />
                      <Label htmlFor={`${resource.id}-view`} className="text-sm cursor-pointer">
                        Visualizar
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${resource.id}-create`}
                        checked={permissions[resource.id]?.can_create || false}
                        onCheckedChange={(checked) => 
                          updatePermission(resource.id, 'can_create', checked as boolean)
                        }
                      />
                      <Label htmlFor={`${resource.id}-create`} className="text-sm cursor-pointer">
                        Criar
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${resource.id}-edit`}
                        checked={permissions[resource.id]?.can_edit || false}
                        onCheckedChange={(checked) => 
                          updatePermission(resource.id, 'can_edit', checked as boolean)
                        }
                      />
                      <Label htmlFor={`${resource.id}-edit`} className="text-sm cursor-pointer">
                        Editar
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${resource.id}-delete`}
                        checked={permissions[resource.id]?.can_delete || false}
                        onCheckedChange={(checked) => 
                          updatePermission(resource.id, 'can_delete', checked as boolean)
                        }
                      />
                      <Label htmlFor={`${resource.id}-delete`} className="text-sm cursor-pointer">
                        Excluir
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Permissões
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
