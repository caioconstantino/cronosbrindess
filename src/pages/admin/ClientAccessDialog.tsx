import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClientAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentAccessType: 'master' | 'own';
  onUpdate: () => void;
}

export default function ClientAccessDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentAccessType,
  onUpdate,
}: ClientAccessDialogProps) {
  const [accessType, setAccessType] = useState<'master' | 'own'>(currentAccessType);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ client_access_type: accessType })
        .eq('user_id', userId)
        .eq('role', 'vendedor');

      if (error) throw error;

      toast.success('Tipo de acesso atualizado com sucesso!');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating client access:', error);
      toast.error('Erro ao atualizar tipo de acesso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Acesso à Carteira de Clientes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Configure o tipo de acesso aos clientes para <strong>{userEmail}</strong>
          </p>

          <RadioGroup value={accessType} onValueChange={(value: any) => setAccessType(value)}>
            <div className="flex items-start space-x-2 space-y-0 rounded-md border p-4">
              <RadioGroupItem value="master" id="master" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="master" className="font-medium cursor-pointer">
                  Carteira Master (Todos os Clientes)
                </Label>
                <p className="text-sm text-muted-foreground">
                  O vendedor terá acesso a todos os clientes do sistema
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 space-y-0 rounded-md border p-4">
              <RadioGroupItem value="own" id="own" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="own" className="font-medium cursor-pointer">
                  Carteira Própria
                </Label>
                <p className="text-sm text-muted-foreground">
                  O vendedor terá acesso apenas aos clientes atribuídos a ele
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
