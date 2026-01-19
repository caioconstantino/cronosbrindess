import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Package, ShoppingCart, Users, Layers, DollarSign, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodFilter = "last6months" | "last12months" | "thisYear" | "lastYear" | "all";

interface MonthlySales {
  month: string;
  monthKey: string; // yyyy-MM format for filtering
  total: number;
  orders: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    categories: 0,
  });
  const [totalSold, setTotalSold] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("last6months");
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }

    if (isAdmin) {
      loadStats();
      loadSalesData();
    }
  }, [user, isAdmin, loading, periodFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case "last6months":
        return { start: subMonths(now, 6), end: now };
      case "last12months":
        return { start: subMonths(now, 12), end: now };
      case "thisYear":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "lastYear":
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      case "all":
        return { start: new Date(2020, 0, 1), end: now };
      default:
        return { start: subMonths(now, 6), end: now };
    }
  };

  const loadStats = async () => {
    const [productsResult, ordersResult, customersResult, categoriesResult] =
      await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);

    setStats({
      products: productsResult.count || 0,
      orders: ordersResult.count || 0,
      customers: customersResult.count || 0,
      categories: categoriesResult.count || 0,
    });
  };

  const loadSalesData = async () => {
    const { start, end } = getDateRange();
    
    // Fetch completed orders within the period
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, total, created_at, status")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (error) {
      console.error("Error loading sales data:", error);
      return;
    }

    // Calculate total sold
    const total = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    setTotalSold(total);
    setCompletedOrders(orders?.length || 0);

    // Group by month for chart
    const monthlyData: Record<string, { total: number; orders: number }> = {};
    
    // Initialize months
    let current = startOfMonth(start);
    while (current <= end) {
      const key = format(current, "yyyy-MM");
      monthlyData[key] = { total: 0, orders: 0 };
      current = subMonths(current, -1);
    }

    // Aggregate orders by month
    orders?.forEach((order) => {
      const key = format(new Date(order.created_at), "yyyy-MM");
      if (monthlyData[key]) {
        monthlyData[key].total += order.total || 0;
        monthlyData[key].orders += 1;
      }
    });

    // Convert to array and sort
    const salesArray: MonthlySales[] = Object.entries(monthlyData)
      .map(([key, value]) => ({
        month: format(new Date(key + "-01"), "MMM/yy", { locale: ptBR }),
        monthKey: key, // Keep yyyy-MM format for navigation
        total: value.total,
        orders: value.orders,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.monthKey + "-01");
        const dateB = new Date(b.monthKey + "-01");
        return dateA.getTime() - dateB.getTime();
      });

    setMonthlySales(salesArray);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const chartConfig = {
    total: {
      label: "Total Vendido",
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Pedidos",
      color: "hsl(var(--secondary))",
    },
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-4xl font-bold">Dashboard Admin</h1>
        <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last6months">Últimos 6 meses</SelectItem>
            <SelectItem value="last12months">Últimos 12 meses</SelectItem>
            <SelectItem value="thisYear">Este ano</SelectItem>
            <SelectItem value="lastYear">Ano passado</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSold)}</div>
            <p className="text-xs text-muted-foreground">Pedidos concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Monthly Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Vendas por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Total Vendido"
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (data && data.monthKey) {
                        navigate(`/admin/pedidos?month=${data.monthKey}`);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Pedidos Concluídos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
