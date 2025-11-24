import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Download, Mail } from "lucide-react";
import jsPDF from "jspdf";
import logoImage from "@/assets/logo-cronos.png";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  payment_terms: string | null;
  delivery_terms: string | null;
  validity_terms: string | null;
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
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

    // Set email for dialog
    if (profileData?.email) {
      setEmailTo(profileData.email);
    }

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
    if (!id || !order) return;

    const total = calculateTotal();

    // Update order total and terms
    const { error: orderError } = await supabase
      .from("orders")
      .update({ 
        total,
        payment_terms: order.payment_terms,
        delivery_terms: order.delivery_terms,
        validity_terms: order.validity_terms
      })
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

  const generatePDF = async (download = true) => {
    if (!order) return null;

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

      const textX = margin + 24;
      const imgSize = 18;

      if (item.products.image_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = item.products.image_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
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

    // Additional terms
    y += 15;
    
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("PAGAMENTO:", margin, y);
    pdf.setFont("helvetica", "normal");
    const paymentText = pdf.splitTextToSize(order.payment_terms || "21 DDL, CONTADOS A PARTIR DA EMISSÃO DA NF DE VENDA.", pageWidth - 2 * margin);
    pdf.text(paymentText, margin, y + 5);
    y += 5 + (paymentText.length * 5);

    pdf.setFont("helvetica", "bold");
    pdf.text("ENTREGA:", margin, y);
    pdf.setFont("helvetica", "normal");
    const deliveryText = pdf.splitTextToSize(order.delivery_terms || "A COMBINAR", pageWidth - 2 * margin);
    pdf.text(deliveryText, margin, y + 5);
    y += 5 + (deliveryText.length * 5);

    pdf.setFont("helvetica", "bold");
    pdf.text("VALIDADE:", margin, y);
    pdf.setFont("helvetica", "normal");
    const validityText = pdf.splitTextToSize(order.validity_terms || "10 DIAS - SUJEITO A CONFIRMAÇÃO DE ESTOQUE NO ATO DA FORMALIZAÇÃO DA COMPRA.", pageWidth - 2 * margin);
    pdf.text(validityText, margin, y + 5);
    y += 5 + (validityText.length * 5) + 10;

    // Legal terms
    if (y > 200) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    
    const terms = [
      "* FOTOLITO já incluso.",
      "* Todos os Impostos inclusos, exceto Substituição Tributária de ICMS Estaduais são de responsabilidade da empresa compradora.",
      "* ICMS ST: Para vendas de mercadorias com a opção \"uso e consumo\" faturadas e/ou destinadas para outras unidades federativas (entenda-se todos os estados do Brasil, com exceção de São Paulo) onde exista protocolo ou convênio com o Estado de São Paulo, ocorrerá a cobrança de ICMS ST. No orçamento acima NÃO está incluso tal imposto. Cabe ao cliente/comprador consultar sua alíquota, pois havendo a determinação do pagamento por parte da legislação do Estado de destino, o mesmo será recolhido antecipadamente e lançado na Nota Fiscal e boleto e/ou depósito, sem que haja a necessidade do aceite por parte da empresa/cliente comprador.",
      "* O imposto da Substituição Tributária (ST) NÃO está incluso no preço final do orçamento, por se tratar de uma particularidade entre os Estados.",
      "* O prazo de entrega previsto ( contados a partir da aprovação do layout virtual ) poderá sofrer modificações ou atrasos por motivos de força maior ou caso fortuito.",
      "* Para desenvolvimento do layout virtual é necessário o envio da logomarca vetorizada.",
      "* A vetorização da logomarca quando feita por nós, terão seus custos cobrados em separado conforme previamente acordado.",
      "* A produção do pedido somente terá inicio com a aprovação da amostra virtual, momento em que será considerado aprovado o presente orçamento/pedido gerando os efeitos legais.",
      "* A aprovação da amostra virtual e amostra física (produzida quando solicitado ) se darão através de e-mail e ou qualquer outro meio legal de comunicação, desde que identificando quem aprovou a amostra.",
      "* A aprovação das amostras virtual e física deverá conter os dados pessoais de quem aprovou, bem como a identificação da empresa que representa.",
      "* As condições de pagamento são as previstas acima, sendo que o prazo para pagamento começara a valer a partir da data de faturamento do produto (aceitamos Cartões de Crédito).",
      "* Após a aprovação da amostra virtual e física ( quando solicitada ) não serão permitidas retratações/ retificações em relação aos campos acima, salvo se houver anuência expressa de ambas as partes.",
      "* A gravação a laser é um processo de corrosão sobre o material, podendo variar sua tonalidade de acordo com a matéria prima do produto.",
      "* A responsabilidade pela contratação do serviço de transporte para o envio de mercadorias para fora do município de São Paulo é da empresa solicitante.",
      "* No entanto, podemos indicar uma transportadora, sem nos responsabilizarmos por eventuais danos ou atrasos ocorridos durante o transporte do produto.",
      "* Estoque sujeito a alterações até o fechamento do pedido.",
      "* O cancelamento do orçamento/ pedido, após a aprovação da amostra virtual, provocará a aplicação da cláusula penal estipulada em 20% ( vinte por cento ) do valor do pedido, além de responsabilidade em indenização por eventuais perdas e danos, com a indenização pelos custos ocorridos com o desenvolvimento de modelos e compra de matéria prima, bem como de mão de obra utilizada.",
      "* Fica eleito o Fórum da cidade de São Paulo para dirimir todas e quaisquer dúvidas ou litígios provenientes deste pedido.",
      "",
      "Favor retornar este documento com os dados cadastrais completos ( Razão Social, Nome Fantasia, Endereço Completo com CEP, CNPJ, Inscrição Estadual e confirmação de endereços de entrega e cobrança )"
    ];

    for (const term of terms) {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      
      const termLines = pdf.splitTextToSize(term, pageWidth - 2 * margin);
      pdf.text(termLines, margin, y);
      y += termLines.length * 4 + 2;
    }

    // Signature area
    y += 10;
    if (y > 250) {
      pdf.addPage();
      y = 30;
    }

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    
    // Signature box for company
    const signatureY = y;
    pdf.line(margin, signatureY + 20, pageWidth / 2 - 10, signatureY + 20);
    pdf.text("CRONOS BRINDES CORPORATIVOS", margin, signatureY + 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Assinatura e Carimbo", margin, signatureY + 30);

    // Signature box for client
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.line(pageWidth / 2 + 10, signatureY + 20, pageWidth - margin, signatureY + 20);
    pdf.text("CLIENTE", pageWidth / 2 + 10, signatureY + 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Assinatura e Carimbo", pageWidth / 2 + 10, signatureY + 30);

    if (download) {
      pdf.save(`orcamento-${order.order_number}.pdf`);
      toast.success("PDF gerado com sucesso!");
    }

    return pdf;
  };

  const handleSendEmail = async () => {
    if (!emailTo || !order) {
      toast.error("Email do destinatário é obrigatório");
      return;
    }

    if (!items || items.length === 0) {
      toast.error("Não há itens no pedido para gerar o PDF");
      return;
    }

    setSendingEmail(true);

    try {
      // Generate PDF
      const pdf = await generatePDF(false);
      if (!pdf) {
        toast.error("Erro ao gerar PDF");
        setSendingEmail(false);
        return;
      }

      // Convert PDF to base64 string using dataUrl method
      const pdfDataUrl = pdf.output("dataurlstring");
      const base64Content = pdfDataUrl.split(",")[1];

      console.log("PDF Base64 length:", base64Content.length);

      // Send email with attachment
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: emailTo,
          subject: `Orçamento #${order.order_number} - Cronos Brindes`,
          html: `
            <h2>Orçamento #${order.order_number}</h2>
            <p>Olá ${order.profiles?.contato || ""},</p>
            <p>Segue em anexo o orçamento solicitado.</p>
            <p>Qualquer dúvida, estamos à disposição.</p>
            <br>
            <p>Atenciosamente,<br>
            <strong>Cronos Brindes Corporativos</strong><br>
            comercial@cronosbrindes.com.br</p>
          `,
          attachments: [
            {
              filename: `orcamento-${order.order_number}.pdf`,
              content: base64Content,
              contentType: "application/pdf",
            },
          ],
        },
      });

      if (error) throw error;

      toast.success("Orçamento enviado com sucesso!");
      setEmailDialogOpen(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Erro ao enviar orçamento: " + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!order) return <div>Pedido não encontrado</div>;

  return (
    <div className="space-y-6">
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Orçamento por Email</DialogTitle>
            <DialogDescription>
              Digite o email do destinatário para enviar o orçamento em PDF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do destinatário</Label>
              <Input
                id="email"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendingEmail}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <Button onClick={() => generatePDF(true)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Gerar PDF
          </Button>
          <Button onClick={() => setEmailDialogOpen(true)} variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Enviar por Email
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
          <CardTitle>Condições do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Pagamento</label>
            <Input
              value={order.payment_terms || ""}
              onChange={(e) => setOrder({ ...order, payment_terms: e.target.value })}
              placeholder="21 DDL, CONTADOS A PARTIR DA EMISSÃO DA NF DE VENDA."
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Entrega</label>
            <Input
              value={order.delivery_terms || ""}
              onChange={(e) => setOrder({ ...order, delivery_terms: e.target.value })}
              placeholder="A COMBINAR"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Validade</label>
            <Input
              value={order.validity_terms || ""}
              onChange={(e) => setOrder({ ...order, validity_terms: e.target.value })}
              placeholder="10 DIAS - SUJEITO A CONFIRMAÇÃO DE ESTOQUE NO ATO DA FORMALIZAÇÃO DA COMPRA."
            />
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