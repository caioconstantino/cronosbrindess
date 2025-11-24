import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Salesperson = {
  id: string;
  email: string | null;
  empresa: string | null;
};

type AssignSalespersonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  currentSalespersonId: string | null;
  onSuccess: () => void;
};

export default function AssignSalespersonDialog({
  open,
  onOpenChange,
  clientId,
  currentSalespersonId,
  onSuccess,
}: AssignSalespersonDialogProps) {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(currentSalespersonId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSalespersons();
      setSelectedSalespersonId(currentSalespersonId);
    }
  }, [open, currentSalespersonId]);

  const loadSalespersons = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles:user_id (
          id,
          email,
          empresa
        )
      `)
      .eq("role", "vendedor");

    if (error) {
      console.error("Error loading salespersons:", error);
      toast.error("Erro ao carregar vendedores");
      return;
    }

    const formattedSalespersons = data?.map((item: any) => ({
      id: item.profiles.id,
      email: item.profiles.email,
      empresa: item.profiles.empresa,
    })) || [];

    setSalespersons(formattedSalespersons);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ assigned_salesperson_id: selectedSalespersonId })
      .eq("id", clientId);

    setSaving(false);

    if (error) {
      toast.error("Erro ao atribuir vendedor");
    } else {
      toast.success("Vendedor atribuído com sucesso");
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ assigned_salesperson_id: null })
      .eq("id", clientId);

    setSaving(false);

    if (error) {
      toast.error("Erro ao remover vendedor");
    } else {
      toast.success("Vendedor removido com sucesso");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Vendedor</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Select
            value={selectedSalespersonId || "none"}
            onValueChange={(value) => setSelectedSalespersonId(value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum vendedor</SelectItem>
              {salespersons.map((salesperson) => (
                <SelectItem key={salesperson.id} value={salesperson.id}>
                  {salesperson.email || salesperson.empresa || salesperson.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          {currentSalespersonId && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={saving}
            >
              Remover Vendedor
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || selectedSalespersonId === currentSalespersonId}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
