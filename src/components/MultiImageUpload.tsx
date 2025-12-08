import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface MultiImageUploadProps {
  bucket: string;
  images: string[];
  onImagesChange: (urls: string[]) => void;
  label?: string;
  maxImages?: number;
}

export const MultiImageUpload = ({
  bucket,
  images,
  onImagesChange,
  label = "Imagens Adicionais",
  maxImages = 10
}: MultiImageUploadProps) => {
  const [uploading, setUploading] = useState(false);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validar quantidade total
    if (images.length + files.length > maxImages) {
      toast.error(`Você pode adicionar no máximo ${maxImages} imagens`);
      e.target.value = ""; // Reset input
      return;
    }

    // Validar arquivos antes de processar
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede o tamanho máximo de 5MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = ""; // Reset input
      return;
    }

    // Processar todas as imagens
    setUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
      // Processar sequencialmente para evitar sobrecarga
      for (const file of validFiles) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = fileName;

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        } catch (error: any) {
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        }
      }

      // Adicionar todas as URLs de uma vez
      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} imagem(ns) adicionada(s) com sucesso!`);
      }
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input para permitir selecionar novamente
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading || images.length >= maxImages}
            className="flex-1"
          />
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {images.length}/{maxImages} imagens. Formatos: JPG, PNG, WebP. Máximo 5MB por imagem.
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <Card key={index}>
              <CardContent className="p-2">
                <div className="aspect-square bg-muted rounded-md overflow-hidden relative">
                  <img
                    src={url}
                    alt={`Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma imagem adicionada</p>
        </div>
      )}
    </div>
  );
};
