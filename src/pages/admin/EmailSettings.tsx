import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, Server, Eye, EyeOff } from "lucide-react";

export default function EmailSettings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [adminEmail, setAdminEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

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
        setSmtpHost((data as any).smtp_host || "");
        setSmtpPort(String((data as any).smtp_port || 465));
        setSmtpUser((data as any).smtp_user || "");
        setSmtpPassword((data as any).smtp_password || "");
      }
    } catch (error: any) {
      console.error("Error loading email settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        admin_email: adminEmail,
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort) || 465,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
      };

      if (settingsId) {
        const { error } = await supabase
          .from("email_settings")
          .update(payload as any)
          .eq("id", settingsId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_settings")
          .insert(payload as any);
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

  const handleTestEmail = async () => {
    if (!adminEmail) {
      toast.error("Preencha o email do administrador primeiro");
      return;
    }
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: adminEmail,
          subject: "Teste de configuração SMTP - Cronos Brindes",
          html: "<h2>Teste de Email</h2><p>Se você recebeu este email, a configuração SMTP está funcionando corretamente!</p>",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Email de teste enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar email de teste: " + error.message);
    } finally {
      setTestLoading(false);
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SMTP Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6" />
              <div>
                <CardTitle>Configurações SMTP</CardTitle>
                <CardDescription>
                  Configure o servidor SMTP para envio de emails
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">Host SMTP</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Porta</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="465"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Usuário SMTP (Email)</Label>
              <Input
                id="smtpUser"
                type="email"
                placeholder="seuemail@gmail.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPassword">Senha SMTP</Label>
              <div className="relative">
                <Input
                  id="smtpPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha ou senha de app"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Para Gmail, use uma "Senha de App" gerada nas configurações do Google
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6" />
              <div>
                <CardTitle>Email do Administrador</CardTitle>
                <CardDescription>
                  Email para receber notificações de novos pedidos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Notificações Configuradas:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Email ao receber novo pedido de orçamento</li>
                <li>✓ Email para cliente ao alterar status do pedido</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testLoading}
            onClick={handleTestEmail}
          >
            {testLoading ? "Enviando..." : "Enviar Email de Teste"}
          </Button>
        </div>
      </form>
    </div>
  );
}
