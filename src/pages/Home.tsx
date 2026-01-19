import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { ProductSection } from "@/components/ProductSection";
import { BannerCarousel } from "@/components/BannerCarousel";
import { ClientsCarousel } from "@/components/ClientsCarousel";
import { FeatureSection } from "@/components/FeatureSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadProducts();
    loadNewProducts();
    loadPromoProducts();
    loadCategories();
    loadCart();
  }, []);
  const loadProducts = async () => {
    const {
      data
    } = await supabase.from("products").select("*").eq("active", true).limit(12);
    if (data) setProducts(data);
  };
  const loadNewProducts = async () => {
    const {
      data
    } = await supabase.from("products").select("*").eq("active", true).order("created_at", {
      ascending: false
    }).limit(12);
    if (data) setNewProducts(data);
  };
  const loadPromoProducts = async () => {
    // Products no longer have a price column - load by most recent instead
    const {
      data
    } = await supabase.from("products").select("*").eq("active", true).order("created_at", {
      ascending: false
    }).limit(12);
    if (data) setPromoProducts(data);
  };
  const loadCategories = async () => {
    const {
      data
    } = await supabase.from("categories").select("*").limit(12);
    if (data) setCategories(data);
  };
  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };
  const addToCart = (product: any, selectedVariants?: Record<string, string>) => {
    const existingItem = cart.find(item => 
      item.id === product.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants || {})
    );
    
    let newCart;
    if (existingItem) {
      newCart = cart.map(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants || {})
          ? {
            ...item,
            quantity: item.quantity + 1
          } 
          : item
      );
    } else {
      newCart = [...cart, {
        ...product,
        quantity: 1,
        selectedVariants: selectedVariants || {}
      }];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao carrinho.`
    });
  };
  return <div className="min-h-screen bg-background">
      <Header cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />

      <BannerCarousel />

      <ClientsCarousel />

      {/* Categories */}
      {categories.length > 0 && <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">Explore Nossas Categorias</h2>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Encontre o produto perfeito para cada ocasião
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {categories.map(category => (
                  <CarouselItem key={category.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                    <Link to={`/produtos?categoria=${category.id}`} className="group relative overflow-hidden rounded-2xl shadow-card hover:shadow-premium hover-lift transition-all duration-300 block">
                      <div className="aspect-square relative">
                        {category.image_url ? <>
                            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
                          </> : <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-center p-2 md:p-4 text-sm md:text-base">
                              {category.name}
                            </span>
                          </div>}
                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 transform group-hover:translate-y-0 transition-transform">
                          <h3 className="text-sm md:text-base font-bold text-primary-foreground text-center drop-shadow-lg">
                            {category.name}
                          </h3>
                          <div className="mt-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-primary-foreground/90 font-medium">
                              Ver produtos →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex -left-4 md:-left-6" />
              <CarouselNext className="hidden sm:flex -right-4 md:-right-6" />
            </Carousel>
          </div>
        </section>}

      {/* Lançamentos */}
      <ProductSection 
        title="Lançamentos" 
        products={newProducts} 
        onAddToCart={(product, variants) => addToCart(product, variants)} 
        bgColor="bg-secondary/30" 
        badge={{
          text: "NOVO",
          color: "bg-accent text-accent-foreground"
        }} 
      />

      {/* Promoções */}
      <ProductSection 
        title="Promoções" 
        products={promoProducts} 
        onAddToCart={(product, variants) => addToCart(product, variants)} 
        bgColor="bg-background" 
        badge={{
          text: "OFERTA",
          color: "bg-destructive text-destructive-foreground"
        }} 
      />

      {/* Featured Products */}
      <ProductSection 
        title="Produtos em Destaque" 
        products={products} 
        onAddToCart={(product, variants) => addToCart(product, variants)} 
        bgColor="bg-secondary/30"
      />

      {/* Feature Section */}
      <FeatureSection />

      {/* Hero Section - Solicite seu Orçamento */}
      <section className="relative bg-gradient-hero text-primary-foreground py-16 md:py-28 px-4 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-foreground rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '1s'
        }} />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-block px-5 py-2 bg-accent/20 backdrop-blur-sm text-accent-foreground rounded-full text-sm md:text-base font-semibold mb-6 animate-fade-in">
              ✨ Sua parceira em brindes corporativos
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 md:mb-8 drop-shadow-2xl leading-tight animate-fade-in" style={{
            animationDelay: '0.1s'
          }}>
              Solicite seu Orçamento
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl mb-8 md:mb-12 opacity-95 leading-relaxed animate-fade-in" style={{
            animationDelay: '0.2s'
          }}>
              Produtos de qualidade com atendimento personalizado
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{
            animationDelay: '0.3s'
          }}>
              <Link to="/produtos">
                <Button size="lg" className="text-base md:text-xl bg-accent text-accent-foreground hover:shadow-glow hover:scale-105 font-bold px-8 md:px-12 py-6 md:py-7 transition-all">
                  Ver Produtos
                  <ArrowRight className="ml-2 h-5 md:h-6 w-5 md:w-6" />
                </Button>
              </Link>
              <a href="https://wa.me/5511937260395" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="text-base md:text-xl border-2 border-primary-foreground hover:bg-primary-foreground font-bold px-8 md:px-12 py-6 md:py-7 transition-all text-slate-900">
                  Falar com Especialista
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>;
}