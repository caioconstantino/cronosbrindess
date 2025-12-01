import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductVariant {
  id: string;
  name: string;
  options: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category_id: string;
  ncm: string | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
  categories?: {
    name: string;
  };
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    loadProduct();
    loadImages();
    loadVariants();
    loadCart();
  }, [id]);

  const loadProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .single();
    
    if (data) setProduct(data);
  };

  const loadImages = async () => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("display_order");
    
    if (data) setImages(data);
  };

  const loadVariants = async () => {
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id);
    
    if (data) {
      const typedVariants = data.map(v => ({
        id: v.id,
        name: v.name,
        options: Array.isArray(v.options) ? v.options as string[] : []
      }));
      setVariants(typedVariants);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  };

  const addToCart = () => {
    if (!product) return;

    const allVariantsSelected = variants.every(v => selectedVariants[v.id]);
    
    if (variants.length > 0 && !allVariantsSelected) {
      toast({
        title: "Selecione todas as opções",
        description: "Por favor, selecione todas as variações do produto.",
        variant: "destructive",
      });
      return;
    }

    const cartItem = {
      ...product,
      quantity: 1,
      selectedVariants: selectedVariants,
    };

    const existingItemIndex = cart.findIndex(
      item => item.id === product.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
    );

    let newCart;
    if (existingItemIndex > -1) {
      newCart = cart.map((item, index) =>
        index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCart = [...cart, cartItem];
    }

    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao orçamento.`,
    });
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Carregando...</p>
        </div>
      </div>
    );
  }

  const allImages = images.length > 0 
    ? images 
    : product.image_url 
    ? [{ id: "main", image_url: product.image_url, display_order: 0 }] 
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-muted shadow-elegant">
              {allImages.length > 0 ? (
                <img
                  src={allImages[selectedImage]?.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-all ${
                      selectedImage === index
                        ? "border-accent shadow-glow"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            {product.categories && (
              <Badge variant="secondary" className="mb-2">
                {product.categories.name}
              </Badge>
            )}
            
            <h1 className="text-4xl font-bold text-foreground">{product.name}</h1>
            
            {product.description && (
              <p className="text-lg text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Especificações Técnicas */}
            {(product.ncm || product.altura || product.largura || product.comprimento) && (
              <div className="border border-border rounded-lg p-4 space-y-2 bg-muted/50">
                <h3 className="text-sm font-semibold text-foreground mb-3">Especificações Técnicas</h3>
                {product.ncm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NCM:</span>
                    <span className="font-medium">{product.ncm}</span>
                  </div>
                )}
                {(product.altura || product.largura || product.comprimento) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dimensões (A x L x C):</span>
                    <span className="font-medium">
                      {product.altura || '—'} x {product.largura || '—'} x {product.comprimento || '—'} cm
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Variantes */}
            {variants.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Opções:</h3>
                {variants.map((variant) => (
                  <div key={variant.id} className="space-y-2">
                    <label className="text-sm font-medium">{variant.name}</label>
                    <Select
                      value={selectedVariants[variant.id] || ""}
                      onValueChange={(value) =>
                        setSelectedVariants({ ...selectedVariants, [variant.id]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione ${variant.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {variant.options.map((option) => (
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

            <Button
              onClick={addToCart}
              size="lg"
              className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Adicionar ao Orçamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
