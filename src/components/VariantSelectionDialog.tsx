import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart } from "lucide-react";

interface ProductVariant {
  id: string;
  name: string;
  options: string[];
}

interface VariantSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage?: string;
  onConfirm: (selectedVariants: Record<string, string>) => void;
}

export const VariantSelectionDialog = ({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  onConfirm,
}: VariantSelectionDialogProps) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadVariants();
    }
  }, [open, productId]);

  const loadVariants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);

    if (data) {
      const typedVariants = data.map(v => ({
        id: v.id,
        name: v.name,
        options: Array.isArray(v.options) ? v.options as string[] : []
      }));
      setVariants(typedVariants);
      
      // Reset selected variants
      setSelectedVariants({});
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    const allVariantsSelected = variants.every(v => selectedVariants[v.id]);
    
    if (!allVariantsSelected) {
      return;
    }

    onConfirm(selectedVariants);
    onOpenChange(false);
  };

  const allVariantsSelected = variants.every(v => selectedVariants[v.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl">Selecione as Opções</DialogTitle>
          <DialogDescription>
            Escolha as variações do produto antes de adicionar ao orçamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {productImage && (
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-base">{productName}</h3>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando opções...
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Este produto não possui variações
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant) => (
                <div key={variant.id} className="space-y-2">
                  <Label htmlFor={`variant-${variant.id}`} className="text-sm font-medium">
                    {variant.name}
                  </Label>
                  <Select
                    value={selectedVariants[variant.id] || ""}
                    onValueChange={(value) =>
                      setSelectedVariants({ ...selectedVariants, [variant.id]: value })
                    }
                  >
                    <SelectTrigger id={`variant-${variant.id}`} className="bg-background">
                      <SelectValue placeholder={`Selecione ${variant.name}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allVariantsSelected || loading || variants.length === 0}
            className="bg-gradient-accent hover:shadow-glow"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Adicionar ao Orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};