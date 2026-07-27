import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, SwitchCamera, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Posicione el rostro dentro del óvalo');
  const [lastMatchName, setLastMatchName] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);

  const { matchBiometric } = useBiometrics();

  // Iniciar cámara
  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      toast.error('No se pudo acceder a la cámara del dispositivo.');
      setStatusMessage('Error de cámara');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Simular escaneo de fotogramas y detección
  const handleSimulateScan = () => {
    if (!registeredBiometrics.length) {
      toast.warning('No hay estudiantes con huella facial registrada en este curso.');
      return;
    }

    // Seleccionar aleatoriamente o por simulación a un estudiante registrado para la demo de aula
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

      {/* Visor de Video en Tiempo Real */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
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
