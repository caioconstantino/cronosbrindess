import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CnpjData = {
  empresa: string;
  contato: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  cnpj_formatado: string;
};

export function useCnpjLookup() {
  const [searching, setSearching] = useState(false);

  const buscarCnpj = async (cnpj: string): Promise<CnpjData | null> => {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      toast.error("CNPJ inválido. Deve conter 14 dígitos.");
      return null;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("buscar-cnpj", {
        body: { cnpj: cleanCnpj },
      });

      if (error) {
        toast.error("Erro ao buscar CNPJ");
        console.error("CNPJ lookup error:", error);
        return null;
      }

      if (data.error) {
        toast.error(data.error);
        return null;
      }

      toast.success("Dados do CNPJ carregados com sucesso!");
      return data as CnpjData;
    } catch (err: any) {
      toast.error("Erro ao buscar CNPJ: " + (err.message || "erro desconhecido"));
      return null;
    } finally {
      setSearching(false);
    }
  };

  return { buscarCnpj, searching };
}
