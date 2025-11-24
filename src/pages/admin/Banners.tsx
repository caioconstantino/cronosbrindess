import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  active: boolean | null;
  display_order: number | null;
};

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    active: true,
    display_order: "0",
  });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadBanners();
    }
  }, [user, isAdmin, loading]);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar banners");
    } else {
      setBanners(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bannerData = {
      title: formData.title,
      description: formData.description || null,
      image_url: formData.image_url,
      link_url: formData.link_url || null,
      active: formData.active,
      display_order: parseInt(formData.display_order),
    };

    if (editingBanner) {
      const { error } = await supabase
        .from("banners")
        .update(bannerData)
        .eq("id", editingBanner.id);

      if (error) {
        toast.error("Erro ao atualizar banner");
      } else {
        toast.success("Banner atualizado com sucesso!");
        resetForm();
        loadBanners();
      }
    } else {
      const { error } = await supabase.from("banners").insert(bannerData);

      if (error) {
        toast.error("Erro ao criar banner");
      } else {
        toast.success("Banner criado com sucesso!");
        resetForm();
        loadBanners();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este banner?")) return;

    const { error } = await supabase.from("banners").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir banner");
    } else {
      toast.success("Banner excluído com sucesso!");
      loadBanners();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      link_url: "",
      active: true,
      display_order: "0",
    });
    setEditingBanner(null);
    setDialogOpen(false);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      active: banner.active ?? true,
      display_order: banner.display_order?.toString() || "0",
    });
    setDialogOpen(true);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Banners</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-gradient-accent hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Editar Banner" : "Novo Banner"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <ImageUpload
                bucket="banners"
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                label="Imagem do Banner *"
              />

              <div>
                <Label htmlFor="link_url">URL do Link</Label>
                <Input
                  id="link_url"
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Banner Ativo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-gradient-accent hover:opacity-90">
                  {editingBanner ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <CardTitle>{banner.title}</CardTitle>
                    {banner.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {banner.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                      <span>Ordem: {banner.display_order}</span>
                      <span>Status: {banner.active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEditDialog(banner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
