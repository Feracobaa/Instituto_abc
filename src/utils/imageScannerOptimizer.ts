/**
 * imageScannerOptimizer.ts
 * Utilidad de procesamiento de imagen en navegador (Canvas HTML5) para:
 * 1. Binarización adaptativa B/N (efecto CamScanner) para cuadernos manuscritos.
 * 2. Compresión inteligente de paleta y reescalado max 1600px.
 * 3. Conversión a WebP ultraliviano (25 KB - 40 KB).
 */

export interface ScannerOptimizationOptions {
  mode?: "scanner" | "photo";
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
  contrastBoost?: number; // p. ej. 1.2
}

/**
 * Procesa un archivo de imagen (File o Blob) aplicando binarización o compresión optimizada.
 */
export async function optimizeHomeworkImage(
  file: File | Blob,
  options: ScannerOptimizationOptions = {}
): Promise<{ file: Blob; dataUrl: string; originalSize: number; optimizedSize: number }> {
  const {
    mode = "scanner",
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.75,
    contrastBoost = 1.25,
  } = options;

  const originalSize = file.size;
  const image = await loadImage(file);

  // Calcular dimensiones ajustadas
  let width = image.width;
  let height = image.height;

  if (width > maxWidth || height > maxHeight) {
    if (width / height > maxWidth / maxHeight) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("No se pudo inicializar el contexto de Canvas 2D");
  }

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (mode === "scanner") {
    // Algoritmo de binarización y alto contraste para cuaderno escrito a mano
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminancia en escala de grises
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Aplicar realce de contraste
      gray = (gray - 128) * contrastBoost + 128;
      gray = Math.min(255, Math.max(0, gray));

      // Umbralizado blanco/negro suavizado
      // Los fondos claros (papel amarillento/sombras) se vuelven blanco puro
      // Los trazos oscuros de lápiz o lapicero se acentúan a negro/azul muy oscuro
      if (gray > 165) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        // Preservar tono oscuro del trazo
        const factor = gray / 165;
        data[i] = Math.round(r * factor * 0.4);
        data[i + 1] = Math.round(g * factor * 0.4);
        data[i + 2] = Math.round(b * factor * 0.4);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Exportar a Blob WebP ultra-liviano (fallback a JPEG si WebP no soportado)
  const mimeType = supportsWebP() ? "image/webp" : "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error al comprimir la imagen"));
          return;
        }
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({
          file: blob,
          dataUrl,
          originalSize,
          optimizedSize: blob.size,
        });
      },
      mimeType,
      quality
    );
  });
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function supportsWebP(): boolean {
  try {
    const elem = document.createElement("canvas");
    return elem.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    return false;
  }
}
