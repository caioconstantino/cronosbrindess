import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Sync selected category from URL
  const categoryParam = searchParams.get("categoria");
  const selectedCategory = categoryParam || "all";

  const handleCategoryChange = (value: string) => {
    if (value === "all") {
      searchParams.delete("categoria");
    } else {
      searchParams.set("categoria", value);
    }
    setSearchParams(searchParams);
  };

  useEffect(() => {
    loadCategories();
    loadCart();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchTerm]);

  const loadCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    console.log("Categories loaded:", data, error);
    if (data) setCategories(data);
  };

  const loadProducts = async () => {
    let productIds: string[] | null = null;
    
    // If filtering by category, get product IDs from product_categories
    if (selectedCategory && selectedCategory !== "all") {
      const { data: productCategories } = await supabase
        .from("product_categories")
        .select("product_id")
        .eq("category_id", selectedCategory);
      
      if (productCategories && productCategories.length > 0) {
        productIds = productCategories.map(pc => pc.product_id);
      } else {
        // No products in this category
        setProducts([]);
        return;
      }
    }

    let query = supabase.from("products").select("*").eq("active", true);

    if (productIds) {
      query = query.in("id", productIds);
    }

    if (searchTerm) {
      query = query.ilike("name", `%${searchTerm}%`);
    }

    const { data } = await query;
    if (data) setProducts(data);
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  };

  const addToCart = (product: any, selectedVariants?: Record<string, string>) => {
    const existingItem = cart.find((item) => 
      item.id === product.id && 
      JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants || {})
    );
    let newCart;

    if (existingItem) {
      newCart = cart.map((item) =>
        item.id === product.id && 
        JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants || {})
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1, selectedVariants: selectedVariants || {} }];
    }

    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    toast({
      title: "Produto adicionado",
      description: `${product.name} foi adicionado ao carrinho.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Produtos</h1>

        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:max-w-sm"
          />

          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="md:max-w-xs">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              description={product.description}
              imageUrl={product.image_url}
              onAddToCart={(variants) => addToCart(product, variants)}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
