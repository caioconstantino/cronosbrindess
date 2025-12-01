import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VariantSelectionDialog } from "./VariantSelectionDialog";
import { supabase } from "@/integrations/supabase/client";

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  onAddToCart: (selectedVariants?: Record<string, string>) => void;
}

export const ProductCard = ({
  id,
  name,
  description,
  imageUrl,
  onAddToCart,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);

  useEffect(() => {
    checkVariants();
  }, [id]);

  const checkVariants = async () => {
    const { data } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", id)
      .limit(1);
    
    setHasVariants(data && data.length > 0);
  };

  const handleAddToCart = () => {
    if (hasVariants) {
      setVariantDialogOpen(true);
    } else {
      onAddToCart();
    }
  };

  const handleVariantsConfirm = (selectedVariants: Record<string, string>) => {
    onAddToCart(selectedVariants);
  };

  return (
    <>
      <VariantSelectionDialog
        open={variantDialogOpen}
        onOpenChange={setVariantDialogOpen}
        productId={id}
        productName={name}
        productImage={imageUrl}
        onConfirm={handleVariantsConfirm}
      />
      
      <Card className="overflow-hidden hover-lift group border-0 shadow-card bg-gradient-card">
      <div 
        className="aspect-square overflow-hidden bg-muted cursor-pointer relative"
        onClick={() => navigate(`/produtos/${id}`)}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <Eye className="text-primary h-6 w-6" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
            Sem imagem
          </div>
        )}
      </div>
      <CardContent className="p-4 md:p-5">
        <h3 
          className="font-bold text-base md:text-lg mb-2 cursor-pointer hover:text-primary transition-colors line-clamp-2 leading-tight"
          onClick={() => navigate(`/produtos/${id}`)}
        >
          {name}
        </h3>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 md:p-5 pt-0 flex gap-2">
        <Button 
          onClick={() => navigate(`/produtos/${id}`)} 
          variant="outline" 
          size="sm"
          className="flex-1 text-xs md:text-sm border-2 hover:border-primary hover:text-primary transition-all"
        >
          <Eye className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4" />
          <span className="hidden sm:inline">Detalhes</span>
          <span className="sm:hidden">Ver</span>
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }} 
          size="sm"
          className="flex-1 bg-gradient-accent hover:shadow-glow text-xs md:text-sm font-semibold"
        >
          <ShoppingCart className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4" />
          <span className="hidden sm:inline">Orçamento</span>
          <span className="sm:hidden">Pedir</span>
        </Button>
      </CardFooter>
    </Card>
    </>
  );
};
