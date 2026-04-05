import { MainLayout } from "@/components/layout/MainLayout";
import { useSubjects, useTeachers, useStudents, useGradeRecords, useSchedules } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Loader2, Calculator, FlaskConical, Languages, Music,
  Palette, Globe, Heart, Dumbbell, Computer, Microscope, Plus
} from "lucide-react";
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

  const { userRole, teacherId } = useAuth();
  const isRector = userRole === 'rector';
  const [dialogOpen, setDialogOpen] = useState(false);

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
    if (subject && !(subject as any).parent_id) {
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
            <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
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
            const parentId = (subject as any).parent_id;
            const parentSubject = parentId ? subjects?.find(s => s.id === parentId) : null;
            const SubjectIcon = getSubjectIcon(parentSubject ? parentSubject.name : subject.name);

            return (
              <div
                key={subject.id}
                className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up hover-lift flex flex-col"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Colored header with icon */}
                <div className={cn("p-5 flex items-center justify-between", subject.color)}>
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
        />
      )}
    </MainLayout>
  );
};

export default Materias;
