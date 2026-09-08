import React, { useRef, useState, useMemo } from "react";
import {
  X,
  Volume2,
  VolumeX,
  SwitchCamera,
  CheckCircle2,
  Clock,
  Save,
  Users,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StudentBiometric } from "@/types/biometrics";
import type { AttendanceDraftMap } from "../helpers";
import type { Student } from "@/hooks/school/types";
import { ScannerOvalGuide } from "./ScannerOvalGuide";
import { ScannerFeedbackOverlay } from "./ScannerFeedbackOverlay";
import { useClassLivenessScanner } from "./useClassLivenessScanner";

interface ClassFacialScannerModalProps {
  classContext: {
    grade_name: string;
    subject_name: string;
    teacher_name: string;
  };
  draftMap: AttendanceDraftMap;
  onClose: () => void;
  onMarkStudent: (studentId: string, status: "present") => void;
  onMarkUnmarkedAsAbsent: () => void;
  onSaveAndClose: () => void;
  registeredBiometrics: StudentBiometric[];
  students: Student[];
}

export const ClassFacialScannerModal: React.FC<ClassFacialScannerModalProps> = ({
  classContext,
  draftMap,
  onClose,
  onMarkStudent,
  onMarkUnmarkedAsAbsent,
  onSaveAndClose,
  registeredBiometrics,
  students,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const studentList = useMemo(
    () => students.map((s) => ({ id: s.id, name: s.full_name })),
    [students]
  );

  const alreadyRegisteredIds = useMemo(
    () =>
      new Set(
        students
          .filter((s) => draftMap[s.id]?.status === "present")
          .map((s) => s.id)
      ),
    [students, draftMap]
  );

  const {
    blinkPhase,
    distanceStatus,
    earValue,
    instructionText,
    lastMatch,
    scannerState,
    toggleFacingMode,
  } = useClassLivenessScanner({
    alreadyRegisteredIds,
    canvasRef,
    isActive: true,
    onMatch: (studentId) => onMarkStudent(studentId, "present"),
    registeredBiometrics,
    students: studentList,
    videoRef,
  });

  const presentCount = useMemo(
    () => students.filter((s) => draftMap[s.id]?.status === "present").length,
    [students, draftMap]
  );

  const percentPresent = students.length
    ? Math.round((presentCount / students.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4 backdrop-blur-md">
      <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        {/* Encabezado del Escáner de Materia */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-white">
                  {classContext.subject_name}
                </h3>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {classContext.grade_name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Profesor(a): {classContext.teacher_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="hidden gap-1.5 bg-emerald-500/15 text-emerald-300 sm:flex"
            >
              <Users className="h-3.5 w-3.5" />
              {presentCount} de {students.length} ({percentPresent}%)
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted((prev) => !prev)}
              className="text-white hover:bg-white/10"
              title={isMuted ? "Activar audio" : "Silenciar audio"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFacingMode}
              className="text-white hover:bg-white/10"
              title="Cambiar cámara"
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Cuerpo Principal: Cámara (Izquierda) + Nómina en Vivo (Derecha) */}
        <div className="grid flex-1 overflow-hidden lg:grid-cols-12">
          {/* Zona de Cámara con Óvalo Guía */}
          <div className="relative flex items-center justify-center bg-black lg:col-span-8">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Óvalo de enfoque inspirado en Software-Asistencia */}
            <ScannerOvalGuide
              state={scannerState}
              distanceStatus={distanceStatus}
              instructionText={instructionText}
              earValue={earValue}
              blinkPhase={blinkPhase}
            />

            {/* Notificación emergente al detectar un alumno */}
            <ScannerFeedbackOverlay lastMatch={lastMatch} isMuted={isMuted} />
          </div>

          {/* Panel Lateral: Nómina en Vivo de la Materia */}
          <div className="flex flex-col border-t border-white/10 bg-slate-900/40 lg:col-span-4 lg:border-l lg:border-t-0">
            <div className="border-b border-white/10 p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Estudiantes de la Clase ({students.length})
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
              {students.map((student) => {
                const isPresent = draftMap[student.id]?.status === "present";
                const isAbsent = draftMap[student.id]?.status === "absent";
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between rounded-xl p-2.5 transition-colors ${
                      isPresent
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : isAbsent
                        ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                        : "border border-white/5 bg-white/5 text-slate-300"
                    }`}
                  >
                    <span className="truncate text-sm font-medium">
                      {student.full_name}
                    </span>
                    {isPresent ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Presente
                      </span>
                    ) : isAbsent ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                        <XCircle className="h-4 w-4" /> Ausente
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Pendiente
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Acciones de Cierre de Asistencia */}
            <div className="space-y-2 border-t border-white/10 bg-slate-950/60 p-3.5">
              <Button
                variant="outline"
                onClick={onMarkUnmarkedAsAbsent}
                className="w-full gap-2 border-white/10 text-xs hover:bg-white/5"
              >
                <XCircle className="h-4 w-4 text-rose-400" />
                Sin marcar a ausente
              </Button>

              <Button
                onClick={onSaveAndClose}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Save className="h-4 w-4" />
                Guardar y Cerrar Clase
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
