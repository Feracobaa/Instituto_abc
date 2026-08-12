import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  SwitchCamera,
  Trash2,
  Sparkles,
  RotateCcw,
  User,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useBiometrics } from '@/hooks/school/useBiometrics';
import { useBiometricEnrollment, ENROLLMENT_STEP_CONFIG } from '@/features/biometrics/hooks/useBiometricEnrollment';
import { toast } from 'sonner';

interface StaffBiometricEnrollmentModalProps {
  userId: string;
  staffName: string;
  institutionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StaffBiometricEnrollmentModal({
  userId,
  staffName,
  institutionId,
  isOpen,
  onClose,
  onSuccess,
}: StaffBiometricEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [existingRegistered, setExistingRegistered] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { saveStaffBiometric, getStaffBiometric, deleteStaffBiometric, loading } = useBiometrics();
  const {
    step,
    capturedSamples,
    stabilityProgress,
    feedbackMessage,
    processFrame,
    resetEnrollment,
  } = useBiometricEnrollment(staffName);

  useEffect(() => {
    if (isOpen && userId) {
      void getStaffBiometric(userId).then(setExistingRegistered);
      resetEnrollment();
    }
  }, [isOpen, userId, getStaffBiometric, resetEnrollment]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
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
      console.error('Error abriendo cámara de enrolamiento docente:', err);
      toast.error('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, startCamera, stopCamera]);

  const handleSaveCentroid = useCallback(
    async (centroid: number[]): Promise<boolean> => {
      if (!userId) return false;
      const ok = await saveStaffBiometric(userId, centroid, institutionId);
      if (ok) {
        setTimeout(() => {
          stopCamera();
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      }
      return ok;
    },
    [userId, institutionId, saveStaffBiometric, stopCamera, onSuccess, onClose]
  );

  useEffect(() => {
    if (!cameraActive || !videoRef.current || step === 'complete' || step === 'failed') {
      return;
    }

    let isSubscribed = true;

    const loop = async () => {
      if (!isSubscribed || !videoRef.current) return;
      if (videoRef.current.readyState >= 2 && !videoRef.current.paused) {
        await processFrame(videoRef.current, handleSaveCentroid);
      }
      if (isSubscribed) {
        animFrameRef.current = requestAnimationFrame(() => void loop());
      }
    };

    animFrameRef.current = requestAnimationFrame(() => void loop());

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, step, processFrame, handleSaveCentroid]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleDelete = async () => {
    if (!userId) return;
    setIsDeleting(true);
    const ok = await deleteStaffBiometric(userId);
    setIsDeleting(false);

    if (ok) {
      setExistingRegistered(false);
      resetEnrollment();
      if (onSuccess) onSuccess();
    }
  };

  const renderStepIcon = (s: string) => {
    switch (s) {
      case 'frontal':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'left':
        return <ArrowLeft className="w-4 h-4 text-amber-400" />;
      case 'right':
        return <ArrowRight className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 text-slate-100 border-slate-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-100">
                  Enrolamiento Facial de Docente
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Personal: <strong className="text-slate-200">{staffName}</strong>
                </DialogDescription>
              </div>
            </div>
            {existingRegistered && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                Registrado ✓
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-3 gap-3">
          {/* Visor de Cámara con Guía */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-xs">Iniciando cámara...</span>
              </div>
            )}

            {/* Guía Ovalada Central */}
            {cameraActive && step !== 'complete' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div
                  className={`w-44 h-44 rounded-full border-2 ${
                    stabilityProgress > 50
                      ? 'border-emerald-400 bg-emerald-500/10 scale-105'
                      : 'border-slate-400/50'
                  } transition-all duration-300 flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping" />
                </div>
              </div>
            )}

            {/* Banner de Éxito al Completar */}
            {step === 'complete' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in zoom-in duration-300">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-emerald-300">¡Rostro Registrado!</h4>
                  <p className="text-xs text-slate-300">Template 3D asociado a la cuenta docente</p>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Guía de Pasos Multi-Ángulo */}
          <div className="w-full bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderStepIcon(step)}
                <span className="text-xs font-semibold text-slate-200">{feedbackMessage}</span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-xs">
                {capturedSamples.length}/3 Muestras
              </Badge>
            </div>

            {stabilityProgress > 0 && step !== 'complete' && (
              <div className="space-y-1">
                <Progress value={stabilityProgress} className="h-1.5 bg-slate-800" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['frontal', 'left', 'right'] as const).map((s, idx) => {
                const isDone = capturedSamples.length > idx;
                const isCurrent = step === s;
                const config = ENROLLMENT_STEP_CONFIG[s];

                return (
                  <div
                    key={s}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isDone
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 animate-pulse'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="text-[11px] font-bold block">
                      {isDone ? `✓ ${config.title.split(':')[0]}` : config.title.split(':')[0]}
                    </span>
                    <span className="text-[9px] block text-slate-400">
                      {s === 'frontal' ? 'Frontal' : s === 'left' ? 'Giro Izq' : 'Giro Der'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controles de Cámara y Reinicio */}
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetEnrollment}
              className="h-7 text-xs text-slate-400 hover:text-slate-200 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCamera}
              className="h-7 text-xs text-slate-400 hover:text-slate-200 gap-1"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              Cambiar Cámara
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center w-full pt-2">
          {existingRegistered && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading || isDeleting}
              className="w-full sm:w-auto text-xs"
            >
              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Eliminar Rostro
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={loading}
            className="border-slate-800 text-slate-300 hover:bg-slate-900"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
