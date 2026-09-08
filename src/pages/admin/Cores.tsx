import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Color = {
  id: string;
  name: string;
  hex: string;
  active: boolean;
  display_order: number;
};

export default function Cores() {
  const [colors, setColors] = useState<Color[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [form, setForm] = useState({ name: "", hex: "#000000", active: true, display_order: 0 });

  useEffect(() => {
    loadColors();
  }, []);

  const loadColors = async () => {
    const { data, error } = await supabase
      .from("colors")
      .select("*")
      .order("display_order")
      .order("name");
    if (error) {
      toast.error("Erro ao carregar cores");
      return;
    }
    setColors((data as Color[]) || []);
  };

  const resetForm = () => {
    setForm({ name: "", hex: "#000000", active: true, display_order: 0 });
    setEditing(null);
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      hex: form.hex,
      active: form.active,
      display_order: Number(form.display_order) || 0,
    };

    const { error } = editing
      ? await supabase.from("colors").update(payload).eq("id", editing.id)
      : await supabase.from("colors").insert(payload);

    if (error) {
      toast.error("Erro ao salvar cor");
      return;
    }

    toast.success(editing ? "Cor atualizada!" : "Cor cadastrada!");
    resetForm();
    loadColors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta cor?")) return;
    const { error } = await supabase.from("colors").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir cor");
      return;
    }
    toast.success("Cor excluída!");
    loadColors();
  };

  const openEdit = (color: Color) => {
    setEditing(color);
    setForm({
      name: color.name,
      hex: color.hex,
      active: color.active,
      display_order: color.display_order,
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cores</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", hex: "#000000", active: true, display_order: 0 });
            setDialogOpen(true);
          }}
          className="bg-gradient-accent hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Cor
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Estas cores ficam disponíveis para serem liberadas em cada produto na aba "Cores" do cadastro de produtos.
      </p>

      <div className="grid gap-3">
        {colors.map((color) => (
          <Card key={color.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <span
                className="h-10 w-10 rounded-full border flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <div className="flex-1">
                <p className="font-semibold">{color.name}</p>
                <p className="text-sm text-muted-foreground">
                  {color.hex} • {color.active ? "Ativa" : "Inativa"} • Ordem: {color.display_order}
                </p>
              </div>
              <Button size="icon" variant="outline" onClick={() => openEdit(color)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => handleDelete(color.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {colors.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma cor cadastrada ainda.
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : resetForm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cor" : "Nova Cor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="color-name">Nome *</Label>
              <Input
                id="color-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Azul Royal"
              />
            </div>

            <div>
              <Label htmlFor="color-hex">Amostra</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="color-hex"
                  type="color"
                  value={form.hex}
                  onChange={(e) => setForm({ ...form, hex: e.target.value })}
                  className="h-10 w-14 rounded border bg-background cursor-pointer"
                />
                <Input
                  value={form.hex}
                  onChange={(e) => setForm({ ...form, hex: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="color-order">Ordem de exibição</Label>
              <Input
                id="color-order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="color-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
              <Label htmlFor="color-active">Cor ativa</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-gradient-accent hover:opacity-90">
                {editing ? "Atualizar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
