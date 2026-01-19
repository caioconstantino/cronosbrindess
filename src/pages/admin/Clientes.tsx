import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserCheck, Plus, Pencil, FileText, Search } from "lucide-react";
import AssignSalespersonDialog from "./AssignSalespersonDialog";
import EditClientDialog from "./EditClientDialog";
import ClientOrdersDialog from "./ClientOrdersDialog";

type Profile = {
  id: string;
  empresa: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  created_at: string;
  assigned_salesperson_id: string | null;
  salesperson?: {
    email: string | null;
    empresa: string | null;
  };
};

export default function Clientes() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadProfiles();
    }
  }, [user, isAdmin, loading]);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar clientes");
      return;
    }

    // Buscar dados dos vendedores atribuídos
    const profilesWithSalesperson = await Promise.all(
      (data || []).map(async (profile) => {
        if (profile.assigned_salesperson_id) {
          const { data: salespersonData } = await supabase
            .from("profiles")
            .select("email, empresa")
            .eq("id", profile.assigned_salesperson_id)
            .maybeSingle();
          
          return { ...profile, salesperson: salespersonData };
        }
        return { ...profile, salesperson: null };
      })
    );

    setProfiles(profilesWithSalesperson);
  };

  const handleAssignSalesperson = (client: Profile) => {
    setSelectedClient(client);
    setAssignDialogOpen(true);
  };

  const handleEditClient = (client: Profile) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleViewOrders = (client: Profile) => {
    setSelectedClient(client);
    setOrdersDialogOpen(true);
  };

  const handleNewOrder = (client: Profile) => {
    // Navegar para criar pedido com dados do cliente pré-preenchidos
    navigate("/admin/pedidos/novo", { 
      state: { 
        clientData: {
          empresa: client.empresa,
          contato: client.contato,
          email: client.email,
          telefone: client.telefone,
          cpf_cnpj: client.cpf_cnpj,
          cep: client.cep,
          endereco: client.endereco,
          numero: client.numero,
          complemento: client.complemento,
          cidade: client.cidade,
          estado: client.estado,
        }
      }
    });
  };

  const filteredProfiles = profiles.filter((profile) => {
    const search = searchTerm.toLowerCase();
    return (
      (profile.empresa?.toLowerCase().includes(search) || false) ||
      (profile.contato?.toLowerCase().includes(search) || false) ||
      (profile.email?.toLowerCase().includes(search) || false) ||
      (profile.cpf_cnpj?.toLowerCase().includes(search) || false) ||
      (profile.telefone?.toLowerCase().includes(search) || false)
    );
  });

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Clientes</h1>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, contato, email, CPF/CNPJ ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle>{profile.empresa || "Empresa não informada"}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleNewOrder(profile)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pedido
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClient(profile)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrders(profile)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Pedidos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Contato</p>
                  <p className="text-muted-foreground">{profile.contato || "-"}</p>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">{profile.email || "-"}</p>
                </div>
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-muted-foreground">{profile.telefone || "-"}</p>
                </div>
                <div>
                  <p className="font-medium">CPF/CNPJ</p>
                  <p className="text-muted-foreground">{profile.cpf_cnpj || "-"}</p>
                </div>
                <div>
                  <p className="font-medium">CEP</p>
                  <p className="text-muted-foreground">{profile.cep || "-"}</p>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <p className="font-medium">Endereço</p>
                  <p className="text-muted-foreground">
                    {profile.endereco && profile.numero
                      ? `${profile.endereco}, ${profile.numero}${
                          profile.complemento ? ` - ${profile.complemento}` : ""
                        } - ${profile.cidade || ""}/${profile.estado || ""}`
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4 flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="font-medium">Vendedor Atribuído</p>
                    <p className="text-muted-foreground">
                      {profile.salesperson?.email || profile.salesperson?.empresa || "Nenhum vendedor atribuído"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignSalesperson(profile)}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Atribuir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProfiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum cliente encontrado com os termos de busca." : "Nenhum cliente cadastrado."}
          </div>
        )}
      </div>

      {selectedClient && (
        <>
          <AssignSalespersonDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            clientId={selectedClient.id}
            currentSalespersonId={selectedClient.assigned_salesperson_id}
            onSuccess={loadProfiles}
          />
          <EditClientDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            client={selectedClient}
            onSuccess={loadProfiles}
          />
          <ClientOrdersDialog
            open={ordersDialogOpen}
            onOpenChange={setOrdersDialogOpen}
            clientEmail={selectedClient.email}
            clientName={selectedClient.empresa}
          />
        </>
      )}
    </div>
  );
}
