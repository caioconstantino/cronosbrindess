import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
};

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Profile | null;
  onSuccess: () => void;
}

export default function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientDialogProps) {
  const [empresa, setEmpresa] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setEmpresa(client.empresa || "");
      setContato(client.contato || "");
      setEmail(client.email || "");
      setTelefone(client.telefone || "");
      setCpfCnpj(client.cpf_cnpj || "");
      setCep(client.cep || "");
      setEndereco(client.endereco || "");
      setNumero(client.numero || "");
      setComplemento(client.complemento || "");
      setCidade(client.cidade || "");
      setEstado(client.estado || "");
    }
  }, [client]);

  const handleSave = async () => {
    if (!client) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        empresa,
        contato,
        email,
        telefone,
        cpf_cnpj: cpfCnpj,
        cep,
        endereco,
        numero,
        complemento,
        cidade,
        estado,
      })
      .eq("id", client.id);

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error(`Erro ao salvar cliente: ${error.message}`);
      return;
    }

    toast.success("Cliente atualizado com sucesso");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Empresa</Label>
            <Input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <Label>Contato</Label>
            <Input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Nome do contato"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>CPF/CNPJ</Label>
            <Input
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <Label>CEP</Label>
            <Input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
            />
          </div>

          <div>
            <Label>Estado</Label>
            <Input
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              placeholder="UF"
            />
          </div>

          <div>
            <Label>Cidade</Label>
            <Input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
            />
          </div>

          <div>
            <Label>Endereço</Label>
            <Input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, Avenida..."
            />
          </div>

          <div>
            <Label>Número</Label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="123"
            />
          </div>

          <div className="col-span-2">
            <Label>Complemento</Label>
            <Input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Sala, Bloco..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
