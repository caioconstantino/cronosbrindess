import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";
import logoImage from "@/assets/logo-cronos.png";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    image_url: string | null;
  };
};

type Order = {
  id: string;
  user_id: string;
  order_number: string;
  total: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  profiles: {
    empresa: string | null;
    contato: string | null;
    email: string | null;
    telefone: string | null;
    cpf_cnpj: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  } | null;
};

export default function EditarPedido() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAdmin) {
      navigate("/");
      return;
    }
    if (id) {
      loadOrder();
    }
  }, [id, isAdmin, authLoading]);

  const loadOrder = async () => {
    if (!id) return;

    // Load order with profile
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError || !orderData) {
      toast.error("Erro ao carregar pedido");
      navigate("/admin/pedidos");
      return;
    }

    // Load profile using customer_email
    let profileData = null;
    if (orderData.customer_email) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", orderData.customer_email)
        .maybeSingle();
      profileData = data;
    }

    setOrder({
      ...orderData,
      profiles: profileData,
    });

    // Load order items with products
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        product_id,
        quantity,
        price,
        products (
          name,
          image_url
        )
      `)
      .eq("order_id", id);

    if (itemsError) {
      toast.error("Erro ao carregar itens do pedido");
    } else if (itemsData) {
      setItems(itemsData as any);
    }

    setLoading(false);
  };

  const updateItemPrice = (itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setItems(items.map(item => 
      item.id === itemId ? { ...item, price } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const saveOrder = async () => {
    if (!id) return;

    const total = calculateTotal();

    // Update order total
    const { error: orderError } = await supabase
      .from("orders")
      .update({ total })
      .eq("id", id);

    if (orderError) {
      toast.error("Erro ao atualizar pedido");
      return;
    }

    // Update each item price
    for (const item of items) {
      const { error: itemError } = await supabase
        .from("order_items")
        .update({ price: item.price })
        .eq("id", item.id);

      if (itemError) {
        toast.error(`Erro ao atualizar item ${item.products.name}`);
        return;
      }
    }

    toast.success("Pedido atualizado com sucesso!");
    navigate("/admin/pedidos");
  };

  const generatePDF = async () => {
    if (!order) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Add logo
    try {
      const img = new Image();
      img.src = logoImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const imgWidth = 40;
      const imgHeight = (img.height * imgWidth) / img.width;
      pdf.addImage(img, "PNG", pageWidth / 2 - imgWidth / 2, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } catch (error) {
      console.error("Error loading logo:", error);
    }

    // Header
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("CRONOS BRINDES CORPORATIVOS", pageWidth / 2, y, { align: "center" });
    
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    // Telefone intencionalmente vazio
    y += 5;
    pdf.text("comercial@cronosbrindes.com.br", pageWidth / 2, y, { align: "center" });
    
    y += 10;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Order info
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Orçamento No. ${order.order_number}`, margin, y);
    pdf.text(`Data: ${format(new Date(order.created_at), "dd/MM/yyyy")}`, pageWidth - margin - 40, y);
    
    y += 10;

    // Client info
    if (order.profiles) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Empresa: ${order.profiles.empresa || ""}`, margin, y);
      y += 5;
      pdf.text(`Contato: ${order.profiles.contato || ""}`, margin, y);
      y += 5;
      pdf.text(`E-mail: ${order.profiles.email || ""}`, margin, y);
      pdf.text(`Telefone: ${order.profiles.telefone || ""}`, margin + 80, y);
      y += 5;
      if (order.profiles.endereco) {
        pdf.text(`Endereço: ${order.profiles.endereco}, ${order.profiles.numero || ""}`, margin, y);
        y += 5;
        pdf.text(`${order.profiles.cidade || ""} - ${order.profiles.estado || ""} - CEP: ${order.profiles.cep || ""}`, margin, y);
        y += 5;
      }
    }

    y += 5;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Table header
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(230, 230, 230);
    pdf.rect(margin, y - 5, pageWidth - 2 * margin, 8, "F");
    pdf.text("Descrição", margin + 24, y);
    pdf.text("Qtd", pageWidth - margin - 60, y);
    pdf.text("Valor Unit.", pageWidth - margin - 40, y);
    pdf.text("Total", pageWidth - margin - 15, y, { align: "right" });
    
    y += 10;

    // Items
    pdf.setFont("helvetica", "normal");
    for (const item of items) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      const textX = margin + 24; // espaço para miniatura
      const imgSize = 18;

      // Tentar renderizar a miniatura do produto
      if (item.products.image_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = item.products.image_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // ignora erros de imagem
          });
          try {
            pdf.addImage(img, "JPEG", margin + 2, y - 5, imgSize, imgSize);
          } catch (e) {
            try {
              pdf.addImage(img, "PNG", margin + 2, y - 5, imgSize, imgSize);
            } catch {
              // ignora se falhar
            }
          }
        } catch {
          // ignora erros
        }
      }

      const productName = item.products.name;
      const descWidth = pageWidth - 2 * margin - 120;
      const lines = pdf.splitTextToSize(productName, descWidth);
      
      pdf.text(lines, textX, y);
      pdf.text(item.quantity.toString(), pageWidth - margin - 60, y);
      pdf.text(`R$ ${item.price.toFixed(2)}`, pageWidth - margin - 40, y);
      pdf.text(`R$ ${(item.price * item.quantity).toFixed(2)}`, pageWidth - margin, y, { align: "right" });
      
      const rowHeight = Math.max(imgSize + 2, 7 * (Array.isArray(lines) ? lines.length : 1), 10);
      y += rowHeight + 3;
    }

    // Total
    y += 5;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("TOTAL GERAL:", pageWidth - margin - 60, y, { align: "right" });
    pdf.text(`R$ ${calculateTotal().toFixed(2)}`, pageWidth - margin, y, { align: "right" });

    // Save PDF
    pdf.save(`orcamento-${order.order_number}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  if (loading) return <div>Carregando...</div>;
  if (!order) return <div>Pedido não encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Pedido</h1>
            <p className="text-muted-foreground">Orçamento #{order.order_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generatePDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Gerar PDF
          </Button>
          <Button onClick={saveOrder}>
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Empresa</p>
            <p className="font-medium">{order.profiles?.empresa || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Contato</p>
            <p className="font-medium">{order.profiles?.contato || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{order.profiles?.email || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-medium">{order.profiles?.telefone || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data do Pedido</p>
            <p className="font-medium">{format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                {item.products.image_url && (
                  <img 
                    src={item.products.image_url} 
                    alt={item.products.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.products.name}</p>
                  <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Valor Unitário</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItemPrice(item.id, e.target.value)}
                      className="w-32"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="text-right min-w-[100px]">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-bold text-lg">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t flex justify-end">
            <div className="text-right">
              <p className="text-muted-foreground mb-2">Total Geral</p>
              <p className="text-3xl font-bold text-primary">
                R$ {calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
