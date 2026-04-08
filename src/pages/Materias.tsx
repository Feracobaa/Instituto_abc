import { MainLayout } from "@/components/layout/MainLayout";
import { useSubjects, useTeachers, useStudents, useGradeRecords, useSchedules, useAcademicPeriods } from "@/hooks/useSchoolData";
import type { AcademicPeriod, Grade, Subject } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Loader2, Calculator, FlaskConical, Languages, Music,
  Palette, Globe, Heart, Dumbbell, Computer, Microscope, Plus, Pencil,
  ClipboardList, FileText
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Assign icon by subject name keywords
const getSubjectIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('mat') || lower.includes('aritmét') || lower.includes('álgebr')) return Calculator;
  if (lower.includes('física') || lower.includes('quím') || lower.includes('cien')) return FlaskConical;
  if (lower.includes('biol') || lower.includes('natur')) return Microscope;
  if (lower.includes('español') || lower.includes('leng') || lower.includes('liter') || lower.includes('cast')) return Languages;
  if (lower.includes('mús') || lower.includes('armon')) return Music;
  if (lower.includes('arte') || lower.includes('plást') || lower.includes('dibujo')) return Palette;
  if (lower.includes('social') || lower.includes('geogr') || lower.includes('histor')) return Globe;
  if (lower.includes('ética') || lower.includes('religi') || lower.includes('moral')) return Heart;
  if (lower.includes('educ') && lower.includes('fís')) return Dumbbell;
  if (lower.includes('inform') || lower.includes('comput') || lower.includes('tecno')) return Computer;
  return BookOpen;
};

const Materias = () => {
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: students } = useStudents();
  const { data: gradeRecords } = useGradeRecords();
  const { data: schedules } = useSchedules();
  const { data: academicPeriods } = useAcademicPeriods();

  const { userRole, teacherId } = useAuth();
  const isRector = userRole === 'rector';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const currentDate = new Date();
  const activePeriod = academicPeriods?.find((p: AcademicPeriod) => {
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    return currentDate >= start && currentDate <= end;
  }) || academicPeriods?.find((p: AcademicPeriod) => p.is_active);
  const activePeriodName = activePeriod?.name || academicPeriods?.[0]?.name || `1 Bimestre`;
  const currentTeacher = teachers?.find(t => t.id === teacherId);

  // Calcula estudiantes de manera híbrida para mejor Experiencia de Usuario:
  // 1. Si la materia ya está en algún horario, cuenta matemáticamente los niños de esos salones.
  // 2. Si no tiene horarios aún, pero es una materia principal (sin padre), asume que es de Primaria (1 a 5).
  // 3. Si es una sub-materia (ej. Pre-escritura) y no tiene horario, muestra 0.
  const getStudentCountForSubject = (subjectId: string) => {
    if (!students) return 0;
    
    let relevantSchedules = schedules?.filter(s => s.subject_id === subjectId) || [];
    if (!isRector) {
      relevantSchedules = relevantSchedules.filter(s => s.teacher_id === teacherId);
    }
    const scheduledGradeIds = new Set(relevantSchedules.map(s => s.grade_id));
    
    if (scheduledGradeIds.size > 0) {
      return students.filter(s => s.grade_id && scheduledGradeIds.has(s.grade_id)).length;
    }
    
    const subject = subjects?.find(s => s.id === subjectId);
    if (subject && !subject.parent_id) {
      if (!isRector) return 0; // Un profesor solo debería ver números si tiene horario asignado
      return students.filter(s => s.grades && s.grades.level >= 1 && s.grades.level <= 5).length;
    }
    
    return 0;
  };

  const getTeachersForSubject = (subjectId: string) => {
    let subjectTeachers = teachers?.filter(t => t.teacher_subjects?.some(ts => ts.subject_id === subjectId)) || [];
    if (!isRector) {
      subjectTeachers = subjectTeachers.filter(t => t.id === teacherId);
    }
    return subjectTeachers;
  };

  const visibleSubjects = isRector 
    ? subjects 
    : subjects?.filter(s => getTeachersForSubject(s.id).some(t => t.id === teacherId));

  const getSubjectAvg = (subjectId: string) => {
    let records = gradeRecords?.filter(r => r.subject_id === subjectId) ?? [];
    if (!isRector) {
      records = records.filter(r => r.teacher_id === teacherId);
    }
    if (records.length === 0) return null;
    return records.reduce((a, r) => a + r.grade, 0) / records.length;
  };

  const getAvgColor = (avg: number | null) => {
    if (avg === null) return 'text-muted-foreground';
    if (avg >= 4) return 'text-success';
    if (avg >= 3) return 'text-warning';
    return 'text-destructive';
  };

  const handleDownloadAttendance = async (
    gradeName: string,
    teacherName: string,
    subjectName: string,
    gradeId: string,
  ) => {
    const studs = students?.filter((student) => student.grade_id === gradeId) || [];
    const { downloadAttendanceListPDF } = await import("@/utils/pdfGenerator");
    await downloadAttendanceListPDF(gradeName, studs, activePeriodName, teacherName, subjectName);
  };

  const handleDownloadGradingTemplate = async (
    gradeName: string,
    teacherName: string,
    subjectName: string,
    gradeId: string,
  ) => {
    const studs = students?.filter((student) => student.grade_id === gradeId) || [];
    const { downloadGradingTemplatePDF } = await import("@/utils/pdfGenerator");
    await downloadGradingTemplatePDF(gradeName, studs, activePeriodName, teacherName, subjectName);
  };

  const isLoading = subjectsLoading || teachersLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Materias</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {visibleSubjects?.length || 0} materia{(visibleSubjects?.length || 0) !== 1 ? 's' : ''} visible{(visibleSubjects?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          {isRector && (
            <Button onClick={() => { setSelectedSubject(null); setDialogOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Nueva Materia
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleSubjects?.map((subject, index) => {
            const subjectTeachers = getTeachersForSubject(subject.id);
            const avg = getSubjectAvg(subject.id);
            const studentCount = getStudentCountForSubject(subject.id);
            const parentId = subject.parent_id;
            const parentSubject = parentId ? subjects?.find(s => s.id === parentId) : null;
            const SubjectIcon = getSubjectIcon(parentSubject ? parentSubject.name : subject.name);

            return (
              <div
                key={subject.id}
                className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up hover-lift flex flex-col"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Colored header with icon */}
                <div className={cn("p-5 flex items-center justify-between relative", subject.color)}>
                  {isRector && (
                    <button 
                      onClick={() => { setSelectedSubject(subject); setDialogOpen(true); }}
                      className="absolute top-3 right-3 text-white/60 hover:text-white hover:bg-white/20 p-1.5 rounded-md transition-colors"
                      title="Editar materia"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <SubjectIcon className="w-6 h-6 text-white" />
                  </div>
                  {avg !== null && (
                    <div className="text-right">
                      <p className="text-[11px] text-white/65 font-medium">Promedio</p>
                      <p className="text-2xl font-bold text-white">{avg.toFixed(1)}</p>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="mb-4">
                    {parentSubject && (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-1 block">
                        Rama de {parentSubject.name}
                      </span>
                    )}
                    <h3 className="font-bold text-foreground text-base leading-tight">{subject.name}</h3>
                  </div>

                  {/* Teachers */}
                  <div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Profesor{subjectTeachers.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {subjectTeachers.length > 0 ? (
                      <div className="space-y-1">
                        {subjectTeachers.map((teacher) => (
                          <p key={teacher.id} className="text-sm text-foreground truncate">{teacher.full_name}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin asignar</p>
                    )}
                  </div>

                  {/* Bottom stats */}
                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground" title="Alumnos inscritos según horarios">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">{studentCount} alum.</span>
                    </div>
                    {avg !== null && (
                      <span className={cn("text-xs font-bold", getAvgColor(avg))}>
                        {avg >= 4 ? '✓ Buen nivel' : avg >= 3 ? '⚠ Promedio' : '✗ Bajo nivel'}
                      </span>
                    )}
                  </div>

                  {/* PDF Actions */}
                  {(() => {
                    const gradeIdsForSubject = Array.from(new Set(
                      (schedules || [])
                        .filter(s => s.subject_id === subject.id && (isRector || s.teacher_id === teacherId))
                        .map(s => s.grade_id)
                    ));
                    const activeGradesForSubject = gradeIdsForSubject
                      .map((id) => (schedules || []).find((schedule) => schedule.grade_id === id)?.grades)
                      .filter((grade): grade is Grade => Boolean(grade));

                    if (activeGradesForSubject.length === 0) return null;

                    const pdfTeacherName = isRector 
                      ? (subjectTeachers.length > 0 ? subjectTeachers[0].full_name : '')
                      : (currentTeacher?.full_name || '');

                    return (
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                        {activeGradesForSubject.length === 1 ? (
                          <div className="flex gap-2 w-full">
                            <button onClick={() => {
                              const g = activeGradesForSubject[0];
                              void handleDownloadAttendance(g.name, pdfTeacherName, subject.name, g.id);
                            }} className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-semibold p-2 bg-secondary/30 hover:bg-secondary/70 rounded-md transition-colors text-foreground">
                              <ClipboardList className="w-3.5 h-3.5 text-primary" /> Asistencia
                            </button>
                            <button onClick={() => {
                              const g = activeGradesForSubject[0];
                              void handleDownloadGradingTemplate(g.name, pdfTeacherName, subject.name, g.id);
                            }} className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-semibold p-2 bg-secondary/30 hover:bg-secondary/70 rounded-md transition-colors text-foreground">
                              <FileText className="w-3.5 h-3.5 text-primary" /> Notas
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex-1 flex justify-center items-center gap-1 text-[11px] font-semibold p-2 bg-secondary/30 hover:bg-secondary/70 rounded-md transition-colors text-foreground">
                                  <ClipboardList className="w-3.5 h-3.5 text-primary" /> Asistencia ▼
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {activeGradesForSubject.map((g) => (
                                  <DropdownMenuItem key={g.id} onClick={() => {
                                    void handleDownloadAttendance(g.name, pdfTeacherName, subject.name, g.id);
                                  }}>
                                    Grado {g.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex-1 flex justify-center items-center gap-1 text-[11px] font-semibold p-2 bg-secondary/30 hover:bg-secondary/70 rounded-md transition-colors text-foreground">
                                  <FileText className="w-3.5 h-3.5 text-primary" /> Notas ▼
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {activeGradesForSubject.map((g) => (
                                  <DropdownMenuItem key={g.id} onClick={() => {
                                    void handleDownloadGradingTemplate(g.name, pdfTeacherName, subject.name, g.id);
                                  }}>
                                    Grado {g.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isRector && (
        <SubjectFormDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          subject={selectedSubject}
        />
      )}
    </MainLayout>
  );
};

export default Materias;
