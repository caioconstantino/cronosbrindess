import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Product = {
  id: string;
  name: string;
  image_url: string | null;
};

type Variant = {
  id: string;
  name: string;
  options: string[];
};

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedVariants: Record<string, string>;
};

export default function CriarPedido() {
  const navigate = useNavigate();
  const { isAdmin, isVendedor, loading: authLoading } = useAuth();
  
  // Cliente
  const [empresa, setEmpresa] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  
  // Pedido
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("21 DDL, CONTADOS A PARTIR DA EMISSÃO DA NF DE VENDA.");
  const [deliveryTerms, setDeliveryTerms] = useState("A COMBINAR");
  const [validityTerms, setValidityTerms] = useState("10 DIAS - SUJEITO A CONFIRMAÇÃO DE ESTOQUE NO ATO DA FORMALIZAÇÃO DA COMPRA.");
  
  // UI
  const [saving, setSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAdmin && !isVendedor) {
      navigate("/login");
      return;
    }
    
    loadProducts();
  }, [authLoading, isAdmin, isVendedor, navigate]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, image_url")
      .eq("active", true)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
      return;
    }

    setProducts(data || []);
  };

  const loadVariants = async (productId: string) => {
    if (variants[productId]) return;

    const { data, error } = await supabase
      .from("product_variants")
      .select("id, name, options")
      .eq("product_id", productId);

    if (error) {
      console.error("Error loading variants:", error);
      return;
    }

    const formattedVariants = (data || []).map(v => ({
      id: v.id,
      name: v.name,
      options: Array.isArray(v.options) ? v.options as string[] : []
    }));

    setVariants(prev => ({
      ...prev,
      [productId]: formattedVariants
    }));
  };

  const addItem = () => {
    if (!selectedProductId) {
      toast.error("Selecione um produto");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: 0,
      selectedVariants: {}
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProductId("");
    loadVariants(product.id);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const updateVariant = (index: number, variantName: string, value: string) => {
    const updated = [...orderItems];
    updated[index].selectedVariants[variantName] = value;
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Email do cliente é obrigatório");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    setSaving(true);

    try {
      // Criar ou atualizar perfil do cliente
      const { data: profileId, error: profileError } = await supabase.rpc(
        "upsert_customer_profile",
        {
          p_email: email,
          p_empresa: empresa || null,
          p_contato: contato || null,
          p_telefone: telefone || null,
          p_cpf_cnpj: cpfCnpj || null,
          p_cep: cep || null,
          p_cidade: cidade || null,
          p_estado: estado || null,
          p_endereco: endereco || null,
          p_numero: numero || null,
          p_complemento: complemento || null,
        }
      );

      if (profileError) {
        throw profileError;
      }

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_email: email,
          total: calculateTotal(),
          notes: notes || null,
          payment_terms: paymentTerms,
          delivery_terms: deliveryTerms,
          validity_terms: validityTerms,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens do pedido
      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Pedido criado com sucesso!");
      
      // Redirecionar baseado no tipo de usuário
      if (isAdmin) {
        navigate(`/admin/pedidos/${order.id}/editar`);
      } else {
        navigate(`/vendedor/pedidos`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Erro ao criar pedido");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div>Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isAdmin ? "/admin/pedidos" : "/vendedor/pedidos")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Criar Novo Pedido</h1>
      </div>

      <div className="grid gap-6">
        {/* Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="contato">Contato *</Label>
                <Input
                  id="contato"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Sala..."
                />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <Separator />

            {orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum item adicionado ainda
              </p>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{item.productName}</h4>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          {variants[item.productId]?.map((variant) => (
                            <div key={variant.id}>
                              <Label className="text-sm">{variant.name}</Label>
                              <Select
                                value={item.selectedVariants[variant.name] || ""}
                                onValueChange={(value) =>
                                  updateVariant(index, variant.name, value)
                                }
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

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Quantidade</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Valor Unitário (R$)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(index, "price", parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p className="text-lg font-semibold">
                              R$ {(item.quantity * item.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total do Pedido</p>
                    <p className="text-2xl font-bold">
                      R$ {calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Termos e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Termos e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payment_terms">Condições de Pagamento</Label>
              <Textarea
                id="payment_terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="delivery_terms">Condições de Entrega</Label>
              <Textarea
                id="delivery_terms"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="validity_terms">Validade da Proposta</Label>
              <Textarea
                id="validity_terms"
                value={validityTerms}
                onChange={(e) => setValidityTerms(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Observações adicionais sobre o pedido..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/pedidos")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Salvando..." : "Criar Pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
