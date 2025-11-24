import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";

type Cliente = {
  id: string;
  empresa: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
};

export default function VendedorClientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessType, setAccessType] = useState<'master' | 'own'>('own');

  useEffect(() => {
    if (user) {
      loadClientAccessType();
    }
  }, [user]);

  useEffect(() => {
    if (user && accessType) {
      loadClientes();
    }
  }, [user, accessType]);

  const loadClientAccessType = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("client_access_type")
      .eq("user_id", user.id)
      .eq("role", "vendedor")
      .maybeSingle();

    const type = data?.client_access_type;
    setAccessType(type === 'master' ? 'master' : 'own');
  };

  const loadClientes = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("profiles")
        .select("id, empresa, contato, email, telefone, cidade, estado");

      // Se for 'own', filtrar apenas clientes atribuídos
      if (accessType === 'own') {
        query = query.eq("assigned_salesperson_id", user.id);
      }

      const { data, error } = await query.order("empresa");

      if (error) throw error;

      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Meus Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Tipo de acesso: <span className="font-medium">{accessType === 'master' ? 'Master (Todos os clientes)' : 'Próprios clientes'}</span>
        </p>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum cliente atribuído ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <Card key={cliente.id}>
              <CardHeader>
                <CardTitle className="text-lg">{cliente.empresa || "Sem nome"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cliente.contato && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.contato}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${cliente.email}`} className="text-primary hover:underline">
                      {cliente.email}
                    </a>
                  </div>
                )}
                {cliente.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${cliente.telefone}`} className="text-primary hover:underline">
                      {cliente.telefone}
                    </a>
                  </div>
                )}
                {(cliente.cidade || cliente.estado) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {cliente.cidade}
                      {cliente.cidade && cliente.estado && " - "}
                      {cliente.estado}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
