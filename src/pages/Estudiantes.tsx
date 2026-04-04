import { MainLayout } from "@/components/layout/MainLayout";
import { useStudents, useDeleteStudent, useGrades, useGradeRecords } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Loader2, Users, Calendar, Phone, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const avatarColors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500'
];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getAvgColor = (avg: number | null) => {
  if (avg === null) return 'bg-muted-foreground/20 text-muted-foreground';
  if (avg >= 4) return 'bg-success/15 text-success';
  if (avg >= 3) return 'bg-warning/15 text-warning';
  return 'bg-destructive/15 text-destructive';
};

const Estudiantes = () => {
  const { data: grades } = useGrades();
  const [selectedGradeId, setSelectedGradeId] = useState<string>('all');
  const { data: students, isLoading } = useStudents(selectedGradeId === 'all' ? undefined : selectedGradeId);
  const { data: gradeRecords } = useGradeRecords();
  const deleteStudent = useDeleteStudent();
  const { userRole } = useAuth();
  const isRector = userRole === 'rector';

  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof students extends (infer T)[] ? T : never | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleEdit = (student: NonNullable<typeof selectedStudent>) => {
    setSelectedStudent(student);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setStudentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      await deleteStudent.mutateAsync(studentToDelete);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const getStudentAvg = (studentId: string) => {
    const records = gradeRecords?.filter(r => r.student_id === studentId) ?? [];
    if (records.length === 0) return null;
    return records.reduce((a, r) => a + r.grade, 0) / records.length;
  };

  const filtered = useMemo(() =>
    students?.filter(s =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.guardian_name || '').toLowerCase().includes(search.toLowerCase())
    ) ?? [],
    [students, search]
  );

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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Estudiantes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {students?.length || 0} estudiante{(students?.length || 0) !== 1 ? 's' : ''} matriculado{(students?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          {isRector && (
            <Button onClick={() => { setSelectedStudent(null); setFormOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Estudiante
            </Button>
          )}
        </div>

        {/* Search + Grade tabs */}
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar estudiante o acudiente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Grade filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedGradeId('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectedGradeId === 'all'
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              Todos
            </button>
            {grades?.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGradeId(grade.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedGradeId === grade.id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {grade.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 && search ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No se encontraron estudiantes con "{search}"
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay estudiantes registrados"
            description="Agrega el primer estudiante para comenzar a gestionar las matriculas."
            action={isRector ? { label: 'Agregar Primer Estudiante', onClick: () => setFormOpen(true) } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((student, index) => {
              const avg = getStudentAvg(student.id);
              return (
                <div
                  key={student.id}
                  className="bg-card rounded-xl border shadow-card p-4 animate-slide-up hover-lift flex flex-col"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className={cn("font-bold text-white text-xs", getAvatarColor(student.full_name))}>
                          {getInitials(student.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{student.full_name}</h3>
                        <Badge variant="secondary" className="mt-0.5 text-[11px]">
                          {student.grades?.name || 'Sin grado'}
                        </Badge>
                      </div>
                    </div>
                    {isRector && (
                      <div className="flex gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(student)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Info + avg */}
                  <div className="space-y-1.5 text-xs mb-3 flex-1">
                    {student.birth_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{new Date(student.birth_date).toLocaleDateString('es-CO')}</span>
                      </div>
                    )}
                    {student.guardian_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{student.guardian_name}</span>
                      </div>
                    )}
                    {student.guardian_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{student.guardian_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Average indicator */}
                  <div className={cn(
                    "mt-auto pt-2 border-t border-border flex items-center justify-between"
                  )}>
                    <span className="text-[11px] text-muted-foreground font-medium">Promedio</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md",
                      getAvgColor(avg)
                    )}>
                      {avg !== null ? avg.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={selectedStudent} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El estudiante será desactivado del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Estudiantes;
