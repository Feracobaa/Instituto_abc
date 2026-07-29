import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, RefreshCw, CheckCircle, ShieldCheck, SwitchCamera, AlertTriangle, Trash2, Sparkles, Volume2, RotateCcw } from 'lucide-react';
import { useBiometrics, extractEmbeddingFromVideo, computeCentroidEmbedding } from '@/hooks/school/useBiometrics';
import { CameraFacingMode, StudentBiometric } from '@/types/biometrics';
import { voiceFeedback } from '@/utils/voiceFeedback';
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
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveStabilityRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('user');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isAutoEnroll, setIsAutoEnroll] = useState<boolean>(true);
  const [insecureContextError, setInsecureContextError] = useState<boolean>(false);

  // Muestras capturadas para el centroide
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [existingBiometric, setExistingBiometric] = useState<StudentBiometric | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [stabilityProgress, setStabilityProgress] = useState<number>(0); // 0 a 100%

  const { saveStudentBiometric, deleteStudentBiometric, getBiometricsForStudents, loading } = useBiometrics();

  const sampleCooldownUntilRef = useRef<number>(0);
  const hasSavedRef = useRef<boolean>(false);

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
      setStabilityProgress(0);
      consecutiveStabilityRef.current = 0;
      sampleCooldownUntilRef.current = 0;
      hasSavedRef.current = false;
    }
  }, [isOpen, studentId, getBiometricsForStudents]);

  const stopCamera = useCallback(() => {
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);

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
            voiceFeedback.speak(`Iniciando registro para ${studentName}. Coloque su rostro de frente.`, 'normal');
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
  }, [studentName]);

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
   * Procesa las muestras y guarda el centroide biométrico definitivo (UNA SOLA VEZ)
   */
  const handleSaveFinalBiometric = useCallback(async (samplesToUse: number[][]) => {
    if (!samplesToUse || !samplesToUse.length || !studentId || hasSavedRef.current) return;

    hasSavedRef.current = true;
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);

    const finalCentroid = computeCentroidEmbedding(samplesToUse);
    const ok = await saveStudentBiometric(studentId, finalCentroid);

    if (ok) {
      voiceFeedback.notifySuccess(studentName);
      stopCamera();
      if (onSuccess) onSuccess();
      onClose();
    } else {
      console.error('Fallo al guardar biometría facial en Supabase.');
      toast.error('No se pudo guardar la huella facial. Por favor intente de nuevo.');
    }
  }, [studentId, saveStudentBiometric, studentName, stopCamera, onSuccess, onClose]);

  /**
   * Captura manual o automática de una muestra facial con cooldown de seguridad
   */
  const handleTakeSample = useCallback(async () => {
    if (!studentId || !videoRef.current || hasSavedRef.current) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const extracted = await extractEmbeddingFromVideo(videoRef.current, canvasRef.current);
    if (!extracted || !extracted.embedding) {
      return;
    }

    // Cooldown de 1.4 segundos entre cada muestra para dar tiempo al alumno
    sampleCooldownUntilRef.current = Date.now() + 1400;
    consecutiveStabilityRef.current = 0;
    setStabilityProgress(0);

    const newSamples = [...capturedSamples, extracted.embedding];
    setCapturedSamples(newSamples);

    voiceFeedback.playSound('success');

    if (newSamples.length === 1) {
      toast.success('Muestra 1/3 capturada. Ahora gire suavemente la cabeza.');
      voiceFeedback.speak('Muestra uno capturada. Ahora gire suavemente el rostro.', 'high');
    } else if (newSamples.length === 2) {
      toast.success('Muestra 2/3 capturada. Mire nuevamente al frente.');
      voiceFeedback.speak('Muestra dos capturada. Excelente, mire de nuevo al centro.', 'high');
    } else if (newSamples.length >= 3) {
      toast.success('Muestras completadas. Guardando huella biométrica...');
      // Disparar guardado definitivo directamente una sola vez
      handleSaveFinalBiometric(newSamples);
    }
  }, [studentId, capturedSamples, handleSaveFinalBiometric]);

  /**
   * Bucle de captura automática inteligente en tiempo real
   */
  useEffect(() => {
    if (!isCapturing || !isAutoEnroll || capturedSamples.length >= 3 || loading || hasSavedRef.current) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || hasSavedRef.current) return;
      if (Date.now() < sampleCooldownUntilRef.current) return;

      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');

      const extracted = await extractEmbeddingFromVideo(videoRef.current, canvasRef.current);
      if (extracted && extracted.embedding) {
        consecutiveStabilityRef.current += 1;
        const progress = Math.min(100, consecutiveStabilityRef.current * 25);
        setStabilityProgress(progress);

        // Al alcanzar 100% de estabilidad (4 fotogramas estables consecutivos ~800ms)
        if (consecutiveStabilityRef.current >= 4) {
          handleTakeSample();
        }
      } else {
        consecutiveStabilityRef.current = Math.max(0, consecutiveStabilityRef.current - 1);
        setStabilityProgress(consecutiveStabilityRef.current * 25);
      }
    }, 200);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [isCapturing, isAutoEnroll, capturedSamples.length, loading, handleTakeSample]);

  /**
   * Reinicia la secuencia de captura
   */
  const handleResetSamples = () => {
    setCapturedSamples([]);
    setStabilityProgress(0);
    consecutiveStabilityRef.current = 0;
    sampleCooldownUntilRef.current = 0;
    hasSavedRef.current = false;
    toast.info('Secuencia de captura reiniciada.');
    voiceFeedback.speak('Secuencia de captura reiniciada. Posicionese de frente.', 'normal');
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
      setStabilityProgress(0);
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
              Registro Facial Automático
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
            {/* Visualizador de Video con Guía Animada */}
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Indicaciones Flotantes de Enrolamiento Automático */}
              <div className="absolute bottom-4 left-0 right-0 pointer-events-none flex flex-col items-center justify-center gap-2 z-20 px-3">
                <div className="px-3.5 py-1.5 bg-slate-900/90 text-white text-xs rounded-full border border-slate-700 shadow-lg backdrop-blur-sm flex items-center gap-2">
                  {capturedSamples.length === 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {capturedSamples.length === 1 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                  {capturedSamples.length >= 2 && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  )}
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
                <div className="absolute top-3 right-3 bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs px-2.5 py-1 rounded-full font-mono font-bold backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Encuadre: {stabilityProgress}%</span>
                </div>
              )}
            </div>

            {/* Barra de Progreso de Muestras Multi-Ángulo */}
            <div className="w-full bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Secuencia Automática:
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(step => (
                  <Badge
                    key={step}
                    className={`text-xs px-2.5 py-0.5 font-mono transition-all ${
                      capturedSamples.length >= step
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-dashed border'
                    }`}
                  >
                    {capturedSamples.length >= step ? `✓ Foto ${step}` : `Foto ${step}`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Switch Modo Automático / Manual */}
            <div className="flex items-center justify-between w-full text-xs bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-enroll"
                  checked={isAutoEnroll}
                  onCheckedChange={setIsAutoEnroll}
                />
                <Label htmlFor="auto-enroll" className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  Captura Automática Manos Libres
                </Label>
              </div>

              {capturedSamples.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleResetSamples} className="h-6 text-xs text-amber-600 gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Reiniciar
                </Button>
              )}
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
              className="w-full sm:w-auto text-xs"
            >
              {isDeleting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Borrar Huella
            </Button>
          )}

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>

            {!isAutoEnroll && capturedSamples.length < 3 && (
              <Button
                onClick={handleTakeSample}
                disabled={loading || !isCapturing || insecureContextError}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Capturar Manual ({capturedSamples.length}/3)
              </Button>
            )}

            {capturedSamples.length >= 3 && (
              <Button
                onClick={() => handleSaveFinalBiometric(capturedSamples)}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold animate-pulse"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Guardando Huella...
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



