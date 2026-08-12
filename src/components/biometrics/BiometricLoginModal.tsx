import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  Eye,
  ArrowLeft,
  ArrowRight,
  Smile,
  RotateCcw,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBiometricLogin } from '@/hooks/school/useBiometricLogin';
import {
  LivenessChallengeEngine,
} from '@/features/biometrics/services/livenessDetector';
import {
  detectFaceWithLandmarks,
} from '@/features/biometrics/services/faceDetector';
import { LivenessChallenge, LivenessStatus } from '@/features/biometrics/types';
import { toast } from 'sonner';

interface BiometricLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  institutionId?: string;
}

export function BiometricLoginModal({
  isOpen,
  onClose,
  onSuccess,
  institutionId,
}: BiometricLoginModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const livenessEngineRef = useRef<LivenessChallengeEngine | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  // Estados de Liveness
  const [livenessStatus, setLivenessStatus] = useState<LivenessStatus>('idle');
  const [livenessProgress, setLivenessProgress] = useState<number>(0);
  const [livenessMessage, setLivenessMessage] = useState<string>('Posicione su rostro frente a la cámara');
  const [activeChallenge, setActiveChallenge] = useState<LivenessChallenge | null>(null);

  const { isAuthenticating, statusText, authenticateWithEmbedding } = useBiometricLogin();

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const resetChallenge = useCallback(() => {
    if (!livenessEngineRef.current) {
      livenessEngineRef.current = new LivenessChallengeEngine();
    } else {
      livenessEngineRef.current.reset();
    }
    livenessEngineRef.current.start();
    setActiveChallenge(livenessEngineRef.current.getActiveChallenge());
    setLivenessStatus('in_progress');
    setLivenessProgress(0);
    setLivenessMessage(livenessEngineRef.current.getActiveChallenge()?.prompt || 'Iniciando prueba...');
    setErrorMessage(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);
    setSuccessName(null);

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
            resetChallenge();
          };
        }
      }
    } catch (err: unknown) {
      console.error('Error al abrir la cámara:', err);
      setErrorMessage('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
  }, [stopCamera, resetChallenge]);

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

  // Bucle interactivo de detección y evaluación de liveness en tiempo real
  useEffect(() => {
    if (!cameraActive || !videoRef.current || livenessStatus !== 'in_progress') {
      return;
    }

    let isSubscribed = true;

    const processFrame = async () => {
      if (!isSubscribed || !videoRef.current || isProcessingRef.current) {
        animFrameRef.current = requestAnimationFrame(() => void processFrame());
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2 || video.paused || video.ended) {
        animFrameRef.current = requestAnimationFrame(() => void processFrame());
        return;
      }

      isProcessingRef.current = true;
      try {
        const detection = await detectFaceWithLandmarks(video);

        if (detection && livenessEngineRef.current) {
          const evalResult = livenessEngineRef.current.evaluate(detection.landmarks);

          setLivenessProgress(evalResult.progress);
          setLivenessMessage(evalResult.message);
          setLivenessStatus(evalResult.status);

          // Si superó la prueba de vida, proceder automáticamente a la autenticación
          if (evalResult.status === 'passed') {
            stopCamera();
            setLivenessMessage('¡Prueba de vida superada! Autenticando...');

            const result = await authenticateWithEmbedding(detection.embedding, institutionId);

            if (result.success && result.studentName) {
              setSuccessName(result.studentName);
              setTimeout(() => {
                onClose();
                if (onSuccess) onSuccess();
              }, 1200);
            } else if (result.error) {
              setErrorMessage(result.error);
              toast.error('Acceso Denegado', { description: result.error });
            }
            return;
          } else if (evalResult.status === 'timeout') {
            setErrorMessage('Tiempo agotado. Presione reintentar para una nueva prueba.');
          }
        }
      } catch (e) {
        console.warn('Error en ciclo de evaluación de liveness:', e);
      } finally {
        isProcessingRef.current = false;
        if (isSubscribed && livenessStatus === 'in_progress') {
          animFrameRef.current = requestAnimationFrame(() => void processFrame());
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(() => void processFrame());

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, livenessStatus, authenticateWithEmbedding, institutionId, onClose, onSuccess, stopCamera]);

  const renderChallengeIcon = () => {
    if (!activeChallenge) return <Camera className="w-5 h-5" />;
    switch (activeChallenge.type) {
      case 'blink':
        return <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />;
      case 'turn_left':
        return <ArrowLeft className="w-5 h-5 text-cyan-400 animate-bounce" />;
      case 'turn_right':
        return <ArrowRight className="w-5 h-5 text-cyan-400 animate-bounce" />;
      case 'smile':
        return <Smile className="w-5 h-5 text-cyan-400 animate-pulse" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 text-slate-100 border-slate-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {renderChallengeIcon()}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-100">
                  Acceso facial temporalmente no disponible
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Esta función se reactivará al completar la verificación de vida en servidor.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center my-3">
          {/* Contenedor de Video con marco biométrico */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-300`}
            />

            {!cameraActive && !errorMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs">Iniciando cámara y prueba de vida...</span>
              </div>
            )}

            {/* Escáner visual ovalado con pulso */}
            {cameraActive && !successName && !errorMessage && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div
                  className={`w-44 h-44 rounded-full border-2 ${
                    livenessStatus === 'passed'
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-cyan-400/70 animate-pulse'
                  } transition-all duration-300 flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
                </div>
              </div>
            )}

            {/* Banner de Éxito */}
            {successName && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in zoom-in duration-300">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-emerald-300">¡Identidad Confirmada!</h4>
                  <p className="text-sm font-semibold text-slate-200">{successName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Reto Activo e Indicador de Progreso */}
          {cameraActive && !successName && (
            <div className="w-full mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderChallengeIcon()}
                  <span className="text-xs font-semibold text-cyan-200">{livenessMessage}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`${
                    livenessStatus === 'passed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {livenessStatus === 'passed' ? 'Aprobado' : `${livenessProgress}%`}
                </Badge>
              </div>
              <Progress value={livenessProgress} className="h-1.5 bg-slate-800" />
            </div>
          )}

          {/* Estado e información de seguridad */}
          <div className="w-full mt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verificación biométrica en revisión de seguridad</span>
            </div>

            {(statusText || isAuthenticating) && (
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse text-[10px]">
                {statusText || 'Procesando...'}
              </Badge>
            )}
          </div>

          {errorMessage && (
            <div className="w-full mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetChallenge}
                className="h-7 text-xs border-rose-500/30 text-rose-200 hover:bg-rose-500/20"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          >
            <X className="w-4 h-4 mr-1" />
            Usar Contraseña
          </Button>

          {livenessStatus === 'timeout' && (
            <Button
              type="button"
              onClick={resetChallenge}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar Prueba
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
