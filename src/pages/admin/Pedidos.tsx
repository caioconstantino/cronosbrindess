import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

type Order = {
  id: string;
  user_id: string;
  total: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  profiles: {
    empresa: string | null;
    contato: string | null;
  } | null;
};

export default function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadOrders();
    }
  }, [user, isAdmin, loading]);

  const loadOrders = async () => {
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar pedidos");
      return;
    }

    // Load profiles for each order using customer_email
    const ordersWithProfiles = await Promise.all(
      (ordersData || []).map(async (order) => {
        if (!order.customer_email) {
          return { ...order, profiles: null };
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("empresa, contato")
          .eq("email", order.customer_email)
          .maybeSingle();

        return {
          ...order,
          profiles: profileData,
        };
      })
    );

    setOrders(ordersWithProfiles);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status do pedido");
    } else {
      toast.success("Status atualizado com sucesso!");
      loadOrders();
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      processing: "Processando",
      completed: "Concluído",
      cancelled: "Cancelado",
    };

    return (
      <Badge variant={variants[status || "pending"]}>
        {labels[status || "pending"]}
      </Badge>
    );
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pedidos</h1>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    Pedido #{order.id.slice(0, 8)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  {order.profiles && (
                    <div className="mt-2 text-sm">
                      <p><strong>Empresa:</strong> {order.profiles.empresa}</p>
                      <p><strong>Contato:</strong> {order.profiles.contato}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(order.status)}
                  {order.total && (
                    <p className="text-lg font-semibold">
                      R$ {order.total.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {order.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium">Observações:</p>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm">Alterar status:</span>
                  <Select
                    value={order.status || "pending"}
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="processing">Processando</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => navigate(`/admin/pedidos/${order.id}/editar`)}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  Editar Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
