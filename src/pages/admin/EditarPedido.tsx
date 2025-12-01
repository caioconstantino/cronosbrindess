import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Download, Mail, Trash2, Plus } from "lucide-react";
import jsPDF from "jspdf";
import logoImage from "@/assets/logo-cronos.png";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRef } from "react";
import { ImageUpload } from "@/components/ImageUpload";

type OrderItem = {
  id: string;
  product_id: string | null;
  quantity: number;
  price: number;
  custom_name?: string | null;
  custom_image_url?: string | null;
  selected_variants?: Record<string, string> | null;
  products?: {
    name: string;
    image_url: string | null;
  } | null;
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
  contact_preference: string | null;
  shipping_cost?: number | null;
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
  salesperson?: {
    contato: string | null;
    email: string | null;
  } | null;
};

type Product = {
  id: string;
  name: string;
  image_url: string | null;
};

export default function EditarPedido() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, { id: string; name: string; options: string[] }[]>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [customItemDialogOpen, setCustomItemDialogOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);
  const [customItemImage, setCustomItemImage] = useState("");
  const { user, isAdmin, isVendedor, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAdmin && !isVendedor) {
      navigate("/login");
      return;
    }
    if (id) {
      loadOrder();
      loadProducts();
    }
  }, [id, isAdmin, isVendedor, authLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, image_url")
      .eq("active", true)
      .order("name");
    
    if (error) {
      console.error("Error loading products:", error);
    } else if (data) {
      setProducts(data);
    }
  };

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

    // Load salesperson profile if order has user_id
    let salespersonData = null;
    if (orderData.user_id) {
      // user_id is the auth user id, so we need to find the profile by matching it
      // First, get the user_roles to confirm this is a salesperson
      const { data: userRoleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", orderData.user_id)
        .eq("role", "vendedor")
        .maybeSingle();

      if (userRoleData) {
        // Get the profile with both contato and email
        const { data } = await supabase
          .from("profiles")
          .select("contato, email")
          .eq("id", orderData.user_id)
          .maybeSingle();
        salespersonData = data;
      }
    }

    setOrder({
      ...orderData,
      profiles: profileData,
      salesperson: salespersonData,
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
          custom_name,
          custom_image_url,
          selected_variants,
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
      // Load variants for each product in the order items
      const uniqueProductIds = Array.from(new Set((itemsData || []).map((i: any) => i.product_id).filter(Boolean)));
      for (const pid of uniqueProductIds) {
        await loadVariants(pid);
      }
    }

    // Check if PDF already exists in bucket
    if (orderData.order_number) {
      const fileName = `${orderData.order_number}.pdf`;
      const { data: fileList, error: listError } = await supabase.storage
        .from("order-pdfs")
        .list("", {
          search: fileName,
        });

      if (!listError && fileList && fileList.length > 0) {
        console.log("PDF already exists in bucket:", fileName);
        setPdfGenerated(true);
      }
    }

    setLoading(false);
  };

  const loadVariants = async (productId: string) => {
    if (!productId || variants[productId]) return;

    const { data, error } = await supabase
      .from("product_variants")
      .select("id, name, options")
      .eq("product_id", productId);

    if (error) {
      console.error("Erro ao carregar variantes:", error);
      return;
    }

    const formatted = (data || []).map((v: any) => ({ id: v.id, name: v.name, options: Array.isArray(v.options) ? v.options as string[] : [] }));
    setVariants(prev => ({ ...prev, [productId]: formatted }));
  };

  const updateItemPrice = (itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setItems(items.map(item => 
      item.id === itemId ? { ...item, price } : item
    ));
  };

  const updateItemQuantity = (itemId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity) || 1;
    if (quantity < 1) return;
    setItems(items.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const updateSelectedVariant = (itemId: string, variantName: string, value: string) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const current = item.selected_variants || {};
      const updated = { ...current, [variantName]: value };
      return { ...item, selected_variants: updated };
    }));
  };

  const removeItem = async (itemId: string) => {
    if (!confirm("Deseja realmente remover este item?")) return;

    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Erro ao remover item");
      return;
    }

    setItems(items.filter(item => item.id !== itemId));
    toast.success("Item removido com sucesso");
  };

  const addItem = async () => {
    if (!selectedProduct || !id) {
      toast.error("Selecione um produto");
      return;
    }

    const { data, error } = await supabase
      .from("order_items")
      .insert({
        order_id: id,
        product_id: selectedProduct.id,
        quantity: newItemQuantity,
        price: 0,
        selected_variants: {},
      })
      .select(`
        id,
        product_id,
        quantity,
        price,
        custom_name,
        custom_image_url,
        products (
          name,
          image_url
        )
      `)
      .single();

    if (error) {
      toast.error("Erro ao adicionar item");
      return;
    }

    if (data) {
      setItems([...items, data as any]);
      setSelectedProduct(null);
      setProductSearch("");
      setNewItemQuantity(1);
      // Load variants for this product so admin can adjust after adding
      if (data.product_id) await loadVariants(data.product_id);
      toast.success("Item adicionado com sucesso");
    }
  };

  const addCustomItem = async () => {
    if (!customItemName.trim() || !id) {
      toast.error("Preencha o nome do item");
      return;
    }

    if (customItemPrice <= 0) {
      toast.error("Preencha um valor válido");
      return;
    }

    const { data, error } = await supabase
      .from("order_items")
      .insert({
        order_id: id,
        product_id: null,
        quantity: customItemQuantity,
        price: customItemPrice,
        custom_name: customItemName,
        custom_image_url: customItemImage || null,
      })
      .select(`
        id,
        product_id,
        quantity,
        price,
        custom_name,
        custom_image_url
      `)
      .single();

    if (error) {
      toast.error("Erro ao adicionar item customizado");
      return;
    }

    if (data) {
      setItems([...items, data as any]);
      setCustomItemDialogOpen(false);
      setCustomItemName("");
      setCustomItemPrice(0);
      setCustomItemQuantity(1);
      setCustomItemImage("");
      toast.success("Item customizado adicionado com sucesso");
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductSuggestions(false);
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
        validity_terms: order.validity_terms,
        shipping_cost: order.shipping_cost || 0
      })
      .eq("id", id);

    if (orderError) {
      toast.error("Erro ao atualizar pedido");
      return;
    }

    // Update each item price and quantity
    for (const item of items) {
      const { error: itemError } = await supabase
        .from("order_items")
        .update({ 
          price: item.price,
          quantity: item.quantity,
          selected_variants: item.selected_variants || {}
        })
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

    setGeneratingPdf(true);

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      
      // Function to add header to any page
      const addHeader = async (startY = 20) => {
        let y = startY;
        
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

        // Header text
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("CRONOS BRINDES CORPORATIVOS", pageWidth / 2, y, { align: "center" });
        
        y += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text("CNPJ: 50.710.018/0001-55", pageWidth / 2, y, { align: "center" });
        
        y += 5;
        pdf.text("comercial@cronosbrindes.com.br", pageWidth / 2, y, { align: "center" });
        
        y += 5;
        // Add WhatsApp icon
        try {
          const whatsappImg = new Image();
          whatsappImg.src = whatsappIcon;
          await new Promise((resolve) => {
            whatsappImg.onload = resolve;
          });
          const iconSize = 4;
          const phoneText = "(11) 93726-0395";
          const phoneTextWidth = pdf.getTextWidth(phoneText);
          const iconX = (pageWidth - phoneTextWidth) / 2 - iconSize - 2;
          pdf.addImage(whatsappImg, "PNG", iconX, y - 3, iconSize, iconSize);
        } catch (error) {
          console.error("Error loading WhatsApp icon:", error);
        }
        pdf.text("(11) 93726-0395", pageWidth / 2, y, { align: "center" });
        
        y += 10;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        return y;
      };

      let y = await addHeader();

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
      
      // Contact preference
      if (order.contact_preference) {
        const preferenceMap: Record<string, string> = {
          telefone: "Telefone",
          whatsapp: "WhatsApp", 
          email: "Email"
        };
        pdf.text(`Preferência de Contato: ${preferenceMap[order.contact_preference] || order.contact_preference}`, margin, y);
        y += 5;
      }
      
      if (order.profiles.endereco) {
        pdf.text(`Endereço: ${order.profiles.endereco}, ${order.profiles.numero || ""}`, margin, y);
        y += 5;
        pdf.text(`${order.profiles.cidade || ""} - ${order.profiles.estado || ""} - CEP: ${order.profiles.cep || ""}`, margin, y);
        y += 5;
      }
    }

    // Salesperson info - below client data
    if (order.salesperson) {
      const vendedorNome = order.salesperson.contato || 'N/A';
      const vendedorEmail = order.salesperson.email || '';
      
      // Buscar telefone do vendedor via profiles
      let vendedorTelefone = '';
      if (order.user_id) {
        const { data: vendedorProfile } = await supabase
          .from("profiles")
          .select("telefone")
          .eq("id", order.user_id)
          .maybeSingle();
        
        if (vendedorProfile?.telefone) {
          vendedorTelefone = vendedorProfile.telefone;
        }
      }
      
      y += 2;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Vendedor: ${vendedorNome}`, margin, y);
      y += 5;
      
      pdf.setFont("helvetica", "normal");
      if (vendedorEmail) {
        pdf.text(`E-mail: ${vendedorEmail}`, margin, y);
        y += 5;
      }
      if (vendedorTelefone) {
        pdf.text(`Telefone: ${vendedorTelefone}`, margin, y);
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
        y = await addHeader();
      }

      const textX = margin + 24;
      const imgSize = 18;

      // Handle both custom items and catalog products
      const itemImage = item.custom_image_url || item.products?.image_url;
      const itemName = item.custom_name || item.products?.name || "Item sem nome";
      
      // Add variants to item name if they exist
      let displayName = itemName;
      if (item.selected_variants && Object.keys(item.selected_variants).length > 0) {
        const variantText = Object.values(item.selected_variants).join(", ");
        displayName = `${itemName} (${variantText})`;
      }

      if (itemImage) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = itemImage;
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

      const descWidth = pageWidth - 2 * margin - 120;
      const lines = pdf.splitTextToSize(displayName, descWidth);
      
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
    
    // Subtotal
    pdf.text("SUBTOTAL:", pageWidth - margin - 60, y, { align: "right" });
    pdf.text(`R$ ${calculateTotal().toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    
    // Shipping if exists
    if (order.shipping_cost && order.shipping_cost > 0) {
      y += 7;
      pdf.text("FRETE:", pageWidth - margin - 60, y, { align: "right" });
      pdf.text(`R$ ${order.shipping_cost.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    }
    
    // Total with shipping
    y += 7;
    const totalWithShipping = calculateTotal() + (order.shipping_cost || 0);
    pdf.text("TOTAL GERAL:", pageWidth - margin - 60, y, { align: "right" });
    pdf.text(`R$ ${totalWithShipping.toFixed(2)}`, pageWidth - margin, y, { align: "right" });

    // Additional terms
    y += 15;
    
    if (y > 240) {
      pdf.addPage();
      y = await addHeader();
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
      y = await addHeader();
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
        y = await addHeader();
      }
      
      const termLines = pdf.splitTextToSize(term, pageWidth - 2 * margin);
      pdf.text(termLines, margin, y);
      y += termLines.length * 4 + 2;
    }

    // Signature area
    y += 10;
    if (y > 250) {
      pdf.addPage();
      y = await addHeader();
      y += 10;
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
      }

      // Save PDF to storage bucket
      const pdfBlob = pdf.output("blob");
      const fileName = `${order.order_number}.pdf`;

      console.log("PDF Blob created, size:", pdfBlob.size, "type:", pdfBlob.type);

      // Delete existing file if any
      const { error: deleteError } = await supabase.storage
        .from("order-pdfs")
        .remove([fileName]);

      if (deleteError && deleteError.message !== "Object not found") {
        console.error("Error deleting old PDF:", deleteError);
      }

      // Upload new PDF with explicit content type
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("order-pdfs")
        .upload(fileName, pdfBlob, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
        toast.error("Erro ao salvar PDF");
        setGeneratingPdf(false);
        return null;
      }

      console.log("PDF uploaded successfully:", uploadData);

      setPdfGenerated(true);
      toast.success("PDF gerado e salvo com sucesso!");

      return pdf;
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo || !order) {
      toast.error("Email do destinatário é obrigatório");
      return;
    }

    if (!pdfGenerated) {
      toast.error("Gere o PDF antes de enviar o email");
      return;
    }

    setSendingEmail(true);

    try {
      const fileName = `${order.order_number}.pdf`;
      
      // Create a signed URL for the PDF (valid for 7 days)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("order-pdfs")
        .createSignedUrl(fileName, 604800); // 7 days in seconds

      if (signedUrlError || !signedUrlData) {
        console.error("Error creating signed URL:", signedUrlError);
        throw new Error("Erro ao criar link do PDF");
      }

      console.log("Signed URL created:", signedUrlData.signedUrl);

      // Send email with link to PDF
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: emailTo,
          subject: `Orçamento #${order.order_number} - Cronos Brindes`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                Orçamento #${order.order_number}
              </h2>
              <p style="font-size: 16px; color: #555;">
                Olá ${order.profiles?.contato || ""},
              </p>
              <p style="font-size: 14px; color: #666; line-height: 1.6;">
                Seu orçamento está pronto! Clique no botão abaixo para visualizar:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${signedUrlData.signedUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 15px 40px; 
                          text-decoration: none; display: inline-block; font-size: 16px; 
                          border-radius: 5px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                  📄 Ver Orçamento
                </a>
              </div>
              <p style="color: #999; font-size: 12px; font-style: italic; text-align: center;">
                Este link é válido por 7 dias.
              </p>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Qualquer dúvida, estamos à disposição.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="font-size: 14px; color: #555; margin: 5px 0;">
                  Atenciosamente,<br>
                  <strong style="color: #333;">Cronos Brindes Corporativos</strong><br>
                  <a href="mailto:comercial@cronosbrindes.com.br" style="color: #4CAF50;">
                    comercial@cronosbrindes.com.br
                  </a>
                </p>
              </div>
            </div>
          `,
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
      {/* Custom Item Dialog */}
      <Dialog open={customItemDialogOpen} onOpenChange={setCustomItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Item Personalizado</DialogTitle>
            <DialogDescription>
              Adicione um item específico para este orçamento com foto, nome e valor próprios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ImageUpload
              bucket="product-images"
              currentImageUrl={customItemImage}
              onImageUploaded={setCustomItemImage}
              label="Imagem do Item"
            />
            <div>
              <Label htmlFor="custom-name">Nome do Item</Label>
              <Input
                id="custom-name"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Ex: Caneta Personalizada Cliente X"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-price">Valor Unitário (R$)</Label>
                <Input
                  id="custom-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="custom-quantity">Quantidade</Label>
                <Input
                  id="custom-quantity"
                  type="number"
                  min="1"
                  value={customItemQuantity}
                  onChange={(e) => setCustomItemQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addCustomItem}>
              Adicionar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
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
          <Button variant="ghost" size="icon" onClick={() => navigate(isAdmin ? "/admin/pedidos" : "/vendedor/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Pedido</h1>
            <p className="text-muted-foreground">Orçamento #{order.order_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => generatePDF(true)} 
            variant="outline" 
            className="gap-2"
            disabled={generatingPdf}
          >
            <Download className="h-4 w-4" />
            {generatingPdf ? "Gerando..." : "Gerar PDF"}
          </Button>
          <Button 
            onClick={() => setEmailDialogOpen(true)} 
            variant="outline" 
            className="gap-2"
            disabled={!pdfGenerated || generatingPdf}
          >
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
            <p className="text-sm text-muted-foreground">Preferência de Contato</p>
            <p className="font-medium">
              {order.contact_preference === "telefone" && "Telefone"}
              {order.contact_preference === "whatsapp" && "WhatsApp"}
              {order.contact_preference === "email" && "Email"}
              {!order.contact_preference && "-"}
            </p>
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
          <div>
            <label className="text-sm font-medium block mb-2">Frete (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={order.shipping_cost || 0}
              onChange={(e) => setOrder({ ...order, shipping_cost: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
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
            {items.map((item) => {
              const itemName = item.custom_name || item.products?.name || "Item sem nome";
              const itemImage = item.custom_image_url || item.products?.image_url;
              
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  {itemImage && (
                    <img 
                      src={itemImage} 
                      alt={itemName}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{itemName}</p>
                    {item.custom_name && (
                      <span className="text-xs text-muted-foreground">Item Customizado</span>
                    )}
                    {(!item.product_id || !variants[item.product_id] || variants[item.product_id].length === 0) && item.selected_variants && Object.keys(item.selected_variants).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selected_variants).map(([key, value]) => (
                          <span key={key} className="text-xs px-2 py-0.5 bg-muted rounded">
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Show selectors for variants available for this product and allow admin to change */}
                    {item.product_id && variants[item.product_id] && variants[item.product_id].length > 0 && (
                      <div className="space-y-2 mt-2">
                        {variants[item.product_id].map((variant) => (
                          <div key={variant.id} className="space-y-2">
                            <Label className="text-sm">{variant.name}</Label>
                            <Select
                              value={(item.selected_variants && item.selected_variants[variant.name]) || ""}
                              onValueChange={(value) => updateSelectedVariant(item.id, variant.name, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Selecione ${variant.name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {(variant.options as string[]).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                      className="w-24"
                    />
                  </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )})}

            
            {/* Add new item section */}
            <div className="space-y-4">
              {/* Add product from catalog */}
              <div className="flex items-center gap-4 p-4 border rounded-lg border-dashed">
                <div className="flex-1 relative" ref={productSearchRef}>
                  <label className="text-sm text-muted-foreground block mb-2">Adicionar Produto do Catálogo</label>
                  <Input
                    type="text"
                    placeholder="Digite o nome do produto..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSuggestions(true);
                      setSelectedProduct(null);
                    }}
                    onFocus={() => setShowProductSuggestions(true)}
                  />
                  
                  {/* Suggestions dropdown */}
                  {showProductSuggestions && productSearch && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                        >
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{product.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24">
                  <label className="text-sm text-muted-foreground block mb-2">Qtd</label>
                  <Input
                    type="number"
                    min="1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button onClick={addItem} className="mt-6" disabled={!selectedProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {/* Add custom item button */}
              <div className="flex items-center justify-center p-4 border rounded-lg border-dashed">
                <Button 
                  onClick={() => setCustomItemDialogOpen(true)} 
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Item Personalizado
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">R$ {calculateTotal().toFixed(2)}</span>
              </div>
              {order.shipping_cost && order.shipping_cost > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="font-semibold">R$ {order.shipping_cost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl border-t pt-2">
                <span className="font-bold">Total Geral</span>
                <span className="font-bold text-primary">
                  R$ {(calculateTotal() + (order.shipping_cost || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}