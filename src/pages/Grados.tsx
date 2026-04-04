import { MainLayout } from "@/components/layout/MainLayout";
import { useGrades, useStudents, useGradeRecords } from "@/hooks/useSchoolData";
import { GraduationCap, Users, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const getBarColor = (avg: number | null) => {
  if (avg === null || avg === 0) return 'bg-muted-foreground/20';
  if (avg >= 4) return 'bg-success';
  if (avg >= 3) return 'bg-warning';
  return 'bg-destructive';
};

const getAvgLabel = (avg: number | null) => {
  if (avg === null) return '—';
  if (avg >= 4.5) return 'Superior';
  if (avg >= 4) return 'Alto';
  if (avg >= 3) return 'Básico';
  if (avg >= 2) return 'Bajo';
  return 'Muy bajo';
};

const Grados = () => {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: gradeRecords } = useGradeRecords();
  const navigate = useNavigate();

  const getStudentCount = (gradeId: string) =>
    students?.filter(s => s.grade_id === gradeId).length || 0;

  const getStudentsByGrade = (gradeId: string) =>
    students?.filter(s => s.grade_id === gradeId) || [];

  const getGradeAvg = (gradeId: string) => {
    const gradeStudentIds = students?.filter(s => s.grade_id === gradeId).map(s => s.id) ?? [];
    const records = gradeRecords?.filter(r => gradeStudentIds.includes(r.student_id)) ?? [];
    if (records.length === 0) return null;
    return records.reduce((a, r) => a + r.grade, 0) / records.length;
  };

  const isLoading = gradesLoading || studentsLoading;

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
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Grados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {grades?.length || 0} grado{(grades?.length || 0) !== 1 ? 's' : ''} configurado{(grades?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {grades?.map((grade, index) => {
            const avg = getGradeAvg(grade.id);
            const count = getStudentCount(grade.id);
            const preview = getStudentsByGrade(grade.id).slice(0, 3);

            return (
              <div
                key={grade.id}
                className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up hover-lift"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {/* Grade header with gradient */}
                <div className="gradient-primary p-5 text-primary-foreground">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white/65 uppercase tracking-wider mb-1">
                        Grado {grade.level}
                      </p>
                      <h3 className="text-3xl font-bold font-heading">{grade.name}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Avg progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/70 font-medium">Promedio</span>
                      <span className="text-sm font-bold">
                        {avg !== null ? `${avg.toFixed(1)} · ${getAvgLabel(avg)}` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/70 transition-all duration-700"
                        style={{ width: avg !== null ? `${(avg / 5) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5">
                  <button
                    onClick={() => navigate('/estudiantes')}
                    className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors mb-3 group"
                  >
                    <Users className="w-4 h-4" />
                    <span>{count} estudiante{count !== 1 ? 's' : ''}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Student preview */}
                  <div className="space-y-1.5">
                    {preview.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/50"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{student.full_name}</span>
                      </div>
                    ))}
                    {count > 3 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{count - 3} más estudiantes
                      </p>
                    )}
                    {count === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Sin estudiantes</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Grados;
