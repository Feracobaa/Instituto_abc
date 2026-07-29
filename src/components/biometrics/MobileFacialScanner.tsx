import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, SwitchCamera, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, AlertTriangle, Sparkles, Volume2, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CameraFacingMode, StudentBiometric, ScannerState } from '@/types/biometrics';
import { useBiometrics, extractEmbeddingFromVideo } from '@/hooks/school/useBiometrics';
import {
  queueOfflineAttendanceRecord,
  syncOfflineAttendanceQueue,
} from '@/utils/biometricOfflineCache';
import { voiceFeedback } from '@/utils/voiceFeedback';
import { toast } from 'sonner';

interface StudentInfo {
  id: string;
  name: string;
}

interface MobileFacialScannerProps {
  students: StudentInfo[];
  registeredBiometrics: StudentBiometric[];
  onAttendanceMarked: (studentId: string, status: 'present' | 'absent' | 'justified', method: 'facial_mobile') => void;
  onClose: () => void;
}

export const MobileFacialScanner: React.FC<MobileFacialScannerProps> = ({
  students,
  registeredBiometrics,
  onAttendanceMarked,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [insecureContextError, setInsecureContextError] = useState<boolean>(false);

  // Máquina de estados visual del semáforo: ready (verde) | analyzing (amarillo) | cooldown_success (rojo) | cooldown_error (rojo)
  const [scannerState, setScannerState] = useState<ScannerState>('ready');
  const [statusMessage, setStatusMessage] = useState<string>('Buscando rostros...');
  const [lastMatchName, setLastMatchName] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [markedStudentIds, setMarkedStudentIds] = useState<Set<string>>(new Set());

  // Indicador de baja iluminación y caja de seguimiento dinámica
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [detectedBox, setDetectedBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Contador de estabilización consecutiva
  const lastCandidateRef = useRef<{ id: string; count: number } | null>(null);

  const { matchBiometric, matchBiometricRemote } = useBiometrics();

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
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
            setIsScanningActive(true);
            setStatusMessage('Buscando rostros en cámara...');
          })
          .catch((playErr) => {
            console.warn('Playback manual iniciado tras fallo en play() en scanner:', playErr);
            setIsScanningActive(true);
            setStatusMessage('Buscando rostros en cámara...');
          });
      };

      video.onloadedmetadata = () => {
        playVideo();
      };

      playVideo();
    } catch (e) {
      console.error('Error al vincular el MediaStream en escáner:', e);
    }
  }, []);

  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    stopCamera();
    setInsecureContextError(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setInsecureContextError(true);
      setStatusMessage('Requiere HTTPS en móviles');
      toast.error('La cámara requiere una conexión HTTPS o localhost si estás navegando desde un celular.', { duration: 8000 });
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
        if (e1?.name === 'NotAllowedError' || e1?.name === 'SecurityError') {
          throw e1;
        }
        console.warn('Falló restricción ideal en scanner:', e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (e2: any) {
          if (e2?.name === 'NotAllowedError' || e2?.name === 'SecurityError') {
            throw e2;
          }
          console.warn('Falló restricción directa en scanner, fallback a video estándar:', e2);
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
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      const msg = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
        ? 'Permiso de cámara denegado o bloqueado por directiva de seguridad.'
        : (err instanceof Error ? err.message : 'Permiso denegado o cámara no soportada');
      toast.error(`No se pudo iniciar la cámara: ${msg}`);
      setStatusMessage('Error al iniciar la cámara');
    }
  }, [stopCamera, attachStreamToVideo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera(facingMode);
    }, 150);

    // Escuchar reconexión a Internet para auto-sincronizar asistencias tomadas offline
    const handleOnline = () => {
      syncOfflineAttendanceQueue();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  /**
   * Dispara la fase de Cooldown en ROJO con temporizador decreciente
   */
  const triggerCooldownPhase = useCallback((studentName: string, studentId: string, isAlreadyMarked = false) => {
    setScannerState('cooldown_success');
    setLastMatchName(studentName);
    setCooldownTimeLeft(2.5);

    if (!isAlreadyMarked) {
      setMatchedCount(prev => prev + 1);
      setMarkedStudentIds(prev => new Set(prev).add(studentId));

      if (!navigator.onLine) {
        queueOfflineAttendanceRecord({
          studentId,
          status: 'present',
          method: 'facial_mobile',
          timestamp: new Date().toISOString(),
        });
      } else {
        onAttendanceMarked(studentId, 'present', 'facial_mobile');
      }

      voiceFeedback.notifySuccess(studentName);
      toast.success(`¡Asistencia registrada!: ${studentName}`);
    } else {
      voiceFeedback.notifyAlreadyMarked(studentName);
      toast.info(`${studentName} ya tiene asistencia registrada hoy.`);
    }

    setStatusMessage(`¡Confirmado! ${studentName}`);

    // Animación de conteo regresivo (2.5 segundos)
    const startTime = Date.now();
    const durationMs = 2500;

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      setCooldownTimeLeft(parseFloat(remaining.toFixed(1)));

      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current!);
        // Transición: Rojo -> Amarillo -> Verde
        setScannerState('analyzing');
        setStatusMessage('Reanudando escáner...');

        setTimeout(() => {
          setScannerState('ready');
          setStatusMessage('Buscando rostros en cámara...');
          lastCandidateRef.current = null;
        }, 300);
      }
    }, 100);
  }, [onAttendanceMarked]);

  /**
   * Procesa un fotograma del video en tiempo real
   */
  const processVideoFrame = useCallback(async () => {
    if (!videoRef.current || !isScanningActive || scannerState === 'cooldown_success' || scannerState === 'cooldown_error') return;
    if (!registeredBiometrics.length) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const extracted = await extractEmbeddingFromVideo(videoRef.current, canvasRef.current);
    if (!extracted) {
      setDetectedBox(null);
      if (scannerState === 'analyzing') {
        lastCandidateRef.current = null;
        setScannerState('ready');
        setStatusMessage('Buscando rostros en cámara...');
      }
      return;
    }

    setIsLowLight(extracted.quality.isLowLight);
    if (extracted.quality.boundingBox) {
      setDetectedBox(extracted.quality.boundingBox);
    }

    // Búsqueda vectorial sub-milisegundo (con fallback a motor local)
    const match = await matchBiometricRemote(
      extracted.embedding,
      registeredBiometrics,
      students.map(s => s.id),
      0.52
    );

    if (match) {
      const student = students.find(s => s.id === match.student_id);
      if (student) {
        // Transición a estado analizando (Amarillo) sólo al detectar un candidato potencial
        if (scannerState !== 'analyzing') {
          setScannerState('analyzing');
          setStatusMessage(`Analizando coincidencia: ${student.name}...`);
        }

        // Estabilización de 2 lecturas consecutivas para evitar falsos positivos de movimiento
        if (lastCandidateRef.current?.id === student.id) {
          lastCandidateRef.current.count += 1;
        } else {
          lastCandidateRef.current = { id: student.id, count: 1 };
        }

        if (lastCandidateRef.current.count >= 2) {
          const isAlreadyMarked = markedStudentIds.has(student.id);
          triggerCooldownPhase(student.name, student.id, isAlreadyMarked);
          return;
        }
      }
    } else {
      // Rostro no reconocido o vacante
      lastCandidateRef.current = null;
      if (scannerState !== 'ready') {
        setScannerState('ready');
        setStatusMessage('Buscando rostros en cámara...');
      }
    }
  }, [isScanningActive, scannerState, registeredBiometrics, matchBiometricRemote, students, markedStudentIds, triggerCooldownPhase]);

  // Bucle de lectura continua automática
  useEffect(() => {
    if (isScanningActive && isAutoMode && scannerState !== 'cooldown_success' && scannerState !== 'cooldown_error') {
      scanTimerRef.current = setInterval(() => {
        processVideoFrame();
      }, 200);
    } else if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isScanningActive, isAutoMode, scannerState, processVideoFrame]);

  /**
   * Manejador para escaneo manual por botón
   */
  const handleManualScan = async () => {
    if (!registeredBiometrics.length) {
      toast.warning('No hay estudiantes con huella facial registrada en este curso.');
      return;
    }

    if (!videoRef.current) return;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    // Feedback visual temporal
    setScannerState('analyzing');
    setStatusMessage('Analizando captura manual...');

    const extracted = await extractEmbeddingFromVideo(videoRef.current, canvasRef.current);
    if (!extracted) {
      voiceFeedback.notifyUnrecognized();
      toast.error('No se detectó un rostro claro. Centrarse bien frente a la cámara.');
      setScannerState('ready');
      setStatusMessage('Buscando rostros en cámara...');
      return;
    }

    setIsLowLight(extracted.quality.isLowLight);
    const match = matchBiometric(extracted.embedding, registeredBiometrics, 0.48);

    if (match) {
      const student = students.find(s => s.id === match.student_id);
      if (student) {
        const isAlreadyMarked = markedStudentIds.has(student.id);
        triggerCooldownPhase(student.name, student.id, isAlreadyMarked);
        return;
      }
    }

    // Rostro detectado pero no reconocido o no coincide con los estudiantes del curso
    voiceFeedback.notifyUnrecognized();
    toast.error('Rostro no reconocido o no registrado en este curso.');
    setScannerState('ready');
    setStatusMessage('Buscando rostros en cámara...');
  };

  // Clases y colores del semáforo visual
  const getTrafficLightStyles = () => {
    switch (scannerState) {
      case 'ready':
        return {
          borderColor: 'border-emerald-400',
          glowColor: 'shadow-[0_0_50px_rgba(16,185,129,0.4)]',
          badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-700',
          iconColor: 'text-emerald-400',
          statusText: '🟢 LISTO - Aproxime estudiante',
          pulse: 'animate-pulse',
        };
      case 'analyzing':
        return {
          borderColor: 'border-amber-400',
          glowColor: 'shadow-[0_0_50px_rgba(245,158,11,0.5)]',
          badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-700',
          iconColor: 'text-amber-400',
          statusText: '🟡 ANALIZANDO ROSTRO...',
          pulse: 'animate-ping',
        };
      case 'cooldown_success':
        return {
          borderColor: 'border-rose-500 ring-4 ring-rose-500/50',
          glowColor: 'shadow-[0_0_60px_rgba(244,63,94,0.6)]',
          badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-700',
          iconColor: 'text-rose-400',
          statusText: `🔴 ASISTENCIA REGISTRADA (${cooldownTimeLeft}s)`,
          pulse: '',
        };
      default:
        return {
          borderColor: 'border-emerald-400',
          glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.3)]',
          badgeBg: 'bg-slate-900/90 text-emerald-400 border-slate-700',
          iconColor: 'text-emerald-400',
          statusText: 'LISTO',
          pulse: '',
        };
    }
  };

  const hudStyles = getTrafficLightStyles();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      {/* Cabecera Móvil */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span className="font-semibold text-lg">Escáner Facial Continuo</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch Modo Automático / Manual */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Sparkles className={`w-4 h-4 ${isAutoMode ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
            <Label htmlFor="auto-mode" className="text-xs cursor-pointer font-medium text-slate-200">
              Auto
            </Label>
            <Switch
              id="auto-mode"
              checked={isAutoMode}
              onCheckedChange={setIsAutoMode}
            />
          </div>

          <Button variant="outline" size="icon" onClick={toggleCamera} className="bg-slate-800 border-slate-700">
            <SwitchCamera className="w-5 h-5 text-white" />
          </Button>

          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Visor de Video en Tiempo Real o Alerta Insegura */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black p-4">
        {insecureContextError ? (
          <div className="max-w-md p-5 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-200 text-sm space-y-3">
            <div className="flex items-center gap-2 font-semibold text-base text-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              Conexión Insegura (HTTP) en Celular
            </div>
            <p>
              El navegador móvil impide el uso de la cámara cuando ingresas usando la IP de red local (ej. <code>http://192.168.x.x:8080</code>).
            </p>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
              <span className="font-semibold text-emerald-400">Pasos para probar en tu celular:</span>
              <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                <li>Abre Chrome en tu celular e ingresa a <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                <li>Habilita la opción y añade la dirección exacta de esta app (ej: <code>http://192.168.1.50:8080</code>).</li>
                <li>Reinicia el navegador móvil y vuelve a cargar la página.</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Banner Alerta Poca Iluminación */}
            {isLowLight && (
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-center">
                <div className="bg-amber-950/90 border border-amber-600 text-amber-200 text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-bounce">
                  <SunMedium className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Poca iluminación detectada. Mejore la luz para mayor precisión.</span>
                </div>
              </div>
            )}

            {/* Caja de Seguimiento Dinámico de Rostro (Dynamic Bounding Box) */}
            {detectedBox && videoRef.current && (
              <div
                className="absolute border-2 border-emerald-400/90 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-150 pointer-events-none z-20 flex items-start justify-start p-1.5 backdrop-blur-[1px]"
                style={{
                  left: `${Math.max(5, Math.min(85, (detectedBox.x / (videoRef.current.videoWidth || 1)) * 100))}%`,
                  top: `${Math.max(5, Math.min(85, (detectedBox.y / (videoRef.current.videoHeight || 1)) * 100))}%`,
                  width: `${Math.min(90, (detectedBox.width / (videoRef.current.videoWidth || 1)) * 100)}%`,
                  height: `${Math.min(90, (detectedBox.height / (videoRef.current.videoHeight || 1)) * 100)}%`,
                }}
              >
                <div className="bg-emerald-950/90 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-emerald-600 flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Rostro Detectado
                </div>
              </div>
            )}

            {/* Capa de Semáforo e Indicador Flotante (Reconocimiento Automático) */}
            <div className="absolute bottom-6 left-0 right-0 pointer-events-none flex flex-col items-center justify-center gap-2 z-30 px-4">
              {scannerState === 'cooldown_success' && (
                <div className="bg-rose-950/90 border border-rose-500 text-rose-200 px-4 py-2 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-5 h-5 text-rose-400" />
                  <span className="font-bold text-sm">¡Asistencia Verificada!</span>
                </div>
              )}

              {scannerState === 'analyzing' && (
                <div className="bg-amber-950/90 border border-amber-500 text-amber-200 px-4 py-2 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="font-semibold text-xs">Identificando rostro...</span>
                </div>
              )}

              {/* Placa Principal del Semáforo */}
              <div className={`px-5 py-2.5 rounded-full border text-sm font-semibold backdrop-blur-md flex items-center gap-2 shadow-xl transition-all duration-300 ${hudStyles.badgeBg}`}>
                <Volume2 className="w-4 h-4 text-slate-300 animate-pulse" />
                <span>{statusMessage}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel Inferior de Control Móvil */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Registrados en clase: <strong className="text-white">{registeredBiometrics.length}</strong></span>
          <span>Asistencias tomadas hoy: <strong className="text-emerald-400 font-bold text-sm">{matchedCount}</strong></span>
        </div>

        {lastMatchName && (
          <Card className="bg-emerald-950/80 border-emerald-700 p-3 text-emerald-200 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-sm">
                <span className="text-xs text-slate-400 block">Último estudiante verificado:</span>
                <strong className="text-emerald-100 font-semibold">{lastMatchName}</strong>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              Presente
            </Badge>
          </Card>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="lg"
            disabled={insecureContextError}
            className={`flex-1 font-semibold py-6 text-base shadow-lg transition-all ${
              isAutoMode
                ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
            onClick={handleManualScan}
          >
            <Camera className="w-5 h-5 mr-2" />
            {isAutoMode ? 'Escaneo Manual Forzado' : 'Escanear Alumno'}
          </Button>
          <Button variant="outline" size="lg" className="border-slate-700 bg-slate-800 text-white py-6" onClick={onClose}>
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
};


