import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import AssignSalespersonDialog from "./AssignSalespersonDialog";

type Profile = {
  id: string;
  empresa: string | null;
  contato: string | null;
  telefone: string | null;
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
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
            .single();
          
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

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Clientes</h1>

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader>
              <CardTitle>{profile.empresa || "Empresa não informada"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Contato</p>
                  <p className="text-muted-foreground">{profile.contato || "-"}</p>
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
                <div className="col-span-2">
                  <p className="font-medium">Endereço</p>
                  <p className="text-muted-foreground">
                    {profile.endereco && profile.numero
                      ? `${profile.endereco}, ${profile.numero}${
                          profile.complemento ? ` - ${profile.complemento}` : ""
                        }`
                      : "-"}
                  </p>
                  <p className="text-muted-foreground">
                    {profile.cidade && profile.estado
                      ? `${profile.cidade} - ${profile.estado}`
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-2 border-t">
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
      </div>

      {selectedClient && (
        <AssignSalespersonDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          clientId={selectedClient.id}
          currentSalespersonId={selectedClient.assigned_salesperson_id}
          onSuccess={loadProfiles}
        />
      )}
    </div>
  );
}
