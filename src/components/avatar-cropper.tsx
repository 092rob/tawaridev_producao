import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

interface AvatarCropperProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const size = Math.min(area.width, area.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/jpeg", 0.9),
  );
}

export function AvatarCropper({ open, imageSrc, onCancel, onConfirm }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!imageSrc || !area) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area);
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
        </DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Zoom</label>
          <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !area}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
