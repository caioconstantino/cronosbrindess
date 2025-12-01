import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  active: boolean | null;
  ncm: string | null;
  altura: number | null;
  largura: number | null;
  comprimento: number | null;
};

type Category = {
  id: string;
  name: string;
};

type ProductImage = {
  id?: string;
  image_url: string;
  display_order: number;
};

type ProductVariant = {
  id?: string;
  name: string;
  options: string[];
};

export default function ProdutosNew() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    category_id: "",
    active: true,
    ncm: "",
    altura: "",
    largura: "",
    comprimento: "",
  });
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariant, setNewVariant] = useState({ name: "", options: "" });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      loadProducts();
      loadCategories();
    }
  }, [user, isAdmin, loading]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name");
    setCategories(data || []);
  };

  const loadProductImages = async (productId: string) => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order");
    
    return data?.map(img => img.image_url) || [];
  };

  const loadProductVariants = async (productId: string) => {
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);
    
    return data?.map(v => ({
      id: v.id,
      name: v.name,
      options: Array.isArray(v.options) ? v.options as string[] : []
    })) || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description || null,
      image_url: formData.image_url || null,
      category_id: formData.category_id || null,
      active: formData.active,
      ncm: formData.ncm || null,
      altura: formData.altura ? parseFloat(formData.altura) : null,
      largura: formData.largura ? parseFloat(formData.largura) : null,
      comprimento: formData.comprimento ? parseFloat(formData.comprimento) : null,
    };

    let productId: string;

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Erro ao atualizar produto");
        return;
      }
      productId = editingProduct.id;

      // Deletar imagens antigas
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);

      // Deletar variantes antigas
      await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error || !data) {
        toast.error("Erro ao criar produto");
        return;
      }
      productId = data.id;
    }

    // Inserir imagens adicionais
    if (additionalImages.length > 0) {
      const imagesToInsert = additionalImages.map((url, index) => ({
        product_id: productId,
        image_url: url,
        display_order: index,
      }));

      await supabase.from("product_images").insert(imagesToInsert);
    }

    // Inserir variantes
    if (variants.length > 0) {
      const variantsToInsert = variants.map(v => ({
        product_id: productId,
        name: v.name,
        options: v.options,
      }));

      await supabase.from("product_variants").insert(variantsToInsert);
    }

    toast.success(editingProduct ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!");
    resetForm();
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir produto");
    } else {
      toast.success("Produto excluído com sucesso!");
      loadProducts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
      category_id: "",
      active: true,
      ncm: "",
      altura: "",
      largura: "",
      comprimento: "",
    });
    setAdditionalImages([]);
    setVariants([]);
    setNewVariant({ name: "", options: "" });
    setEditingProduct(null);
    setDialogOpen(false);
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      image_url: product.image_url || "",
      category_id: product.category_id || "",
      active: product.active ?? true,
      ncm: product.ncm || "",
      altura: product.altura?.toString() || "",
      largura: product.largura?.toString() || "",
      comprimento: product.comprimento?.toString() || "",
    });

    const images = await loadProductImages(product.id);
    setAdditionalImages(images);

    const variants = await loadProductVariants(product.id);
    setVariants(variants);

    setDialogOpen(true);
  };

  const addVariant = () => {
    if (!newVariant.name.trim() || !newVariant.options.trim()) return;
    const options = newVariant.options.split(",").map(o => o.trim()).filter(o => o);
    setVariants([...variants, { name: newVariant.name, options }]);
    setNewVariant({ name: "", options: "" });
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-gradient-accent hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="images">Imagens</TabsTrigger>
                  <TabsTrigger value="variants">Variações</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <ImageUpload
                    bucket="product-images"
                    currentImageUrl={formData.image_url}
                    onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                    label="Imagem Principal do Produto"
                  />

                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ncm">NCM</Label>
                    <Input
                      id="ncm"
                      value={formData.ncm}
                      onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                      placeholder="Nomenclatura Comum do Mercosul"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="altura">Altura (cm)</Label>
                      <Input
                        id="altura"
                        type="number"
                        step="0.01"
                        value={formData.altura}
                        onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="largura">Largura (cm)</Label>
                      <Input
                        id="largura"
                        type="number"
                        step="0.01"
                        value={formData.largura}
                        onChange={(e) => setFormData({ ...formData, largura: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="comprimento">Comprimento (cm)</Label>
                      <Input
                        id="comprimento"
                        type="number"
                        step="0.01"
                        value={formData.comprimento}
                        onChange={(e) => setFormData({ ...formData, comprimento: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Produto Ativo</Label>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4">
                  <MultiImageUpload
                    bucket="product-images"
                    images={additionalImages}
                    onImagesChange={setAdditionalImages}
                    label="Imagens Adicionais do Produto"
                    maxImages={10}
                  />
                </TabsContent>

                <TabsContent value="variants" className="space-y-4">
                  <div>
                    <Label>Adicionar Variação</Label>
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Nome (ex: Tamanho, Cor)"
                        value={newVariant.name}
                        onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                      />
                      <Input
                        placeholder="Opções separadas por vírgula (ex: P, M, G)"
                        value={newVariant.options}
                        onChange={(e) => setNewVariant({ ...newVariant, options: e.target.value })}
                      />
                      <Button type="button" onClick={addVariant} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Variação
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {variants.map((variant, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{variant.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {variant.options.join(", ")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeVariant(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {variants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma variação adicionada</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6">
                <Button type="submit" className="flex-1 bg-gradient-accent hover:opacity-90">
                  {editingProduct ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  {product.image_url && (
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <CardTitle>{product.name}</CardTitle>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => openEditDialog(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm">
                <span>Status: {product.active ? "Ativo" : "Inativo"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
