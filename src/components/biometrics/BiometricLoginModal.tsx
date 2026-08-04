import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBiometricLogin } from '@/hooks/school/useBiometricLogin';
import { toast } from 'sonner';

interface BiometricLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BiometricLoginModal({ isOpen, onClose, onSuccess }: BiometricLoginModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  const { isScanning, statusText, performBiometricLogin } = useBiometricLogin();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
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
          };
        }
      }
    } catch (err: unknown) {
      console.error('Error al abrir la cámara:', err);
      setErrorMessage('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
  }, [stopCamera]);

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

  const handleScan = async () => {
    if (!videoRef.current || !cameraActive) return;
    setErrorMessage(null);

    const result = await performBiometricLogin(videoRef.current);

    if (result.success && result.studentName) {
      setSuccessName(result.studentName);
      setTimeout(() => {
        stopCamera();
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } else if (result.error) {
      setErrorMessage(result.error);
      toast.error('Reconocimiento fallido', { description: result.error });
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
                  Inicio de Sesión Facial
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Reconocimiento biométrico institucional de alta precisión
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center my-4">
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
                <span className="text-xs">Iniciando cámara...</span>
              </div>
            )}

            {/* Escáner visual overlay */}
            {cameraActive && !successName && !errorMessage && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Cuadro de escaneo ovalado */}
                <div className={`w-48 h-48 rounded-full border-2 ${isScanning ? 'border-cyan-400 animate-pulse scale-105' : 'border-slate-400/50'} transition-all duration-300 flex items-center justify-center relative`}>
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
                  <h4 className="text-lg font-bold text-emerald-300">¡Bienvenido/a!</h4>
                  <p className="text-sm font-semibold text-slate-200">{successName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Estado e instrucciones */}
          <div className="w-full mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 font-medium">Liveness Anti-Spoofing Activo</span>
            </div>

            {statusText && (
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse">
                {statusText}
              </Badge>
            )}
          </div>

          {errorMessage && (
            <div className="w-full mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
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

          <Button
            type="button"
            onClick={() => void handleScan()}
            disabled={!cameraActive || isScanning || Boolean(successName)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Escaneando...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Verificar Rostro
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
