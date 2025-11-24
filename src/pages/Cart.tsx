import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Cart() {
  const [cart, setCart] = useState<any[]>([]);
  const [variantsData, setVariantsData] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      setCart(parsedCart);
      
      // Carregar informações das variantes
      const variantIds = new Set<string>();
      parsedCart.forEach((item: any) => {
        if (item.selectedVariants) {
          Object.keys(item.selectedVariants).forEach(id => variantIds.add(id));
        }
      });

      if (variantIds.size > 0) {
        const { data } = await supabase
          .from("product_variants")
          .select("id, name")
          .in("id", Array.from(variantIds));
        
        if (data) {
          const variantsMap: Record<string, any> = {};
          data.forEach(variant => {
            variantsMap[variant.id] = variant;
          });
          setVariantsData(variantsMap);
        }
      }
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    const newCart = cart
      .map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item
      )
      .filter((item) => item.quantity > 0);

    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const setQuantity = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newCart = cart
      .map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(1, numValue) }
          : item
      );

    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const removeItem = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />

      <div className="container mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">Carrinho de Orçamento</h1>

        {cart.length === 0 ? (
          <Card className="p-6 md:p-8 text-center">
            <p className="text-lg md:text-xl text-muted-foreground mb-4">
              Seu carrinho está vazio
            </p>
            <Button onClick={() => navigate("/produtos")}>
              Ir para Produtos
            </Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              {cart.map((item) => (
                <Card key={item.id} className="p-3 md:p-4">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Sem imagem
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg line-clamp-2">{item.name}</h3>
                      
                      {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(item.selectedVariants).map(([variantId, value]) => {
                            const variantName = variantsData[variantId]?.name || "Opção";
                            return (
                              <Badge key={variantId} variant="secondary" className="text-xs">
                                {variantName}: {value as string}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      
                      {item.price && (
                        <p className="text-primary font-bold mt-1 text-sm md:text-base">
                          R$ {item.price.toFixed(2)}
                        </p>
                      )}

                      <div className="flex items-center gap-2 md:gap-4 mt-3 md:mt-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-8 w-8 md:h-10 md:w-10"
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => setQuantity(item.id, e.target.value)}
                            className="w-16 md:w-20 text-center h-8 md:h-10"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-8 w-8 md:h-10 md:w-10"
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-destructive hover:text-destructive h-8 w-8 md:h-10 md:w-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div>
              <Card className="p-4 md:p-6 lg:sticky lg:top-4">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Resumo</h2>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm md:text-base">
                    <span>Itens:</span>
                    <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg md:text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-primary">R$ {getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handleCheckout} className="w-full" size="lg">
                  Solicitar Orçamento
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
