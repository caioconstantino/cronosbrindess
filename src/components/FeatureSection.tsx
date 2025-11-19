import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Users, Truck } from "lucide-react";
import featureImage from "@/assets/corporate-gifts-feature.jpg";

export const FeatureSection = () => {
  return (
    <section className="py-16 md:py-28 px-4 bg-gradient-to-br from-muted/30 via-background to-muted/20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Image */}
          <div className="order-2 md:order-1">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-accent rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <img 
                src={featureImage} 
                alt="Brindes Corporativos de Qualidade" 
                className="relative rounded-2xl shadow-premium w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="order-1 md:order-2 space-y-8">
            <div>
              <div className="inline-block px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-semibold mb-4">
                Por que nos escolher?
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
                Soluções em Brindes Corporativos
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Oferecemos uma ampla variedade de produtos promocionais personalizados para fortalecer a identidade da sua marca e surpreender seus clientes.
              </p>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">Qualidade Garantida</h3>
                  <p className="text-muted-foreground">Produtos selecionados com os mais altos padrões de qualidade</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">Atendimento Personalizado</h3>
                  <p className="text-muted-foreground">Equipe dedicada para atender suas necessidades específicas</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 group">
                <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                  <Truck className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">Entrega Rápida</h3>
                  <p className="text-muted-foreground">Logística eficiente para atender seus prazos</p>
                </div>
              </div>
            </div>
            
            <Link to="/produtos">
              <Button size="lg" className="mt-6 bg-gradient-accent hover:shadow-glow text-base md:text-lg px-8 py-6 font-semibold">
                Conheça Nossos Produtos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
