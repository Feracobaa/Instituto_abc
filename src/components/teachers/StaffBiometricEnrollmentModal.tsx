import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, RefreshCw, CheckCircle, ShieldCheck, SwitchCamera, AlertTriangle, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { useBiometrics, loadFaceApiModels, extractEmbeddingFromVideo, computeCentroidEmbedding } from '@/hooks/school/useBiometrics';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveStabilityRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutoEnroll, setIsAutoEnroll] = useState(true);

  // Muestras capturadas para el centroide
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [existingRegistered, setExistingRegistered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState<number>(0);

  const { saveStaffBiometric, getStaffBiometric, deleteStaffBiometric, loading } = useBiometrics();

  const sampleCooldownUntilRef = useRef<number>(0);
  const hasSavedRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);

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
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
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
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen && userId) {
      void getStaffBiometric(userId).then(setExistingRegistered);
      setCapturedSamples([]);
      setStabilityProgress(0);
      consecutiveStabilityRef.current = 0;
      sampleCooldownUntilRef.current = 0;
      hasSavedRef.current = false;

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

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleResetSamples = () => {
    setCapturedSamples([]);
    setStabilityProgress(0);
    consecutiveStabilityRef.current = 0;
    sampleCooldownUntilRef.current = 0;
    hasSavedRef.current = false;
    toast.info('Secuencia de fotos reiniciada.');
  };

  const handleDeleteBiometric = async () => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      const ok = await deleteStaffBiometric(userId);
      if (ok) {
        setExistingRegistered(false);
        handleResetSamples();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCaptureSample = useCallback(async () => {
    if (!videoRef.current || !cameraActive || hasSavedRef.current) return;
    setIsCapturing(true);

    try {
      await loadFaceApiModels();
      const sample = await extractEmbeddingFromVideo(videoRef.current);

      if (!sample) {
        toast.warning('No se detectó un rostro nítido. Ubícate de frente a la cámara.');
        return;
      }

      setCapturedSamples((prev) => {
        if (prev.length >= 3) return prev;
        const updated = [...prev, sample.embedding];

        if (updated.length >= 3 && !hasSavedRef.current) {
          hasSavedRef.current = true;
          const centroid = computeCentroidEmbedding(updated);
          void saveStaffBiometric(userId, centroid).then((success) => {
            if (success) {
              toast.success(`Rostro de ${staffName} enrolado con éxito.`);
              setExistingRegistered(true);
              setTimeout(() => {
                stopCamera();
                onClose();
                if (onSuccess) onSuccess();
              }, 1200);
            } else {
              hasSavedRef.current = false;
            }
          });
        } else if (updated.length < 3) {
          toast.info(`Foto ${updated.length}/3 tomada. Ajusta levemente la posición.`);
        }

        return updated;
      });
    } catch (e: unknown) {
      console.error('Error al capturar muestra facial:', e);
      toast.error('Error capturando la muestra facial.');
    } finally {
      setIsCapturing(false);
    }
  }, [cameraActive, userId, staffName, saveStaffBiometric, stopCamera, onClose, onSuccess]);

  // Bucle de escaneo automático cuando isAutoEnroll está activado
  useEffect(() => {
    if (!isOpen || !cameraActive || !isAutoEnroll || capturedSamples.length >= 3) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || isCapturing || Date.now() < sampleCooldownUntilRef.current) return;

      try {
        if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
        const extracted = await extractEmbeddingFromVideo(videoRef.current, canvasRef.current);

        if (extracted && extracted.embedding) {
          consecutiveStabilityRef.current += 1;
          const progress = Math.min(100, Math.round((consecutiveStabilityRef.current / 3) * 100));
          setStabilityProgress(progress);

          if (consecutiveStabilityRef.current >= 3) {
            consecutiveStabilityRef.current = 0;
            sampleCooldownUntilRef.current = Date.now() + 1800; // Enfriamiento de 1.8s
            await handleCaptureSample();
          }
        } else {
          consecutiveStabilityRef.current = Math.max(0, consecutiveStabilityRef.current - 1);
          setStabilityProgress(Math.round((consecutiveStabilityRef.current / 3) * 100));
        }
      } catch (err) {
        console.warn('Error en autoscan:', err);
      }
    }, 450);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [isOpen, cameraActive, isAutoEnroll, capturedSamples.length, isCapturing, handleCaptureSample]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 text-slate-100 border-slate-800 p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              Registro Facial Automático
            </div>
            {existingRegistered && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                Registrado ✓
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Docente: <strong className="text-slate-100">{staffName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-3 gap-3">
          {/* Visualizador de Video con Guía Animada */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-950">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">Abriendo visor de cámara...</span>
              </div>
            )}

            {/* Indicaciones Flotantes de Enrolamiento Automático */}
            <div className="absolute bottom-4 left-0 right-0 pointer-events-none flex flex-col items-center justify-center gap-2 z-20 px-3">
              <div className="px-3.5 py-1.5 bg-slate-900/90 text-white text-xs rounded-full border border-slate-700 shadow-lg backdrop-blur-sm flex items-center gap-2">
                {capturedSamples.length === 0 && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                {capturedSamples.length === 1 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                {capturedSamples.length >= 2 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                <span className="font-medium">
                  {capturedSamples.length === 0 && '👤 Paso 1: Mire de frente (auto-captura)'}
                  {capturedSamples.length === 1 && '↗️ Paso 2: Gire levemente el rostro 15°'}
                  {capturedSamples.length === 2 && '🎯 Paso 3: Mire al centro para finalizar'}
                  {capturedSamples.length >= 3 && '✅ ¡Muestras completadas! Guardando...'}
                </span>
              </div>
            </div>

            {/* Anillo de Progreso de Estabilidad Temporal */}
            {isAutoEnroll && stabilityProgress > 0 && capturedSamples.length < 3 && (
              <div className="absolute top-3 right-3 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs px-2.5 py-1 rounded-full font-mono font-bold backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span>Encuadre: {stabilityProgress}%</span>
              </div>
            )}
          </div>

          {/* Barra de Progreso de Muestras Multi-Ángulo */}
          <div className="w-full bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">
                Secuencia Automática:
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((step) => (
                <Badge
                  key={step}
                  className={`text-xs px-2.5 py-0.5 font-mono transition-all ${
                    capturedSamples.length >= step
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-500 border-dashed border border-slate-700'
                  }`}
                >
                  {capturedSamples.length >= step ? `✓ Foto ${step}` : `Foto ${step}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Switch Modo Automático / Manual */}
          <div className="flex items-center justify-between w-full text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-enroll-staff"
                checked={isAutoEnroll}
                onCheckedChange={setIsAutoEnroll}
              />
              <Label htmlFor="auto-enroll-staff" className="cursor-pointer font-medium text-slate-300">
                Captura Automática Manos Libres
              </Label>
            </div>

            {capturedSamples.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetSamples} className="h-6 text-xs text-amber-400 hover:text-amber-300 gap-1">
                <RotateCcw className="w-3 h-3" />
                Reiniciar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <Badge variant="outline" className="gap-1 border-slate-800 bg-slate-900 text-slate-300">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              {isCapturing ? 'Capturando muestra...' : cameraActive ? 'Cámara activa' : 'Iniciando...'}
            </Badge>

            <Button variant="ghost" size="sm" onClick={toggleCamera} className="gap-1 text-xs text-slate-400 hover:text-slate-200">
              <SwitchCamera className="w-4 h-4" />
              Cambiar Cámara
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center w-full pt-2">
          {/* Botón Borrar Huella si ya está registrada */}
          {existingRegistered && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteBiometric()}
              disabled={loading || isDeleting}
              className="w-full sm:w-auto text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
            >
              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Borrar Huella
            </Button>
          )}

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            >
              Cancelar
            </Button>

            {!isAutoEnroll && capturedSamples.length < 3 && (
              <Button
                type="button"
                onClick={() => void handleCaptureSample()}
                disabled={!cameraActive || isCapturing}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Tomar Foto ({capturedSamples.length + 1}/3)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
