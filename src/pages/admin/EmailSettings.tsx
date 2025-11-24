import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

export default function EmailSettings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAdminEmail(data.admin_email);
        setSettingsId(data.id);
      }
    } catch (error: any) {
      console.error("Error loading email settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (settingsId) {
        // Update existing settings
        const { error } = await supabase
          .from("email_settings")
          .update({ admin_email: adminEmail })
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("email_settings")
          .insert({ admin_email: adminEmail });

        if (error) throw error;
      }

      toast.success("Configurações de email salvas com sucesso!");
      loadSettings();
    } catch (error: any) {
      console.error("Error saving email settings:", error);
      toast.error("Erro ao salvar configurações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6" />
            <div>
              <CardTitle>Configurações de Email</CardTitle>
              <CardDescription>
                Configure o email para receber notificações de novos pedidos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email do Administrador</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@cronosbrindes.com.br"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Este email receberá notificações quando houver novos pedidos de orçamento
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Notificações Configuradas:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Email ao receber novo pedido de orçamento</li>
                <li>✓ Email para cliente ao alterar status do pedido</li>
              </ul>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
