CREATE TABLE public.colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hex text NOT NULL DEFAULT '#000000',
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.colors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colors TO authenticated;
GRANT ALL ON public.colors TO service_role;

ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Colors are viewable by everyone" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Admins can insert colors" ON public.colors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update colors" ON public.colors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete colors" ON public.colors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_colors_updated_at BEFORE UPDATE ON public.colors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_colors integer NOT NULL DEFAULT 0;

CREATE TABLE public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color_id)
);

GRANT SELECT ON public.product_colors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_colors TO authenticated;
GRANT ALL ON public.product_colors TO service_role;

ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product colors are viewable by everyone" ON public.product_colors FOR SELECT USING (true);
CREATE POLICY "Admins can insert product colors" ON public.product_colors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product colors" ON public.product_colors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product colors" ON public.product_colors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));