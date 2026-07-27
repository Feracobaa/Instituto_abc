import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, RefreshCw, CheckCircle, ShieldCheck, SwitchCamera, AlertTriangle } from 'lucide-react';
import { useBiometrics } from '@/hooks/school/useBiometrics';
import { CameraFacingMode } from '@/types/biometrics';
import { toast } from 'sonner';

interface BiometricEnrollmentModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BiometricEnrollmentModal: React.FC<BiometricEnrollmentModalProps> = ({
  studentId,
  studentName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [insecureContextError, setInsecureContextError] = useState<boolean>(false);
  const { saveStudentBiometric, loading } = useBiometrics();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const attachStreamToVideo = useCallback((stream: MediaStream, retryCount = 0) => {
    const video = videoRef.current;
    if (!video) {
      if (retryCount < 25) {
        setTimeout(() => attachStreamToVideo(stream, retryCount + 1), 100);
      }
      return;
    }

    try {
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      const playVideo = () => {
        video.play()
          .then(() => {
            setIsCapturing(true);
          })
          .catch((playErr) => {
            console.warn('Playback manual iniciado tras fallo en play():', playErr);
            setIsCapturing(true);
          });
      };

      video.onloadedmetadata = () => {
        playVideo();
      };

      // Iniciar de inmediato si ya están los metadatos cargados
      playVideo();
    } catch (e) {
      console.error('Error al vincular el MediaStream al elemento video:', e);
    }
  }, []);

  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    stopCamera();
    setInsecureContextError(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('API navigator.mediaDevices no disponible. Verifique contexto seguro (HTTPS o localhost).');
      setInsecureContextError(true);
      toast.error('La cámara requiere HTTPS o localhost si estás accediendo desde un celular.', { duration: 7000 });
      return;
    }

    try {
      let stream: MediaStream | null = null;
      
      // Intento 1: facingMode ideal
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
      } catch (e1) {
        console.warn('Falló la restricción ideal de cámara, intentando por nombre:', e1);
        // Intento 2: facingMode directo
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (e2) {
          console.warn('Falló la restricción directa de cámara, usando video general:', e2);
          // Intento 3: video por defecto (útil para computadores de escritorio)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        streamRef.current = stream;
        attachStreamToVideo(stream);
      }
    } catch (err) {
      console.error('Error abriendo la cámara:', err);
      toast.error('No se pudo acceder a la cámara. Por favor verifica que diste permisos en tu navegador.');
    }
  }, [stopCamera, attachStreamToVideo]);

  useEffect(() => {
    if (isOpen) {
      // Pequeño retardo para dar tiempo al portal de Radix UI a montar el elemento <video> en el DOM
      const timer = setTimeout(() => {
        startCamera(facingMode);
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCaptureAndSave = async () => {
    if (!studentId) return;

    // Generar descriptor biométrico de 128 posiciones para prueba de concepto
    const syntheticEmbedding: number[] = new Array(128);
    for (let i = 0; i < 128; i++) {
      syntheticEmbedding[i] = parseFloat(((Math.random() * 2 - 1) * 0.1).toFixed(6));
    }

    const ok = await saveStudentBiometric(studentId, syntheticEmbedding);
    if (ok) {
      stopCamera();
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Registro Biométrico Facial
          </DialogTitle>
          <DialogDescription>
            Estudiante: <strong className="text-slate-900 dark:text-slate-100">{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {insecureContextError ? (
          <div className="p-4 my-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              Se requiere conexión segura (HTTPS) en celulares
            </div>
            <p>
              Los navegadores móviles bloquean la cámara cuando se navega por HTTP usando una dirección IP local (ej. <code>http://192.168.x.x:8080</code>).
            </p>
            <p className="font-semibold">Para solucionar esto en tu móvil:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Abre <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> en Chrome de tu teléfono.</li>
              <li>Añade la URL completa de la plataforma (ej: <code>http://192.168.1.50:8080</code>) y habilita la opción.</li>
              <li>O accede utilizando <code>localhost</code> directamente en la computadora.</li>
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center my-3 gap-3">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Óvalo guía */}
              <div className="absolute w-44 h-56 rounded-[50%] border-2 border-dashed border-emerald-400 pointer-events-none flex items-center justify-center">
                <span className="text-xs bg-black/60 px-2 py-1 rounded text-emerald-300 backdrop-blur-sm">
                  Centre el rostro
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full">
              <Badge variant="outline" className="gap-1 text-slate-600">
                <Camera className="w-3.5 h-3.5" />
                {isCapturing ? 'Cámara activa' : 'Iniciando cámara...'}
              </Badge>

              <Button variant="ghost" size="sm" onClick={toggleCamera} className="gap-1 text-xs">
                <SwitchCamera className="w-4 h-4" />
                Cambiar Cámara
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleCaptureAndSave}
            disabled={loading || !isCapturing || insecureContextError}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Guardar Huella Facial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

