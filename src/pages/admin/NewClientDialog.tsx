import { useState } from "react";
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
import { Search, Loader2 } from "lucide-react";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewClientDialogProps) {
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
  const { buscarCnpj, searching } = useCnpjLookup();

  const resetForm = () => {
    setEmpresa("");
    setContato("");
    setEmail("");
    setTelefone("");
    setCpfCnpj("");
    setCep("");
    setEndereco("");
    setNumero("");
    setComplemento("");
    setCidade("");
    setEstado("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleBuscarCnpj = async () => {
    const data = await buscarCnpj(cpfCnpj);
    if (data) {
      if (data.empresa) setEmpresa(data.empresa);
      if (data.email) setEmail(data.email);
      if (data.telefone) setTelefone(data.telefone);
      if (data.cep) setCep(data.cep);
      if (data.endereco) setEndereco(data.endereco);
      if (data.numero) setNumero(data.numero);
      if (data.complemento) setComplemento(data.complemento);
      if (data.cidade) setCidade(data.cidade);
      if (data.estado) setEstado(data.estado);
      if (data.cnpj_formatado) setCpfCnpj(data.cnpj_formatado);
    }
  };

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("upsert_customer_profile", {
      p_email: email.trim(),
      p_empresa: empresa || null,
      p_contato: contato || null,
      p_telefone: telefone || null,
      p_cpf_cnpj: cpfCnpj || null,
      p_cep: cep || null,
      p_cidade: cidade || null,
      p_estado: estado || null,
      p_endereco: endereco || null,
      p_numero: numero || null,
      p_complemento: complemento || null,
    });

    setSaving(false);

    if (error) {
      console.error("Erro ao criar cliente:", error);
      toast.error(`Erro ao criar cliente: ${error.message}`);
      return;
    }

    if (!data) {
      toast.error("Não foi possível criar o cliente");
      return;
    }

    toast.success("Cliente cadastrado com sucesso");
    resetForm();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
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
            <Label>Email *</Label>
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
            <div className="flex gap-2">
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBuscarCnpj}
                disabled={searching || !cpfCnpj}
                title="Buscar CNPJ"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
