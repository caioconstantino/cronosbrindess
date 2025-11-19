import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Permission {
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Buscar role do usuário
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!roleData) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Buscar permissões da role
        const { data: permsData } = await supabase
          .from('role_permissions')
          .select(`
            can_view,
            can_create,
            can_edit,
            can_delete,
            resources (name)
          `)
          .eq('role', roleData.role);

        if (permsData) {
          const formattedPermissions = permsData.map((perm: any) => ({
            resource: perm.resources.name,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
          }));
          setPermissions(formattedPermissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const hasPermission = (resource: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    const perm = permissions.find(p => p.resource === resource);
    if (!perm) return false;
    
    switch (action) {
      case 'view':
        return perm.can_view;
      case 'create':
        return perm.can_create;
      case 'edit':
        return perm.can_edit;
      case 'delete':
        return perm.can_delete;
      default:
        return false;
    }
  };

  const canAccess = (resource: string) => hasPermission(resource, 'view');

  return {
    permissions,
    loading,
    hasPermission,
    canAccess,
  };
};
