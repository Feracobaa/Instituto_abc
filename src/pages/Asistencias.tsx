import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardCheck, Loader2, Lock, Save } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAcademicPeriods,
  useAttendanceClassContexts,
  useAttendanceStudents,
  useSaveStudentAttendance,
  useStudentAttendance,
  type AttendanceStatus,
} from "@/hooks/useSchoolData";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import {
  buildAttendanceDraftFromData,
  buildAttendanceSaveRows,
  isDateWithinPeriod,
  type AttendanceDraftMap,
} from "@/features/asistencias/helpers";

const STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus }> = [
  { label: "Presente", value: "present" },
  { label: "Ausente", value: "absent" },
  { label: "Justificada", value: "justified" },
];

const EMPTY_STATUS_VALUE = "__empty__";

function buildTodayISODate() {
  return new Date().toISOString().split("T")[0];
}

const Asistencias = () => {
  const { toast } = useToast();
  const { teacherId, userRole } = useAuth();
  const isRector = userRole === "rector";

  const [selectedDate, setSelectedDate] = useState(buildTodayISODate);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [draftMap, setDraftMap] = useState<AttendanceDraftMap>({});

  const periodsQuery = useAcademicPeriods();
  const classContextsQuery = useAttendanceClassContexts({
    date: selectedDate,
    teacherId: isRector ? undefined : teacherId || undefined,
  });

  const periods = periodsQuery.data;
  const allClassContexts = useMemo(
    () => classContextsQuery.data ?? [],
    [classContextsQuery.data],
  );

  const activePeriod = periods?.find((period) => period.is_active) ?? null;
  const canEditDate = isDateWithinPeriod(selectedDate, activePeriod);

  const teacherOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();

    allClassContexts.forEach((context) => {
      if (!optionsMap.has(context.teacher_id)) {
        optionsMap.set(context.teacher_id, {
          id: context.teacher_id,
          name: context.teacher_name,
        });
      }
    });

    return [...optionsMap.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [allClassContexts]);

  useEffect(() => {
    if (!isRector && teacherId) {
      setSelectedTeacher(teacherId);
      return;
    }

    if (isRector && !selectedTeacher && teacherOptions.length === 1) {
      setSelectedTeacher(teacherOptions[0].id);
    }
  }, [isRector, selectedTeacher, teacherId, teacherOptions]);

  useEffect(() => {
    if (isRector && selectedTeacher && !teacherOptions.some((option) => option.id === selectedTeacher)) {
      setSelectedTeacher("");
    }
  }, [isRector, selectedTeacher, teacherOptions]);

  const teacherScopedContexts = useMemo(() => {
    if (!isRector) {
      return allClassContexts;
    }

    if (!selectedTeacher) {
      return allClassContexts;
    }

    return allClassContexts.filter((context) => context.teacher_id === selectedTeacher);
  }, [allClassContexts, isRector, selectedTeacher]);

  const gradeOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();

    teacherScopedContexts.forEach((context) => {
      if (!optionsMap.has(context.grade_id)) {
        optionsMap.set(context.grade_id, {
          id: context.grade_id,
          name: context.grade_name,
        });
      }
    });

    return [...optionsMap.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [teacherScopedContexts]);

  useEffect(() => {
    if (selectedGrade && !gradeOptions.some((option) => option.id === selectedGrade)) {
      setSelectedGrade("");
      setSelectedSubject("");
    }
  }, [selectedGrade, gradeOptions]);

  const gradeScopedContexts = useMemo(() => {
    if (!selectedGrade) {
      return teacherScopedContexts;
    }

    return teacherScopedContexts.filter((context) => context.grade_id === selectedGrade);
  }, [selectedGrade, teacherScopedContexts]);

  const subjectOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; name: string }>();

    gradeScopedContexts.forEach((context) => {
      if (!optionsMap.has(context.subject_id)) {
        optionsMap.set(context.subject_id, {
          id: context.subject_id,
          name: context.subject_name,
        });
      }
    });

    return [...optionsMap.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [gradeScopedContexts]);

  useEffect(() => {
    if (selectedSubject && !subjectOptions.some((option) => option.id === selectedSubject)) {
      setSelectedSubject("");
    }
  }, [selectedSubject, subjectOptions]);

  const effectiveTeacherId = isRector ? selectedTeacher : teacherId || "";

  const selectedContext = useMemo(() => {
    if (!selectedGrade || !selectedSubject || !effectiveTeacherId) {
      return null;
    }

    return (
      allClassContexts.find(
        (context) =>
          context.grade_id === selectedGrade
          && context.subject_id === selectedSubject
          && context.teacher_id === effectiveTeacherId,
      ) ?? null
    );
  }, [allClassContexts, effectiveTeacherId, selectedGrade, selectedSubject]);

  const studentsQuery = useAttendanceStudents(selectedContext?.grade_id);
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);

  const attendanceQuery = useStudentAttendance(
    selectedContext
      ? {
          date: selectedDate,
          gradeId: selectedContext.grade_id,
          subjectId: selectedContext.subject_id,
          teacherId: selectedContext.teacher_id,
        }
      : undefined,
  );

  const attendanceRecords = useMemo(
    () => attendanceQuery.data ?? [],
    [attendanceQuery.data],
  );

  const contextKey = selectedContext
    ? `${selectedDate}|${selectedContext.grade_id}|${selectedContext.subject_id}|${selectedContext.teacher_id}`
    : "";

  useEffect(() => {
    if (!selectedContext) {
      setDraftMap({});
      return;
    }

    setDraftMap(buildAttendanceDraftFromData(students, attendanceRecords));
  }, [attendanceRecords, contextKey, selectedContext, students]);

  const saveAttendance = useSaveStudentAttendance();

  const pageError =
    periodsQuery.error
    || classContextsQuery.error
    || studentsQuery.error
    || attendanceQuery.error;

  const isLoading =
    periodsQuery.isLoading
    || classContextsQuery.isLoading
    || studentsQuery.isLoading
    || attendanceQuery.isLoading;

  const setDraftStatus = (studentId: string, status: AttendanceStatus | "") => {
    setDraftMap((previous) => ({
      ...previous,
      [studentId]: {
        justification_note:
          status === "justified"
            ? (previous[studentId]?.justification_note ?? "")
            : "",
        status,
      },
    }));
  };

  const setDraftNote = (studentId: string, value: string) => {
    setDraftMap((previous) => ({
      ...previous,
      [studentId]: {
        justification_note: value,
        status: previous[studentId]?.status ?? "",
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedContext) {
      toast({
        description: "Selecciona docente, grado y materia para continuar.",
        title: "Faltan filtros",
        variant: "destructive",
      });
      return;
    }

    if (!canEditDate) {
      toast({
        description: "Solo puedes editar asistencia para fechas dentro del periodo academico activo.",
        title: "Fecha en modo solo lectura",
        variant: "destructive",
      });
      return;
    }

    const { missingStudentIds, rows } = buildAttendanceSaveRows(students, draftMap);

    if (missingStudentIds.length > 0) {
      toast({
        description: "Debes marcar estado para todos los estudiantes antes de guardar.",
        title: "Lista incompleta",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveAttendance.mutateAsync({
        attendance_date: selectedDate,
        grade_id: selectedContext.grade_id,
        rows,
        subject_id: selectedContext.subject_id,
        teacher_id: selectedContext.teacher_id,
      });
    } catch (error) {
      toast({
        description: getFriendlyErrorMessage(error),
        title: "No fue posible guardar la asistencia",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Asistencias</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Registro diario por fecha, grado y materia para profesores y rectoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-44"
          />

          {isRector && (
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Seleccionar docente" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Seleccionar grado" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Seleccionar materia" />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedContext && (
            <div className="rounded-md border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">
              Docente: <span className="font-semibold text-foreground">{selectedContext.teacher_name}</span>
            </div>
          )}
        </div>

        {pageError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No fue posible cargar el modulo</AlertTitle>
            <AlertDescription>{getFriendlyErrorMessage(pageError)}</AlertDescription>
          </Alert>
        )}

        {selectedContext && !canEditDate && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Fecha en solo lectura</AlertTitle>
            <AlertDescription>
              La asistencia solo se puede editar para fechas dentro del periodo academico activo.
            </AlertDescription>
          </Alert>
        )}

        {!selectedDate ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Selecciona una fecha"
            description="Elige la fecha para listar las clases programadas."
          />
        ) : isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allClassContexts.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Sin clases programadas"
            description="No hay clases academicas programadas para la fecha seleccionada."
          />
        ) : !selectedContext ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Selecciona docente, grado y materia"
            description="Debes elegir un contexto de clase para cargar la asistencia."
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Sin estudiantes activos"
            description="El grado seleccionado no tiene estudiantes activos para registrar asistencia."
          />
        ) : (
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {students.length} estudiante{students.length !== 1 ? "s" : ""} en lista.
              </div>
              <Button
                onClick={handleSave}
                disabled={saveAttendance.isPending || !canEditDate}
                className="gap-2"
              >
                {saveAttendance.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar asistencia
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Estudiante</TableHead>
                    <TableHead className="w-[210px] font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Nota (opcional si justificada)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const draft = draftMap[student.id] ?? {
                      justification_note: "",
                      status: "" as AttendanceStatus | "",
                    };

                    const statusSelectValue = draft.status || EMPTY_STATUS_VALUE;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>
                          <Select
                            value={statusSelectValue}
                            onValueChange={(nextValue) => {
                              if (nextValue === EMPTY_STATUS_VALUE) {
                                setDraftStatus(student.id, "");
                                return;
                              }

                              setDraftStatus(student.id, nextValue as AttendanceStatus);
                            }}
                            disabled={!canEditDate || saveAttendance.isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY_STATUS_VALUE}>Seleccionar estado</SelectItem>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft.justification_note}
                            onChange={(event) => setDraftNote(student.id, event.target.value)}
                            placeholder="Motivo de justificacion"
                            disabled={
                              !canEditDate
                              || saveAttendance.isPending
                              || draft.status !== "justified"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Asistencias;
