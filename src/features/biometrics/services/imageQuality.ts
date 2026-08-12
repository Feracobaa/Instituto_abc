import { ImageQualityMetrics, FaceBoundingBox } from '../types';

/**
 * Aplica Ecualización Adaptativa de Histograma (CLAHE) en espacio de color YUV
 * para inmunizar la imagen frente a sombras oscuras, luz amarilla o contraluz de aulas.
 */
export function applyYuvClaheEqualization(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;
    if (totalPixels === 0) return;

    const histogram = new Array(256).fill(0);
    const yValues = new Uint8Array(totalPixels);

    // 1. Convertir RGB a YUV y acumular histograma del canal de Luminancia Y
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Y = 0.299R + 0.587G + 0.114B
      const y = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      yValues[i] = y;
      histogram[y]++;
    }

    // 2. Ecualización acumulativa CDF con límite de clip (CLAHE clipLimit = 2.5)
    const clipLimit = Math.floor((totalPixels / 256) * 2.5);
    let excess = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > clipLimit) {
        excess += histogram[i] - clipLimit;
        histogram[i] = clipLimit;
      }
    }

    const bonus = Math.floor(excess / 256);
    for (let i = 0; i < 256; i++) {
      histogram[i] += bonus;
    }

    // Función de distribución acumulativa (CDF)
    const cdf = new Array(256).fill(0);
    let cum = 0;
    for (let i = 0; i < 256; i++) {
      cum += histogram[i];
      cdf[i] = Math.round((cum / totalPixels) * 255);
    }

    // 3. Re-mapear canal Y ecualizado conservando información cromática U y V
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const oldY = yValues[i] || 1;
      const newY = cdf[oldY];
      const scale = newY / oldY;

      data[idx] = Math.max(0, Math.min(255, Math.round(r * scale)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * scale)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * scale)));
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.warn('Error en pre-procesamiento CLAHE YUV:', e);
  }
}

/**
 * Mide la varianza del operador Laplaciano para detectar borrosidad por movimiento rápido del estudiante
 */
export function calculateLaplacianBlurScore(
  imgData: Uint8ClampedArray,
  width: number,
  height: number
): { isBlurred: boolean; blurScore: number } {
  let sumSquareLaplacian = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;

      // Filtro Laplaciano 3x3 kernel [0, 1, 0; 1, -4, 1; 0, 1, 0]
      const centerLum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      const topLum = 0.299 * imgData[idx - width * 4] + 0.587 * imgData[idx - width * 4 + 1] + 0.114 * imgData[idx - width * 4 + 2];
      const bottomLum = 0.299 * imgData[idx + width * 4] + 0.587 * imgData[idx + width * 4 + 1] + 0.114 * imgData[idx + width * 4 + 2];
      const leftLum = 0.299 * imgData[idx - 4] + 0.587 * imgData[idx - 3] + 0.114 * imgData[idx - 2];
      const rightLum = 0.299 * imgData[idx + 4] + 0.587 * imgData[idx + 5] + 0.114 * imgData[idx + 6];

      const laplacian = topLum + bottomLum + leftLum + rightLum - 4 * centerLum;
      sumSquareLaplacian += laplacian * laplacian;
      count++;
    }
  }

  const blurScore = count > 0 ? Math.round(sumSquareLaplacian / count) : 100;
  const isBlurred = blurScore < 40; // Menor a 40 indica borrosidad por movimiento

  return { isBlurred, blurScore };
}

/**
 * Analiza la luminancia, calidad de iluminación y métricas de Liveness (Anti-Spoofing)
 */
export function analyzeImageQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ImageQualityMetrics {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let totalLuminance = 0;
    const step = 4;
    let count = 0;
    let highFreqVariance = 0;

    for (let i = 0; i < data.length - 4 * step; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const nextR = data[i + 4 * step];
      const nextG = data[i + 4 * step + 1];
      const nextB = data[i + 4 * step + 2];
      const nextLum = 0.299 * nextR + 0.587 * nextG + 0.114 * nextB;

      // Derivada de alta frecuencia para detectar patrones de trama de pantalla (Moiré)
      const deltaLum = Math.abs(lum - nextLum);
      if (deltaLum > 35) highFreqVariance++;

      totalLuminance += lum;
      count++;
    }

    const avgLuminance = count > 0 ? totalLuminance / count : 128;
    const moireRatio = count > 0 ? highFreqVariance / count : 0;

    // Medir nitidez con filtro Laplaciano
    const blurCheck = calculateLaplacianBlurScore(data, width, height);

    // Detección heurística de fotos en pantallas de celular (patrón Moiré hiper-frecuente > 18%)
    const isSpoof = moireRatio > 0.18;
    const livenessScore = Math.max(0, Math.min(100, Math.round((1 - moireRatio * 3) * 100)));

    return {
      luminance: Math.round(avgLuminance),
      isLowLight: avgLuminance < 45,
      isOverExposed: avgLuminance > 225,
      livenessScore,
      isSpoof,
      isBlurred: blurCheck.isBlurred,
      blurScore: blurCheck.blurScore,
    };
  } catch (e) {
    return {
      luminance: 128,
      isLowLight: false,
      isOverExposed: false,
      livenessScore: 85,
      isSpoof: false,
      isBlurred: false,
      blurScore: 100,
    };
  }
}

/**
 * Verifica si los píxeles corresponden a la morfología y pigmentación de un rostro humano real.
 * Descarta luces encandilantes, focos, paredes, suelos u objetos inanimados.
 */
export function verifyHumanFacePresence(
  imgData: Uint8ClampedArray,
  width: number,
  height: number
): { isFace: boolean; skinRatio: number; contrastVariance: number } {
  let skinPixels = 0;
  let totalSampled = 0;
  let sumLum = 0;
  const luminanceValues: number[] = [];

  let upperLumSum = 0, upperCount = 0;
  let middleLumSum = 0, middleCount = 0;
  let lowerLumSum = 0, lowerCount = 0;

  const step = 4;

  const minX = Math.floor(width * 0.2);
  const maxX = Math.floor(width * 0.8);
  const minY = Math.floor(height * 0.15);
  const maxY = Math.floor(height * 0.85);
  const heightRange = maxY - minY;

  const band1End = minY + heightRange * 0.33;
  const band2End = minY + heightRange * 0.66;

  for (let y = minY; y < maxY; y += step) {
    for (let x = minX; x < maxX; x += step) {
      const idx = (y * width + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLum += lum;
      luminanceValues.push(lum);
      totalSampled++;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isSkinTone =
        r > 20 && g > 12 && b > 8 &&
        (maxC - minC) > 4 &&
        r > (b * 0.7);

      if (isSkinTone) {
        skinPixels++;
      }

      if (y < band1End) {
        upperLumSum += lum;
        upperCount++;
      } else if (y < band2End) {
        middleLumSum += lum;
        middleCount++;
      } else {
        lowerLumSum += lum;
        lowerCount++;
      }
    }
  }

  let outerSkinPixels = 0;
  let outerTotalSampled = 0;
  for (let y = 0; y < height; y += step * 2) {
    for (let x = 0; x < width; x += step * 2) {
      if (x < minX || x > maxX || y < minY || y > maxY) {
        const idx = (y * width + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const isSkinTone =
          r > 20 && g > 12 && b > 8 &&
          (maxC - minC) > 4 &&
          r > (b * 0.7);

        if (isSkinTone) outerSkinPixels++;
        outerTotalSampled++;
      }
    }
  }

  const skinRatio = totalSampled > 0 ? skinPixels / totalSampled : 0;
  const outerSkinRatio = outerTotalSampled > 0 ? outerSkinPixels / outerTotalSampled : 0;
  const meanLum = totalSampled > 0 ? sumLum / totalSampled : 0;

  let varianceSum = 0;
  for (let i = 0; i < luminanceValues.length; i++) {
    const diff = luminanceValues[i] - meanLum;
    varianceSum += diff * diff;
  }
  const contrastVariance = totalSampled > 0 ? Math.sqrt(varianceSum / totalSampled) : 0;

  const upperLum = upperCount > 0 ? upperLumSum / upperCount : meanLum;
  const middleLum = middleCount > 0 ? middleLumSum / middleCount : meanLum;
  const lowerLum = lowerCount > 0 ? lowerLumSum / lowerCount : meanLum;

  const isNotObstructed = skinRatio <= 0.96;
  const isNotFullHandOrFinger = !(skinRatio > 0.85 && outerSkinRatio > 0.82);
  const hasTopographicStructure =
    Math.max(Math.abs(middleLum - upperLum), Math.abs(middleLum - lowerLum)) >= 2.0 ||
    contrastVariance >= 8;

  const isFace =
    skinRatio >= 0.12 &&
    isNotObstructed &&
    isNotFullHandOrFinger &&
    hasTopographicStructure &&
    contrastVariance >= 6 &&
    meanLum < 245 &&
    meanLum > 15;

  return {
    isFace,
    skinRatio,
    contrastVariance,
  };
}

/**
 * Realiza una alineación afín digital para compensar la inclinación de cabeza antes de extraer vectores
 */
export function alignFaceFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  imgData: Uint8ClampedArray
): number {
  let leftEyeLumSum = 0, leftEyeCount = 0;
  let rightEyeLumSum = 0, rightEyeCount = 0;

  const minY = Math.floor(height * 0.2);
  const maxY = Math.floor(height * 0.4);
  const midX = Math.floor(width * 0.5);

  for (let y = minY; y < maxY; y += 4) {
    for (let x = Math.floor(width * 0.2); x < midX; x += 4) {
      const idx = (y * width + x) * 4;
      leftEyeLumSum += 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      leftEyeCount++;
    }
    for (let x = midX; x < Math.floor(width * 0.8); x += 4) {
      const idx = (y * width + x) * 4;
      rightEyeLumSum += 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      rightEyeCount++;
    }
  }

  const avgLeft = leftEyeCount > 0 ? leftEyeLumSum / leftEyeCount : 128;
  const avgRight = rightEyeCount > 0 ? rightEyeLumSum / rightEyeCount : 128;

  // Estimar diferencia de ángulo (máximo +/- 15 grados)
  const angleDiff = Math.max(-15, Math.min(15, (avgLeft - avgRight) * 0.25));

  if (Math.abs(angleDiff) > 2) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-angleDiff * Math.PI) / 180);
    ctx.drawImage(ctx.canvas, -width / 2, -height / 2);
    ctx.restore();
  }

  return angleDiff;
}

/**
 * Rastrea dinámicamente la posición y caja delimitadora (Bounding Box) del rostro en el fotograma completo
 */
export function detectFaceBoundingBox(
  video: HTMLVideoElement
): FaceBoundingBox | null {
  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 120;
  sampleCanvas.height = 120;
  const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) return null;

  sCtx.drawImage(video, 0, 0, 120, 120);
  const imgData = sCtx.getImageData(0, 0, 120, 120).data;

  let minX = 120, minY = 120, maxX = 0, maxY = 0;
  let count = 0;

  for (let y = 10; y < 110; y += 4) {
    for (let x = 10; x < 110; x += 4) {
      const idx = (y * 120 + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isSkinTone =
        r > 35 && g > 18 && b > 10 &&
        (maxC - minC) > 10 &&
        Math.abs(r - g) > 8 &&
        r > g && r > (b * 0.85);

      if (isSkinTone) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  if (count < 20 || maxX <= minX || maxY <= minY) {
    return null;
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const padX = Math.floor(boxW * 0.15);
  const padY = Math.floor(boxH * 0.15);

  const finalMinX = Math.max(0, minX - padX);
  const finalMinY = Math.max(0, minY - padY);
  const finalMaxX = Math.min(120, maxX + padX);
  const finalMaxY = Math.min(120, maxY + padY);

  const scaleX = vWidth / 120;
  const scaleY = vHeight / 120;

  return {
    x: Math.floor(finalMinX * scaleX),
    y: Math.floor(finalMinY * scaleY),
    width: Math.floor((finalMaxX - finalMinX) * scaleX),
    height: Math.floor((finalMaxY - finalMinY) * scaleY),
  };
}
