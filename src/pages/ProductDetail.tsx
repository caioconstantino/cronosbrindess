import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ImageZoom";

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
  const [selectedImage, setSelectedImage] = useState(0);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    loadProduct();
    loadImages();
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

  // Variants are not loaded on product detail page; admin will select variants in order edit.

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  };

  const addToCart = () => {
    if (!product) return;

    // No variant selection required on the product detail page; admin will choose variants later.

    const cartItem = {
      ...product,
      quantity: 1,
      selectedVariants: {},
    };

    const existingItemIndex = cart.findIndex(
      item => item.id === product.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify({})
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

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="w-full max-h-[400px] md:max-h-[500px] overflow-hidden rounded-lg bg-muted shadow-elegant flex items-center justify-center">
              {allImages.length > 0 ? (
                <ImageZoom
                  src={allImages[selectedImage]?.image_url}
                  alt={product.name}
                  className="w-full h-full"
                  zoomLevel={2.5}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
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
            {(product.altura || product.largura || product.comprimento) && (
              <div className="border border-border rounded-lg p-4 space-y-2 bg-muted/50">
                <h3 className="text-sm font-semibold text-foreground mb-3">Especificações Técnicas</h3>
                {/* NCM removed from product view: only dimensions are shown */}
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

            {/* Variant selection removed from product detail; admin will choose variants on order edit. */}

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
