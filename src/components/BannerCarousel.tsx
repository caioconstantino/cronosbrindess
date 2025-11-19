import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import * as React from "react";
import Autoplay from "embla-carousel-autoplay";

type Banner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
};

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true });

    setBanners(data || []);
  };

  if (banners.length === 0) return null;

  return (
    <section className="w-full mb-12">
      <Carousel
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <Card className="border-0 rounded-none overflow-hidden">
                {banner.link_url ? (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                    <div className="relative h-[400px] w-full">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="p-8 text-white">
                          <h2 className="text-4xl font-bold mb-2">{banner.title}</h2>
                          {banner.description && (
                            <p className="text-xl">{banner.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ) : (
                  <div className="relative h-[400px] w-full">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                      <div className="p-8 text-white">
                        <h2 className="text-4xl font-bold mb-2">{banner.title}</h2>
                        {banner.description && (
                          <p className="text-xl">{banner.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </section>
  );
}
