import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  email: z.string().email("Email inválido"),
  empresa: z.string().optional(),
  contato: z.string().optional(),
  telefone: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  cep: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
});

export default function Checkout() {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    contato: "",
    email: "",
    telefone: "",
    cpf_cnpj: "",
    cep: "",
    cidade: "",
    estado: "",
    endereco: "",
    numero: "",
    complemento: "",
    notes: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        navigate("/carrinho");
      }
      setCart(parsedCart);
    } else {
      navigate("/carrinho");
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const profileData = {
        empresa: formData.empresa,
        contato: formData.contato,
        email: formData.email,
        telefone: formData.telefone,
        cpf_cnpj: formData.cpf_cnpj,
        cep: formData.cep,
        cidade: formData.cidade,
        estado: formData.estado,
        endereco: formData.endereco,
        numero: formData.numero,
        complemento: formData.complemento,
      };

      profileSchema.parse(profileData);
      setLoading(true);

      // Save or update customer profile using secure function
      const { error: profileError } = await supabase.rpc('upsert_customer_profile', {
        p_email: formData.email,
        p_empresa: formData.empresa || null,
        p_contato: formData.contato || null,
        p_telefone: formData.telefone || null,
        p_cpf_cnpj: formData.cpf_cnpj || null,
        p_cep: formData.cep || null,
        p_cidade: formData.cidade || null,
        p_estado: formData.estado || null,
        p_endereco: formData.endereco || null,
        p_numero: formData.numero || null,
        p_complemento: formData.complemento || null,
      });

      if (profileError) {
        console.error('Error saving customer profile:', profileError);
        // Continue with order creation even if profile save fails
      }
      
      // Calculate total
      const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

      // Create order with customer email
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_email: formData.email,
          total,
          notes: formData.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price || 0,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Send email to admin
      try {
        const { data: emailSettings } = await supabase
          .from("email_settings")
          .select("admin_email")
          .limit(1)
          .maybeSingle();

        if (emailSettings?.admin_email) {
          const itemsList = cart
            .map((item) => `<li>${item.name} - Qtd: ${item.quantity} - R$ ${((item.price || 0) * item.quantity).toFixed(2)}</li>`)
            .join("");

          await supabase.functions.invoke("send-email", {
            body: {
              to: emailSettings.admin_email,
              subject: `Novo Orçamento Recebido - #${orderData.order_number}`,
              html: `
                <h2>Novo Pedido de Orçamento</h2>
                <p><strong>Número do Orçamento:</strong> ${orderData.order_number}</p>
                <p><strong>Cliente:</strong> ${formData.empresa || formData.contato}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Telefone:</strong> ${formData.telefone}</p>
                <h3>Itens do Pedido:</h3>
                <ul>${itemsList}</ul>
                <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
                ${formData.notes ? `<p><strong>Observações:</strong> ${formData.notes}</p>` : ''}
              `,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending admin email:", emailError);
        // Don't block the checkout if email fails
      }

      // Clear cart
      localStorage.removeItem("cart");

      toast({
        title: "Orçamento solicitado!",
        description: `Número do orçamento: ${orderData.order_number}. Entraremos em contato em breve.`,
      });

      navigate("/");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: err.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar orçamento",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={cart.length} />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Finalizar Orçamento</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Seus Dados</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="empresa">Nome da Empresa</Label>
                    <Input
                      id="empresa"
                      name="empresa"
                      value={formData.empresa}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contato">Nome do Contato</Label>
                    <Input
                      id="contato"
                      name="contato"
                      value={formData.contato}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contato@empresa.com.br"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
                    <Input
                      id="cpf_cnpj"
                      name="cpf_cnpj"
                      value={formData.cpf_cnpj}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      name="cep"
                      value={formData.cep}
                      onChange={handleChange}
                      placeholder="00000-000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      name="numero"
                      value={formData.numero}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      name="complemento"
                      value={formData.complemento}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Informações adicionais sobre o pedido..."
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Card className="p-6 sticky top-4">
                <h2 className="text-2xl font-bold mb-4">Resumo do Pedido</h2>

                <div className="space-y-2 mb-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>R$ {((item.price || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-primary">R$ {getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Enviando..." : "Solicitar Orçamento"}
                </Button>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
