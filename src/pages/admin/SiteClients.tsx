import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface Client {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  active: boolean;
}

export default function SiteClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    display_order: 0,
    active: true,
  });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }

    if (isAdmin) {
      loadClients();
    }
  }, [user, isAdmin, loading]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar clientes",
        description: error.message,
      });
      return;
    }

    if (data) setClients(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientData = {
      name: formData.name,
      logo_url: formData.logo_url,
      display_order: formData.display_order,
      active: formData.active,
    };

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", editingClient.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar cliente",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso!",
      });
    } else {
      const { error } = await supabase.from("clients").insert([clientData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar cliente",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Cliente criado",
        description: "Cliente criado com sucesso!",
      });
    }

    setOpen(false);
    resetForm();
    loadClients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: error.message,
      });
      return;
    }

    toast({
      title: "Cliente excluído",
      description: "Cliente excluído com sucesso!",
    });
    loadClients();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      display_order: 0,
      active: true,
    });
    setEditingClient(null);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      logo_url: client.logo_url,
      display_order: client.display_order,
      active: client.active,
    });
    setOpen(true);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-elegant hover:shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <ImageUpload
                  bucket="client-logos"
                  currentImageUrl={formData.logo_url}
                  onImageUploaded={(url) =>
                    setFormData({ ...formData, logo_url: url })
                  }
                  label="Logo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Ativo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 shadow-elegant hover:shadow-glow">
                  {editingClient ? "Atualizar" : "Criar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{client.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(client)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.logo_url && (
                <div className="mb-4 bg-muted rounded-lg p-4 flex items-center justify-center h-32">
                  <img
                    src={client.logo_url}
                    alt={client.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Ordem: {client.display_order}</span>
                <span className={client.active ? "text-green-600" : "text-red-600"}>
                  {client.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
