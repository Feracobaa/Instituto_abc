import { MainLayout } from "@/components/layout/MainLayout";
import { useTeachers, useDeleteTeacher } from "@/hooks/useSchoolData";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, Plus, Pencil, Trash2, Loader2, Search, LayoutGrid, List, Camera, UserPlus, ShieldCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { TeacherFormDialog } from "@/components/teachers/TeacherFormDialog";
import { TeacherCredentialsModal } from "@/components/teachers/TeacherCredentialsModal";
import { StaffBiometricEnrollmentModal } from "@/components/teachers/StaffBiometricEnrollmentModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
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

// Deterministic color from name hash
const avatarColors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500'
];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getDirectorGrades = (
  assignments?: { grade_id: string; is_group_director?: boolean; grades?: { name: string } | null }[] | null,
) =>
  assignments?.filter((assignment) => assignment.is_group_director).map((assignment) => ({
    grade_id: assignment.grade_id,
    name: assignment.grades?.name || "Grado",
  })) ?? [];

const Profesores = () => {
  const { data: teachers, isLoading } = useTeachers();
  const deleteTeacher = useDeleteTeacher();
  const { userRole, effectiveInstitutionId } = useAuth();
  const isRector = userRole === 'rector';

  const [formOpen, setFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<typeof teachers extends (infer T)[] ? T : never | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [teacherForBiometrics, setTeacherForBiometrics] = useState<{ userId: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [generatingAccessFor, setGeneratingAccessFor] = useState<string | null>(null);
  const [credentialsData, setCredentialsData] = useState<{ email: string; fullName: string; temporaryPassword?: string } | null>(null);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleEnrollBiometrics = (teacher: { user_id?: string | null; full_name: string }) => {
    if (!teacher.user_id) {
      return;
    }
    if (!effectiveInstitutionId) {
      return;
    }
    setTeacherForBiometrics({ userId: teacher.user_id, name: teacher.full_name });
    setBiometricModalOpen(true);
  };

  const handleEdit = (teacher: NonNullable<typeof selectedTeacher>) => {
    setSelectedTeacher(teacher);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setTeacherToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (teacherToDelete) {
      await deleteTeacher.mutateAsync(teacherToDelete);
      setDeleteDialogOpen(false);
      setTeacherToDelete(null);
    }
  };

  const handleGenerateAccess = async (teacher: { id: string; full_name: string; email: string }) => {
    setGeneratingAccessFor(teacher.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-institution-user", {
        body: {
          email: teacher.email.trim().toLowerCase(),
          full_name: teacher.full_name.trim(),
          role: "profesor",
        },
      });

      if (error || data?.error) {
        const msg = data?.error || error?.message || "Error al generar la cuenta de acceso.";
        toast.error("No se pudo generar el acceso", { description: msg });
        return;
      }

      setCredentialsData({
        email: data.email,
        fullName: data.full_name,
        temporaryPassword: data.temporary_password,
      });
      toast.success("Cuenta de acceso generada exitosamente");
    } catch {
      toast.error("Error inesperado al generar la cuenta.");
    } finally {
      setGeneratingAccessFor(null);
    }
  };

  const filtered = useMemo(() =>
    teachers?.filter(t =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    ) ?? [],
    [teachers, search]
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
            <h1 className="text-2xl font-bold text-foreground font-heading">Profesores</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {teachers?.length || 0} docente{(teachers?.length || 0) !== 1 ? 's' : ''} registrado{(teachers?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          {isRector && (
            <Button onClick={() => { setSelectedTeacher(null); setFormOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Profesor
            </Button>
          )}
        </div>

        {/* Search + View toggle */}
        {teachers && teachers.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn("p-2 transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn("p-2 transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {filtered.length === 0 && search && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No se encontraron profesores con "{search}"
          </div>
        )}

        {filtered.length === 0 && !search && (
          <EmptyState
            icon={Plus}
            title="No hay profesores registrados"
            description="Agrega el primer docente para comenzar a gestionar el cuerpo académico."
            action={isRector ? { label: 'Agregar Primer Profesor', onClick: () => setFormOpen(true) } : undefined}
          />
        )}

        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((teacher, index) => (
              <div
                key={teacher.id}
                className="bg-card rounded-xl border shadow-card p-5 animate-slide-up hover-lift"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback className={cn("font-bold text-white text-sm", getAvatarColor(teacher.full_name))}>
                        {getInitials(teacher.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{teacher.full_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs truncate">{teacher.email}</span>
                      </div>
                      {teacher.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-xs">{teacher.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isRector && (
                    <div className="flex gap-0.5">
                      {teacher.user_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-cyan-600 hover:text-cyan-500 hover:bg-cyan-500/10"
                          title="Enrolar Rostro Biométrico"
                          onClick={() => handleEnrollBiometrics(teacher)}
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-600 hover:text-amber-500 hover:bg-amber-500/10"
                          title="Generar Acceso al Sistema"
                          onClick={() => handleGenerateAccess(teacher)}
                          disabled={generatingAccessFor === teacher.id}
                        >
                          {generatingAccessFor === teacher.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(teacher)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(teacher.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Badge de estado de cuenta */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {teacher.user_id ? (
                    <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                      <ShieldCheck className="w-3 h-3" />
                      Acceso Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                      Sin cuenta de acceso
                    </Badge>
                  )}
                  {getDirectorGrades(teacher.teacher_grade_assignments).map((grade) => (
                    <Badge key={`${teacher.id}-${grade.grade_id}`} variant="secondary" className="text-xs">
                      Director de grupo: {grade.name}
                    </Badge>
                  ))}
                </div>

                {/* Materias */}
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Materias ({teacher.teacher_subjects?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.teacher_subjects && teacher.teacher_subjects.length > 0 ? (
                      teacher.teacher_subjects.map((ts) => (
                        <Badge
                          key={ts.subject_id}
                          className={cn("text-white border-0 text-xs", ts.subjects?.color || 'bg-primary')}
                        >
                          {ts.subjects?.name || 'Desconocida'}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin materias asignadas</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && viewMode === 'list' && (
          <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-fade-in">
            {filtered.map((teacher, index) => (
              <div
                key={teacher.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/50 transition-colors",
                  index !== 0 && "border-t border-border"
                )}
              >
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback className={cn("font-bold text-white text-xs", getAvatarColor(teacher.full_name))}>
                    {getInitials(teacher.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{teacher.full_name}</p>
                    {teacher.user_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Sin acceso
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{teacher.email}</p>
                  {getDirectorGrades(teacher.teacher_grade_assignments).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Director de grupo: {getDirectorGrades(teacher.teacher_grade_assignments).map((grade) => grade.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="hidden sm:flex flex-wrap gap-1">
                  {teacher.teacher_subjects?.slice(0, 2).map(ts => (
                    <Badge key={ts.subject_id} className={cn("text-white border-0 text-xs", ts.subjects?.color || 'bg-primary')}>
                      {ts.subjects?.name}
                    </Badge>
                  ))}
                  {(teacher.teacher_subjects?.length ?? 0) > 2 && (
                    <Badge variant="secondary" className="text-xs">+{(teacher.teacher_subjects?.length ?? 0) - 2}</Badge>
                  )}
                </div>
                {isRector && (
                  <div className="flex gap-0.5">
                    {teacher.user_id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-cyan-600 hover:text-cyan-500 hover:bg-cyan-500/10"
                        title="Enrolar Rostro Biométrico"
                        onClick={() => handleEnrollBiometrics(teacher)}
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-600 hover:text-amber-500 hover:bg-amber-500/10"
                        title="Generar Acceso al Sistema"
                        onClick={() => handleGenerateAccess(teacher)}
                        disabled={generatingAccessFor === teacher.id}
                      >
                        {generatingAccessFor === teacher.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(teacher)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(teacher.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TeacherFormDialog open={formOpen} onOpenChange={setFormOpen} teacher={selectedTeacher} />

      {teacherForBiometrics && (
        <StaffBiometricEnrollmentModal
          userId={teacherForBiometrics.userId}
          staffName={teacherForBiometrics.name}
          institutionId={effectiveInstitutionId ?? ''}
          isOpen={biometricModalOpen}
          onClose={() => setBiometricModalOpen(false)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar profesor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El profesor será desactivado del sistema.
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

      {/* Modal de entrega segura de credenciales */}
      <TeacherCredentialsModal
        open={credentialsData !== null}
        onOpenChange={() => setCredentialsData(null)}
        credentials={credentialsData}
      />
    </MainLayout>
  );
};

export default Profesores;
