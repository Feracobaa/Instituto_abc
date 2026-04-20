import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Lock,
  Save,
  UserRound,
  XCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { cn } from "@/lib/utils";
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

const STATUS_META: Record<
  AttendanceStatus,
  {
    badgeClass: string;
    buttonClass: string;
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  present: {
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    buttonClass: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
    icon: CheckCircle2,
    label: "Presente",
  },
  absent: {
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    buttonClass: "border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
    icon: XCircle,
    label: "Ausente",
  },
  justified: {
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    buttonClass: "border-amber-600 bg-amber-600 text-white hover:bg-amber-700",
    icon: AlertCircle,
    label: "Justificada",
  },
};

const EMPTY_STATUS_VALUE = "__empty__";

function buildTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const Asistencias = () => {
  const { toast } = useToast();
  const { teacherId, userRole } = useAuth();
  const isMobile = useIsMobile();
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

  const attendanceSummary = useMemo(() => {
    const summary = {
      present: 0,
      absent: 0,
      justified: 0,
      pending: 0,
    };

    students.forEach((student) => {
      const status = draftMap[student.id]?.status;
      if (!status) {
        summary.pending += 1;
        return;
      }

      summary[status] += 1;
    });

    return summary;
  }, [draftMap, students]);

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

  const getStatusLabel = (status: AttendanceStatus | "") => {
    if (!status) return "Sin marcar";
    return STATUS_META[status].label;
  };

  const getStatusBadgeClass = (status: AttendanceStatus | "") => {
    if (!status) {
      return "border-slate-200 bg-slate-50 text-slate-600";
    }

    return STATUS_META[status].badgeClass;
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

    if (!selectedContext.is_scheduled_for_selected_date) {
      toast({
        description: "No hay clase programada para ese docente, grado y materia en la fecha seleccionada.",
        title: "Clase no programada",
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
        <div className="rounded-2xl border bg-gradient-to-br from-background via-background to-muted/60 p-5 shadow-card">
          <h1 className="font-heading text-2xl font-bold text-foreground">Asistencias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro diario por fecha, grado y materia para profesores y rectoria.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full"
              />
            </div>

            {isRector && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Docente</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-full">
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
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grado</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Materia</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full">
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
            </div>
          </div>

          {selectedContext && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4 text-primary" />
                <span>Docente: <span className="font-semibold text-foreground">{selectedContext.teacher_name}</span></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>Grado: <span className="font-semibold text-foreground">{selectedContext.grade_name}</span></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground sm:col-span-2 xl:col-span-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Materia: <span className="font-semibold text-foreground">{selectedContext.subject_name}</span></span>
              </div>
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

        {selectedContext && canEditDate && !selectedContext.is_scheduled_for_selected_date && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin clase programada ese dia</AlertTitle>
            <AlertDescription>
              El docente tiene asignada esta materia en el grado, pero no hay bloque de horario en la
              fecha seleccionada.
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
            title="Sin clases asignadas"
            description="No hay materias academicas asignadas para el docente seleccionado."
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
          <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{students.length} estudiante{students.length !== 1 ? "s" : ""} en lista</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Presentes: {attendanceSummary.present}
                  </Badge>
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Ausentes: {attendanceSummary.absent}
                  </Badge>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    Justificadas: {attendanceSummary.justified}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    Sin marcar: {attendanceSummary.pending}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={
                  saveAttendance.isPending
                  || !canEditDate
                  || !selectedContext.is_scheduled_for_selected_date
                }
                className={cn("gap-2", isMobile && "w-full")}
              >
                {saveAttendance.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar asistencia
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-3">
                {students.map((student) => {
                  const draft = draftMap[student.id] ?? {
                    justification_note: "",
                    status: "" as AttendanceStatus | "",
                  };

                  return (
                    <div key={student.id} className="rounded-xl border bg-background p-3 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{student.full_name}</p>
                        <Badge variant="outline" className={cn("whitespace-nowrap", getStatusBadgeClass(draft.status))}>
                          {getStatusLabel(draft.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {STATUS_OPTIONS.map((option) => {
                          const isActive = draft.status === option.value;
                          const Icon = STATUS_META[option.value].icon;

                          return (
                            <Button
                              key={`${student.id}-${option.value}`}
                              type="button"
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className={cn("h-9 px-2 text-[11px]", isActive && STATUS_META[option.value].buttonClass)}
                              onClick={() => setDraftStatus(student.id, option.value)}
                              disabled={!canEditDate || saveAttendance.isPending}
                            >
                              <Icon className="mr-1 h-3.5 w-3.5" />
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>

                      <div className="mt-3">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Estudiante</TableHead>
                      <TableHead className="w-[220px] font-semibold">Estado</TableHead>
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
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <p>{student.full_name}</p>
                              <Badge variant="outline" className={cn("w-fit", getStatusBadgeClass(draft.status))}>
                                {getStatusLabel(draft.status)}
                              </Badge>
                            </div>
                          </TableCell>
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
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Asistencias;
