import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ImageZoom";
import { ProductCard } from "@/components/ProductCard";

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
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
  max_colors?: number | null;
  categories?: {
    name: string;
  };
}

interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [availableColors, setAvailableColors] = useState<ColorOption[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    loadProduct();
    loadImages();
    loadColors();
    loadCart();
    setSelectedColors([]);
    setSelectedImage(0); // Reset para a primeira imagem
    // Scroll para o topo quando o produto mudar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (product) {
      loadRecommendedProducts();
    }
  }, [product]);

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

  const loadColors = async () => {
    const { data } = await supabase
      .from("product_colors")
      .select("colors(id, name, hex, active, display_order)")
      .eq("product_id", id);

    const list = (data || [])
      .map((row: any) => row.colors)
      .filter((c: any) => c && c.active)
      .sort((a: any, b: any) =>
        a.display_order === b.display_order
          ? a.name.localeCompare(b.name)
          : a.display_order - b.display_order
      )
      .map((c: any) => ({ id: c.id, name: c.name, hex: c.hex }));

    setAvailableColors(list);
  };

  const toggleColor = (colorName: string) => {
    const max = product?.max_colors ?? 0;
    setSelectedColors((prev) => {
      if (prev.includes(colorName)) return prev.filter((c) => c !== colorName);
      if (prev.length >= max) {
        toast({
          title: "Limite de cores",
          description: `Este produto permite no máximo ${max} cor(es).`,
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, colorName];
    });
  };

  const loadRecommendedProducts = async () => {
    if (!product) return;

    // First try to get products from the same category
    let query = supabase
      .from("products")
      .select("*, categories(name)")
      .eq("active", true)
      .neq("id", product.id)
      .limit(8);

    if (product.category_id) {
      query = query.eq("category_id", product.category_id);
    }

    const { data: categoryProducts } = await query;

    // If we have enough products from the same category, use those
    if (categoryProducts && categoryProducts.length >= 4) {
      setRecommendedProducts(categoryProducts);
      return;
    }

    // Otherwise, get random products to fill the gap
    const { data: randomProducts } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("active", true)
      .neq("id", product.id)
      .limit(8);

    setRecommendedProducts(randomProducts || []);
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  };

  const addToCart = (productToAdd?: Product) => {
    const targetProduct = productToAdd || product;
    if (!targetProduct) return;

    const isMainProduct = !productToAdd;
    const maxColors = targetProduct.max_colors ?? 0;
    let variants: Record<string, string> = {};

    if (isMainProduct && maxColors > 0) {
      if (selectedColors.length === 0) {
        toast({
          title: "Escolha as cores",
          description: `Selecione de 1 até ${maxColors} cor(es) para a personalização.`,
          variant: "destructive",
        });
        return;
      }
      variants = { Cores: selectedColors.join(", ") };
    }

    const cartItem = {
      ...targetProduct,
      quantity: 1,
      selectedVariants: variants,
    };

    const existingItemIndex = cart.findIndex(
      item => item.id === targetProduct.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(variants)
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
      description: `${targetProduct.name} foi adicionado ao orçamento.`,
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
            <div className="w-full rounded-lg bg-muted shadow-elegant flex items-center justify-center">
              {allImages.length > 0 ? (
                <ImageZoom
                  src={allImages[selectedImage]?.image_url}
                  alt={product.name}
                  className="w-full"
                  zoomLevel={2.5}
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-muted-foreground">
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

            {/* Cores da personalização */}
            {(product.max_colors ?? 0) > 0 && availableColors.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-muted/50">
                <h3 className="text-sm font-semibold mb-1">
                  Cores da personalização
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Escolha até {product.max_colors} cor(es) • {selectedColors.length} selecionada(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => {
                    const selected = selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => toggleColor(color.name)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          selected
                            ? "border-accent bg-accent/20 font-medium"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={() => addToCart()}
              size="lg"
              className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Adicionar ao Orçamento
            </Button>
          </div>
        </div>

        {/* Produtos Recomendados */}
        {recommendedProducts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Produtos Recomendados
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {recommendedProducts.slice(0, 8).map((recProduct) => (
                <ProductCard
                  key={recProduct.id}
                  id={recProduct.id}
                  name={recProduct.name}
                  description={recProduct.description}
                  imageUrl={recProduct.image_url}
                  maxColors={recProduct.max_colors}
                  onAddToCart={() => addToCart(recProduct)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
