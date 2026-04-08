import { MainLayout } from "@/components/layout/MainLayout";
import { useGrades, useStudents, useGradeRecords } from "@/hooks/useSchoolData";
import type { Student } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { GraduationCap, Users, Loader2, ExternalLink, Trophy, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type FilterType = 'todos' | 'preescolar' | 'primaria';

const PREESCOLAR_LEVELS = [1, 2, 3, 4]; // Párvulo, Pre-Jardín, Jardín, Transición
const PRIMARIA_LEVELS = [5, 6, 7, 8, 9]; // Primero a Quinto

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

const getMedalEmoji = (position: number) => {
  if (position === 0) return '🥇';
  if (position === 1) return '🥈';
  if (position === 2) return '🥉';
  return '';
};

const getMedalColor = (position: number) => {
  if (position === 0) return 'from-yellow-400/20 to-yellow-500/5 border-yellow-400/30';
  if (position === 1) return 'from-slate-300/20 to-slate-400/5 border-slate-300/30';
  if (position === 2) return 'from-amber-600/20 to-amber-700/5 border-amber-600/30';
  return '';
};

type StudentAverage = {
  avg: number;
  recordCount: number;
  student: Student;
};

const Grados = () => {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: gradeRecords } = useGradeRecords();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('todos');

  const isRector = userRole === 'rector';

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

  // Calculate per-student average for a given grade
  const getTopStudents = (gradeId: string, count: number = 3) => {
    const gradeStudents = students?.filter(s => s.grade_id === gradeId) || [];
    if (gradeStudents.length === 0 || !gradeRecords) return [];

    const studentAverages = gradeStudents.map(student => {
      const studentRecords = gradeRecords.filter(r => r.student_id === student.id);
      if (studentRecords.length === 0) return null;
      const avg = studentRecords.reduce((sum, r) => sum + r.grade, 0) / studentRecords.length;
      return { student, avg, recordCount: studentRecords.length };
    }).filter((entry): entry is StudentAverage => Boolean(entry));

    return studentAverages
      .sort((a, b) => b.avg - a.avg)
      .slice(0, count);
  };

  // Apply filter
  const filteredGrades = grades?.filter(grade => {
    if (filter === 'todos') return true;
    if (filter === 'preescolar') return PREESCOLAR_LEVELS.includes(grade.level);
    if (filter === 'primaria') return PRIMARIA_LEVELS.includes(grade.level);
    return true;
  });

  const isPrimariaGrade = (level: number) => PRIMARIA_LEVELS.includes(level);

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

  const filterButtons: { key: FilterType; label: string; icon?: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'preescolar', label: 'Preescolar' },
    { key: 'primaria', label: 'Primaria' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Grados</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredGrades?.length || 0} grado{(filteredGrades?.length || 0) !== 1 ? 's' : ''} visible{(filteredGrades?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-secondary/50 rounded-xl p-1 border border-border/50">
            {filterButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                  filter === btn.key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGrades?.map((grade, index) => {
            const avg = getGradeAvg(grade.id);
            const count = getStudentCount(grade.id);
            const preview = getStudentsByGrade(grade.id).slice(0, 3);
            const showTop3 = isRector && isPrimariaGrade(grade.level);
            const topStudents = showTop3 ? getTopStudents(grade.id, 3) : [];

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
                        {isPrimariaGrade(grade.level) ? 'Primaria' : 'Preescolar'} · Grado {grade.level}
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
                            {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
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

                  {/* Top 3 Students — Rector only, Primaria only */}
                  {showTop3 && topStudents.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Mejores estudiantes
                        </span>
                      </div>
                      <div className="space-y-2">
                        {topStudents.map((entry, i) => (
                          <div
                            key={entry.student.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border bg-gradient-to-r transition-all duration-200",
                              getMedalColor(i)
                            )}
                          >
                            <span className="text-lg flex-shrink-0">{getMedalEmoji(i)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {entry.student.full_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {entry.recordCount} nota{entry.recordCount !== 1 ? 's' : ''} registrada{entry.recordCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={cn(
                                "text-lg font-bold",
                                entry.avg >= 4 ? 'text-success' : entry.avg >= 3 ? 'text-warning' : 'text-destructive'
                              )}>
                                {entry.avg.toFixed(1)}
                              </p>
                              <p className="text-[10px] font-medium text-muted-foreground">
                                {getAvgLabel(entry.avg)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredGrades?.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No hay grados de {filter === 'preescolar' ? 'Preescolar' : 'Primaria'} configurados
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Grados;
