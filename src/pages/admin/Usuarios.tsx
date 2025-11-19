import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Shield, ShieldOff } from "lucide-react";

type UserRole = {
  id: string;
  user_id: string;
  role: "admin" | "customer";
};

type UserWithRoles = {
  id: string;
  email: string;
  created_at: string;
  roles: UserRole[];
};

export default function Usuarios() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Get all users from auth (we need to use admin API for this)
      // Since we can't directly query auth.users, we'll get unique user_ids from user_roles
      const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
      
      // For each user_id, we need to get their email
      // We'll use the profiles table or construct from roles
      const usersMap = new Map<string, UserWithRoles>();

      for (const userId of userIds) {
        const userRoles = rolesData?.filter(r => r.user_id === userId) || [];
        
        // Try to get email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();

        usersMap.set(userId, {
          id: userId,
          email: profile?.email || "Email não disponível",
          created_at: new Date().toISOString(),
          roles: userRoles as UserRole[],
        });
      }

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        navigate("/admin/auth");
        return;
      }

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
        },
      });

      // Verificar erros do Supabase Functions
      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Erro ao chamar a função de criação de usuário");
      }

      // Verificar erros da resposta da função
      if (data?.error) {
        throw new Error(data.error);
      }

      // Verificar se a criação foi bem-sucedida
      if (!data?.success) {
        throw new Error("Falha ao criar usuário");
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });

      setNewUserEmail("");
      setNewUserPassword("");
      setDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      
      toast({
        title: "Erro ao Criar Usuário",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleRole = async (userId: string, role: "admin" | "customer", hasRole: boolean) => {
    try {
      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Permissão ${role} removida`,
        });
      } else {
        // Add role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Permissão ${role} adicionada`,
        });
      }

      loadUsers();
    } catch (error: any) {
      console.error("Erro ao alterar permissão:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a permissão",
        variant: "destructive",
      });
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usuários e Permissões</h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={createUser}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const hasAdminRole = user.roles.some(r => r.role === "admin");
                  const hasCustomerRole = user.roles.some(r => r.role === "customer");

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {hasAdminRole && (
                            <Badge variant="default">
                              <Shield className="mr-1 h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                          {hasCustomerRole && (
                            <Badge variant="secondary">Cliente</Badge>
                          )}
                          {!hasAdminRole && !hasCustomerRole && (
                            <Badge variant="outline">Sem permissões</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={hasAdminRole ? "destructive" : "default"}
                            onClick={() => toggleRole(user.id, "admin", hasAdminRole)}
                          >
                            {hasAdminRole ? (
                              <>
                                <ShieldOff className="mr-1 h-3 w-3" />
                                Remover Admin
                              </>
                            ) : (
                              <>
                                <Shield className="mr-1 h-3 w-3" />
                                Tornar Admin
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant={hasCustomerRole ? "outline" : "secondary"}
                            onClick={() => toggleRole(user.id, "customer", hasCustomerRole)}
                          >
                            {hasCustomerRole ? "Remover Cliente" : "Tornar Cliente"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
