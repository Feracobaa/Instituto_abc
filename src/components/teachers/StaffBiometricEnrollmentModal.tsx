import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBiometrics, loadFaceApiModels, extractEmbeddingFromVideo, computeCentroidEmbedding, analyzeImageQuality } from '@/hooks/school/useBiometrics';
import { toast } from 'sonner';

interface StaffBiometricEnrollmentModalProps {
  userId: string;
  staffName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StaffBiometricEnrollmentModal({
  userId,
  staffName,
  isOpen,
  onClose,
  onSuccess,
}: StaffBiometricEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [existingRegistered, setExistingRegistered] = useState(false);

  const { saveStaffBiometric, getStaffBiometric } = useBiometrics();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            void videoRef.current?.play();
            setCameraActive(true);
          };
        }
      }
    } catch (err: unknown) {
      console.error('Error abriendo cámara de enrolamiento:', err);
      toast.error('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && userId) {
      void getStaffBiometric(userId).then(setExistingRegistered);
      setCapturedSamples([]);
      const timer = setTimeout(() => {
        void startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, userId, getStaffBiometric, startCamera, stopCamera]);

  const handleCaptureSample = async () => {
    if (!videoRef.current || !cameraActive) return;
    setIsCapturing(true);

    try {
      await loadFaceApiModels();
      const sample = await extractEmbeddingFromVideo(videoRef.current);

      if (!sample) {
        toast.warning('No se detectó un rostro nítido. Ubícate de frente a la cámara.');
        return;
      }

      const updated = [...capturedSamples, sample.embedding];
      setCapturedSamples(updated);

      if (updated.length >= 3) {
        // Calcular vector promedio de alta precisión
        const centroid = computeCentroidEmbedding(updated);
        const success = await saveStaffBiometric(userId, centroid);

        if (success) {
          toast.success(`Rostro de ${staffName} enrolado con éxito.`);
          setExistingRegistered(true);
          setTimeout(() => {
            stopCamera();
            onClose();
            if (onSuccess) onSuccess();
          }, 1000);
        }
      } else {
        toast.info(`Muestra ${updated.length}/3 registrada. Toma ${3 - updated.length} muestra(s) más.`);
      }
    } catch (e: unknown) {
      console.error('Error al capturar muestra facial:', e);
      toast.error('Error capturando la muestra facial.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 text-slate-100 border-slate-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-100">
                  Enrolar Rostro del Docente
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {staffName}
                </DialogDescription>
              </div>
            </div>

            {existingRegistered && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Registrado
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center my-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-300`}
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">Abriendo visor de cámara...</span>
              </div>
            )}
          </div>

          {/* Progreso de muestras */}
          <div className="w-full mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    idx < capturedSamples.length
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      : 'bg-slate-800'
                  }`}
                  style={{ width: '4rem' }}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {capturedSamples.length}/3 Muestras
            </span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => void handleCaptureSample()}
            disabled={!cameraActive || isCapturing}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Procesando Muestra...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Capturar Muestra ({capturedSamples.length + 1}/3)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
