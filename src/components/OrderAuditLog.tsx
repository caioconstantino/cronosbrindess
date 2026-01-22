import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AuditLog = {
  id: string;
  order_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  changes: Record<string, { old: any; new: any }>;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  created: "Pedido criado",
  updated: "Pedido atualizado",
  status_changed: "Status alterado",
  item_added: "Item adicionado",
  item_removed: "Item removido",
  item_updated: "Item atualizado",
};

const fieldLabels: Record<string, string> = {
  status: "Status",
  total: "Total",
  notes: "Observações",
  payment_terms: "Condições de Pagamento",
  delivery_terms: "Prazo de Entrega",
  validity_terms: "Validade",
  customer_email: "Email do Cliente",
  shipping_cost: "Custo de Envio",
  shipping_type: "Tipo de Envio",
  quantity: "Quantidade",
  price: "Preço",
  selected_variants: "Variantes",
  product_name: "Produto",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluído",
  approved: "Aprovado",
  rejected: "Rejeitado",
  in_production: "Em Produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  sold: "Vendido",
  lost: "Perdido",
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "-";
  
  if (key === "status") {
    return statusLabels[value] || value;
  }
  
  if (key === "total" || key === "price" || key === "shipping_cost") {
    return `R$ ${Number(value).toFixed(2)}`;
  }
  
  // Handle selected_variants specifically
  if (key === "selected_variants" && typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return "-";
    return entries
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  
  // Handle any object type (for nested variant objects in logs)
  if (typeof value === "object" && value !== null) {
    // If it's an object with variant-like structure, format it nicely
    const entries = Object.entries(value);
    if (entries.length === 0) return "-";
    return entries
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null) {
          return `${k}: ${JSON.stringify(v)}`;
        }
        return `${k}: ${v}`;
      })
      .join(", ");
  }
  
  return String(value);
}

type OrderAuditLogProps = {
  orderId: string;
  refreshTrigger?: number;
};

export default function OrderAuditLog({ orderId, refreshTrigger }: OrderAuditLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [orderId, refreshTrigger]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_audit_logs")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading audit logs:", error);
    } else {
      setLogs((data as AuditLog[]) || []);
    }
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "default",
      updated: "secondary",
      status_changed: "outline",
      item_added: "default",
      item_removed: "destructive",
      item_updated: "secondary",
    };
    return variants[action] || "secondary";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma alteração registrada
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadge(log.action)}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {log.user_name || log.user_email || "Sistema"}
                    </span>
                  </div>

                  {Object.keys(log.changes).length > 0 && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-2">
                      {Object.entries(log.changes).map(([field, change]) => (
                        <div key={field} className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            {fieldLabels[field] || field}:
                          </span>
                          <div className="ml-4 flex flex-wrap gap-2 items-center">
                            {change.old !== undefined && (
                              <>
                                <span className="text-destructive line-through">
                                  {formatValue(field, change.old)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <span className="text-primary font-medium">
                              {formatValue(field, change.new)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
