import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight } from "lucide-react";

interface ProductSectionProps {
  title: string;
  products: any[];
  onAddToCart: (product: any) => void;
  bgColor?: string;
  badge?: {
    text: string;
    color: string;
  };
}

export const ProductSection = ({ 
  title, 
  products, 
  onAddToCart, 
  bgColor = "bg-background",
  badge 
}: ProductSectionProps) => {
  if (products.length === 0) return null;

  return (
    <section className={`py-12 md:py-20 px-4 ${bgColor} section-pattern relative`}>
      <div className="container mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="h-8 md:h-12 w-1 bg-gradient-accent rounded-full" />
            <div>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight">{title}</h2>
              {badge && (
                <span className={`inline-block mt-1 md:mt-2 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-semibold rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              )}
            </div>
          </div>
          <Link to="/produtos">
            <Button variant="outline" className="border-2 hover:border-accent hover:text-accent hover:shadow-lg font-semibold gap-1 md:gap-2 text-xs md:text-base px-3 md:px-4 transition-all">
              <span className="hidden sm:inline">Ver Todos</span>
              <span className="sm:hidden">Ver</span>
              <ArrowRight className="h-3 md:h-4 w-3 md:w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              description={product.description}
              price={product.price}
              imageUrl={product.image_url}
              onAddToCart={() => onAddToCart(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};