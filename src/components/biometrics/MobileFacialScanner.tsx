import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, SwitchCamera, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CameraFacingMode, StudentBiometric } from '@/types/biometrics';
import { useBiometrics } from '@/hooks/school/useBiometrics';
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

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [insecureContextError, setInsecureContextError] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando cámara...');
  const [lastMatchName, setLastMatchName] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);

  const { matchBiometric } = useBiometrics();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
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
            setIsScanning(true);
            setStatusMessage('Posicione el rostro dentro del óvalo');
          })
          .catch((playErr) => {
            console.warn('Playback manual iniciado tras fallo en play() en scanner:', playErr);
            setIsScanning(true);
            setStatusMessage('Posicione el rostro dentro del óvalo');
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
      } catch (e1) {
        console.warn('Falló restricción ideal en scanner:', e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (e2) {
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
    } catch (err: unknown) {
      console.error('Error al acceder a la cámara:', err);
      const msg = err instanceof Error ? err.message : 'Permiso denegado o cámara no soportada';
      toast.error(`No se pudo iniciar la cámara: ${msg}`);
      setStatusMessage('Error al iniciar la cámara');
    }
  }, [stopCamera, attachStreamToVideo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera(facingMode);
    }, 150);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleSimulateScan = () => {
    if (!registeredBiometrics.length) {
      toast.warning('No hay estudiantes con huella facial registrada en este curso.');
      return;
    }

    const randomBio = registeredBiometrics[Math.floor(Math.random() * registeredBiometrics.length)];
    const student = students.find(s => s.id === randomBio.student_id);

    if (student) {
      const match = matchBiometric(randomBio.embedding, registeredBiometrics, 0.50);
      if (match && match.student_id === student.id) {
        setLastMatchName(student.name);
        setMatchedCount(prev => prev + 1);
        setStatusMessage(`¡Verificado! ${student.name}`);
        onAttendanceMarked(student.id, 'present', 'facial_mobile');
        toast.success(`Asistencia facial registrada: ${student.name}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      {/* Cabecera Móvil */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span className="font-semibold text-lg">Escaner Facial Móvil</span>
        </div>
        <div className="flex items-center gap-2">
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
                <li>Habilita la opción y añade la dirección exact de esta app (ej: <code>http://192.168.1.50:8080</code>).</li>
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

            {/* Capa Guía del Óvalo Facial */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-80 rounded-[50%] border-4 border-dashed border-emerald-400/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center animate-pulse">
                <div className="text-center p-4 bg-black/40 rounded-full backdrop-blur-sm">
                  <Camera className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
                </div>
              </div>
              <div className="mt-6 px-4 py-2 bg-slate-900/90 rounded-full border border-slate-700 text-sm font-medium text-emerald-400 backdrop-blur-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {statusMessage}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel Inferior de Control Móvil */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Registrados en clase: <strong className="text-white">{registeredBiometrics.length}</strong></span>
          <span>Escaneados hoy: <strong className="text-emerald-400">{matchedCount}</strong></span>
        </div>

        {lastMatchName && (
          <Card className="bg-emerald-950/60 border-emerald-800 p-3 text-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-sm">
              <strong>Última marcación:</strong> {lastMatchName}
            </div>
          </Card>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="lg"
            disabled={insecureContextError}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-6 text-base shadow-lg shadow-emerald-900/30"
            onClick={handleSimulateScan}
          >
            <Camera className="w-5 h-5 mr-2" />
            Escanear Alumno
          </Button>
          <Button variant="outline" size="lg" className="border-slate-700 bg-slate-800 text-white py-6" onClick={onClose}>
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
};

