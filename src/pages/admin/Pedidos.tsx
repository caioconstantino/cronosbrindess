import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { logOrderChange } from "@/hooks/useOrderAudit";

type Order = {
  id: string;
  user_id: string;
  total: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  order_number: string | null;
  customer_email: string | null;
  profiles: {
    empresa: string | null;
    contato: string | null;
  } | null;
};

const ITEMS_PER_PAGE = 10;

export default function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // Filter orders based on status and client search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Client search filter
      if (clientSearch.trim()) {
        const searchLower = clientSearch.toLowerCase();
        const empresa = order.profiles?.empresa?.toLowerCase() || "";
        const contato = order.profiles?.contato?.toLowerCase() || "";
        const email = order.customer_email?.toLowerCase() || "";
        const orderNumber = order.order_number?.toLowerCase() || "";
        
        if (!empresa.includes(searchLower) && 
            !contato.includes(searchLower) && 
            !email.includes(searchLower) &&
            !orderNumber.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, clientSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, clientSearch]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
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
      
      // Send email to customer
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("customer_email, order_number")
          .eq("id", orderId)
          .single();

        if (orderData?.customer_email) {
          const statusLabels: Record<string, string> = {
            pending: "Pendente",
            processing: "Em Processamento",
            completed: "Concluído",
            cancelled: "Cancelado",
          };

          await supabase.functions.invoke("send-email", {
            body: {
              to: orderData.customer_email,
              subject: `Atualização do Orçamento #${orderData.order_number}`,
              html: `
                <h2>Atualização do Seu Orçamento</h2>
                <p>Olá${order?.profiles?.contato ? ` ${order.profiles.contato}` : ''},</p>
                <p>Seu orçamento <strong>#${orderData.order_number}</strong> foi atualizado.</p>
                <p><strong>Novo Status:</strong> ${statusLabels[newStatus]}</p>
                <p>Em breve entraremos em contato com mais informações.</p>
                <br>
                <p>Atenciosamente,<br>Cronos Brindes Corporativos</p>
              `,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending customer email:", emailError);
        // Don't block the status update if email fails
      }
      
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <Button onClick={() => navigate("/admin/pedidos/novo")}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Pedido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa, contato, email ou nº do pedido..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        Exibindo {paginatedOrders.length} de {filteredOrders.length} pedidos
      </p>

      <div className="grid gap-4">
        {paginatedOrders.map((order) => (
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
                  {order.customer_email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.customer_email}
                    </p>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and pages around current
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, index, array) => {
                // Add ellipsis between non-consecutive pages
                const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                return (
                  <div key={page} className="flex items-center">
                    {showEllipsisBefore && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  </div>
                );
              })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {filteredOrders.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum pedido encontrado com os filtros selecionados.
          </p>
        </Card>
      )}
    </div>
  );
}