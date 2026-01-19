import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, FileText } from "lucide-react";

type Order = {
  id: string;
  order_number: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
};

interface ClientOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientEmail: string | null;
  clientName: string | null;
}

export default function ClientOrdersDialog({
  open,
  onOpenChange,
  clientEmail,
  clientName,
}: ClientOrdersDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && clientEmail) {
      loadOrders();
    }
  }, [open, clientEmail]);

  const loadOrders = async () => {
    if (!clientEmail) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .eq("customer_email", clientEmail)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      toast.error("Erro ao carregar pedidos");
      return;
    }

    setOrders(data || []);
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      processing: { label: "Em andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      sold: { label: "Vendido", variant: "default" },
      lost: { label: "Perdido", variant: "destructive" },
      shipped: { label: "Enviado", variant: "outline" },
    };
    const statusInfo = statusMap[status || "pending"] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handleViewOrder = (orderId: string) => {
    onOpenChange(false);
    navigate(`/admin/pedidos/${orderId}/editar`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Pedidos de {clientName || "Cliente"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando pedidos...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum pedido encontrado para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      Pedido #{order.order_number || order.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")} •{" "}
                    {order.total
                      ? `R$ ${order.total.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
                      : "Total não definido"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
