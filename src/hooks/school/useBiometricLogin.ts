import { useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { supabase } from '@/integrations/supabase/client';
import { loadFaceApiModels, analyzeImageQuality, normalizeVector } from '@/hooks/school/useBiometrics';
import { toast } from 'sonner';

interface BiometricLoginResult {
  success: boolean;
  studentName?: string;
  error?: string;
}

export function useBiometricLogin() {
  const [isScanning, setIsScanning] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('Esperando cámara...');

  const performBiometricLogin = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<BiometricLoginResult> => {
    setIsScanning(true);
    setStatusText('Cargando inteligencia artificial de visión...');

    try {
      // 1. Cargar modelos neuronales de reconocimieto facial
      setIsModelsLoading(true);
      const loaded = await loadFaceApiModels();
      setIsModelsLoading(false);

      if (!loaded) {
        throw new Error('No se pudieron cargar los modelos de visión por computadora.');
      }

      setStatusText('Buscando rostro en cámara...');

      // 2. Ejecutar detección facial en el elemento de video
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          success: false,
          error: 'No se detectó ningún rostro claro frente a la cámara.',
        };
      }

      // 3. Verificar calidad y liveness de la captura
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const quality = analyzeImageQuality(ctx, canvas.width, canvas.height);
        if (quality.isSpoof) {
          return {
            success: false,
            error: 'Detección de liveness fallida (posible pantalla o foto impresa).',
          };
        }
      }

      setStatusText('Verificando biometría en el servidor...');

      // 4. Extraer y normalizar vector de 128 características
      const rawVector = Array.from(detection.descriptor);
      const normalizedEmbedding = normalizeVector(rawVector);

      // 5. Invocación de Edge Function / RPC de Supabase
      const { data, error } = await supabase.functions.invoke('biometric-login', {
        body: {
          embedding: normalizedEmbedding,
          match_threshold: 0.88,
        },
      });

      if (error || !data || data.status !== 'success') {
        const responseContext = (error as { context?: Response })?.context;
        let errorMessage = 'Rostro no reconocido o coincidencia insuficiente.';
        if (responseContext instanceof Response) {
          try {
            const body = await responseContext.json();
            if (body.error) errorMessage = body.error;
          } catch {
            // usar fallback
          }
        }
        return {
          success: false,
          error: errorMessage,
        };
      }

      setStatusText(`¡Hola, ${data.student_name}! Autenticando...`);

      // 6. Verificar OTP token_hash y establecer sesión nativa en Supabase Auth
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      });

      if (verifyError) {
        throw verifyError;
      }

      toast.success(`¡Bienvenido/a, ${data.student_name}!`, {
        description: 'Inicio de sesión biométrico completado con éxito.',
      });

      return {
        success: true,
        studentName: data.student_name,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado durante la verificación.';
      return {
        success: false,
        error: msg,
      };
    } finally {
      setIsScanning(false);
      setStatusText('');
    }
  }, []);

  return {
    isModelsLoading,
    isScanning,
    statusText,
    performBiometricLogin,
  };
}
