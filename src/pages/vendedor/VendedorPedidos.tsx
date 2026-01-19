import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Edit, Plus, Lock } from "lucide-react";
import { logOrderChange } from "@/hooks/useOrderAudit";

type Order = {
  id: string;
  order_number: string;
  total: number | null;
  status: string | null;
  created_at: string;
  customer_email: string | null;
  profiles: {
    empresa: string | null;
    contato: string | null;
  } | null;
};

export default function VendedorPedidos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessType, setAccessType] = useState<'master' | 'own'>('own');

  useEffect(() => {
    if (user) {
      loadClientAccessType();
    }
  }, [user]);

  useEffect(() => {
    if (user && accessType) {
      loadOrders();
    }
  }, [user, accessType]);

  const loadClientAccessType = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("client_access_type")
      .eq("user_id", user.id)
      .eq("role", "vendedor")
      .maybeSingle();

    const type = data?.client_access_type;
    setAccessType(type === 'master' ? 'master' : 'own');
  };

  const loadOrders = async () => {
    if (!user) return;

    try {
      // Build query based on access type
      let query = supabase
        .from("orders")
        .select("*");

      if (accessType === 'own') {
        // For 'own' access, filter by user_id (orders created by this vendor)
        query = query.eq("user_id", user.id);
      } else {
        // For 'master' access, show all orders (RLS will handle permissions)
        // No additional filter needed
      }

      const { data: ordersData, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Load profiles for each order
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
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    
    // Prevent changing status if order is already sold
    if (order?.status === "sold") {
      toast.error("Pedidos vendidos não podem ser alterados");
      return;
    }
    
    const oldStatus = order?.status || "pending";
    
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status do pedido");
    } else {
      // Log the status change
      await logOrderChange(
        orderId,
        "status_changed",
        {
          status: { old: oldStatus, new: newStatus }
        },
        user?.id,
        user?.email,
        order?.profiles?.contato || user?.email
      );

      toast.success("Status atualizado com sucesso!");
      loadOrders();
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      cancelled: "destructive",
      sold: "default",
      lost: "destructive",
      shipped: "outline",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      processing: "Processando",
      completed: "Concluído",
      cancelled: "Cancelado",
      sold: "Vendido",
      lost: "Perdido",
      shipped: "Enviado",
    };

    return (
      <Badge variant={variants[status || "pending"] || "secondary"}>
        {labels[status || "pending"] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {accessType === 'master' ? 'Visualizando todos os pedidos' : 'Visualizando pedidos dos seus clientes'}
          </p>
        </div>
        <Button onClick={() => navigate("/vendedor/pedidos/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Pedido
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum pedido encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const isSold = order.status === "sold";
            
            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        Pedido #{order.order_number || order.id.slice(0, 8)}
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
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="flex gap-2 items-center">
                      <span className="text-sm">Alterar status:</span>
                      {isSold ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span>Bloqueado</span>
                        </div>
                      ) : (
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
                            <SelectItem value="sold">Vendido</SelectItem>
                            <SelectItem value="shipped">Enviado</SelectItem>
                            <SelectItem value="lost">Perdido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button
                      onClick={() => navigate(`/vendedor/pedidos/${order.id}/editar`)}
                      variant="default"
                      className="w-full sm:w-auto"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {isSold ? "Visualizar Pedido" : "Editar Pedido"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
