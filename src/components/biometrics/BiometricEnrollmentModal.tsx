import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, RefreshCw, CheckCircle, ShieldCheck, SwitchCamera, AlertTriangle, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { useBiometrics, extractEmbeddingFromVideo, computeCentroidEmbedding } from '@/hooks/school/useBiometrics';
import { CameraFacingMode, StudentBiometric } from '@/types/biometrics';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [insecureContextError, setInsecureContextError] = useState<boolean>(false);

  // Muestras capturadas para el centroide
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [existingBiometric, setExistingBiometric] = useState<StudentBiometric | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { saveStudentBiometric, deleteStudentBiometric, getBiometricsForStudents, loading } = useBiometrics();

  // Cargar si el estudiante ya posee huella registrada
  useEffect(() => {
    if (isOpen && studentId) {
      getBiometricsForStudents([studentId]).then(bios => {
        if (bios.length > 0) {
          setExistingBiometric(bios[0]);
        } else {
          setExistingBiometric(null);
        }
      });
      setCapturedSamples([]);
    }
  }, [isOpen, studentId, getBiometricsForStudents]);

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

      playVideo();
    } catch (e) {
      console.error('Error al vincular el MediaStream al elemento video:', e);
    }
  }, []);

  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    stopCamera();
    setInsecureContextError(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setInsecureContextError(true);
      toast.error('La cámara requiere HTTPS o localhost si estás accediendo desde un celular.', { duration: 7000 });
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
      } catch (e1: any) {
        if (e1?.name === 'NotAllowedError' || e1?.name === 'SecurityError') throw e1;
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (stream) {
        streamRef.current = stream;
        attachStreamToVideo(stream);
      }
    } catch (err: any) {
      console.error('Error abriendo la cámara:', err);
      toast.error('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
  }, [stopCamera, attachStreamToVideo]);

  useEffect(() => {
    if (isOpen) {
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

  /**
   * Captura una muestra facial de alta precisión
   */
  const handleTakeSample = () => {
    if (!studentId || !videoRef.current) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const extracted = extractEmbeddingFromVideo(videoRef.current, canvasRef.current);
    if (!extracted || !extracted.embedding) {
      toast.error('No se pudo detectar un rostro claro. Centre su rostro dentro del óvalo.');
      return;
    }

    if (extracted.quality.isLowLight) {
      toast.warning('Poca iluminación detectada. Por favor ilumine mejor la zona para mayor precisión.');
    }

    const newSamples = [...capturedSamples, extracted.embedding];
    setCapturedSamples(newSamples);

    toast.success(`Muestra ${newSamples.length}/3 capturada correctamente.`);
  };

  /**
   * Procesa las muestras y guarda el centroide biométrico definitivo
   */
  const handleSaveFinalBiometric = async () => {
    if (!capturedSamples.length || !studentId) return;

    const finalCentroid = computeCentroidEmbedding(capturedSamples);
    const ok = await saveStudentBiometric(studentId, finalCentroid);

    if (ok) {
      stopCamera();
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  /**
   * Elimina la huella facial actual del estudiante
   */
  const handleDeleteBiometric = async () => {
    if (!studentId) return;
    setIsDeleting(true);
    const ok = await deleteStudentBiometric(studentId);
    setIsDeleting(false);

    if (ok) {
      setExistingBiometric(null);
      setCapturedSamples([]);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Registro Biométrico Facial
            </div>
            {existingBiometric && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
                Registrado ✓
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Estudiante: <strong className="text-slate-900 dark:text-slate-100">{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {insecureContextError ? (
          <div className="p-4 my-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              Conexión HTTPS Requerida en Celulares
            </div>
            <p>Los navegadores móviles bloquean la cámara en HTTP.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center my-3 gap-3">
            {/* Visualizador de Video */}
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
                <span className="text-xs bg-black/60 px-2.5 py-1 rounded-full text-emerald-300 backdrop-blur-sm font-medium">
                  {capturedSamples.length === 0 && '1. Mire al frente'}
                  {capturedSamples.length === 1 && '2. Gire ligeramente'}
                  {capturedSamples.length >= 2 && '3. Mantenga la postura'}
                </span>
              </div>
            </div>

            {/* Barra de Progreso de Muestras Multi-Ángulo */}
            <div className="w-full bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Calidad Multi-Muestra:
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(step => (
                  <Badge
                    key={step}
                    className={`text-xs px-2.5 py-0.5 font-mono ${
                      capturedSamples.length >= step
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {capturedSamples.length >= step ? `✓ Muestra ${step}` : `Muestra ${step}`}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <Badge variant="outline" className="gap-1">
                <Camera className="w-3.5 h-3.5" />
                {isCapturing ? 'Cámara activa' : 'Iniciando...'}
              </Badge>

              <Button variant="ghost" size="sm" onClick={toggleCamera} className="gap-1 text-xs">
                <SwitchCamera className="w-4 h-4" />
                Cambiar Cámara
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center w-full pt-2">
          {/* Botón Eliminar Huella si ya está registrada */}
          {existingBiometric && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteBiometric}
              disabled={loading || isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Borrar Huella
            </Button>
          )}

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>

            {capturedSamples.length < 3 ? (
              <Button
                onClick={handleTakeSample}
                disabled={loading || !isCapturing || insecureContextError}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Capturar Muestra ({capturedSamples.length}/3)
              </Button>
            ) : (
              <Button
                onClick={handleSaveFinalBiometric}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold animate-pulse"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Guardar Huella Definitiva
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


