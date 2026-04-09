import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateTeacher, useGrades, useSubjects, useUpdateTeacher } from "@/hooks/useSchoolData";
import { getFieldErrors, teacherFormSchema } from "@/lib/schoolSchemas";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  teacher_subjects?: { subject_id: string; subjects: { id: string; name: string } }[];
  teacher_grade_assignments?: {
    grade_id: string;
    grades: { id: string; name: string; level: number };
  }[];
}

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

type TeacherFormData = {
  email: string;
  full_name: string;
  grade_ids: string[];
  phone: string;
  subject_ids: string[];
};

const emptyFormData: TeacherFormData = {
  email: "",
  full_name: "",
  grade_ids: [],
  phone: "",
  subject_ids: [],
};

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherFormDialogProps) {
  const { data: subjects } = useSubjects();
  const { data: grades } = useGrades();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<TeacherFormData>(emptyFormData);

  useEffect(() => {
    if (teacher) {
      setFormData({
        email: teacher.email,
        full_name: teacher.full_name,
        grade_ids: teacher.teacher_grade_assignments?.map((assignment) => assignment.grade_id) || [],
        phone: teacher.phone || "",
        subject_ids: teacher.teacher_subjects?.map((assignment) => assignment.subject_id) || [],
      });
    } else {
      setFormData(emptyFormData);
    }

    setSearchTerm("");
    setErrors({});
  }, [teacher, open]);

  const updateField = <K extends keyof TeacherFormData>(field: K, value: TeacherFormData[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const toggleArrayValue = (field: "subject_ids" | "grade_ids", value: string) => {
    const currentValues = formData[field];
    updateField(
      field,
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = teacherFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getFieldErrors(validation.error));
      toast({
        title: "Revisa el formulario",
        description: "Corrige los campos marcados antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (teacher) {
        await updateTeacher.mutateAsync({ id: teacher.id, ...validation.data });
      } else {
        await createTeacher.mutateAsync(validation.data);
      }

      setErrors({});
      onOpenChange(false);
    } catch {
      // El hook ya muestra un mensaje mas preciso.
    }
  };

  const filteredSubjects = subjects?.filter((subject) =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isLoading = createTeacher.isPending || updateTeacher.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{teacher ? "Editar profesor" : "Nuevo profesor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(event) => updateField("full_name", event.target.value)}
              required
            />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-3">
            <Label>Materias que imparte</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materia..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9 w-full pl-8 text-sm"
              />
            </div>

            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border/50 bg-secondary/30 p-2">
              {filteredSubjects?.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-sm text-muted-foreground">
                  No se encontraron materias.
                </div>
              ) : (
                filteredSubjects?.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject.id}
                      checked={formData.subject_ids.includes(subject.id)}
                      onCheckedChange={() => toggleArrayValue("subject_ids", subject.id)}
                    />
                    <Label
                      htmlFor={subject.id}
                      className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm"
                      title={subject.name}
                    >
                      {subject.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            {errors.subject_ids && (
              <p className="text-xs text-destructive">{errors.subject_ids}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Grados asignados</Label>
            <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border/50 bg-secondary/30 p-2">
              {grades?.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-sm text-muted-foreground">
                  No hay grados configurados.
                </div>
              ) : (
                grades?.map((grade) => (
                  <div key={grade.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grade-${grade.id}`}
                      checked={formData.grade_ids.includes(grade.id)}
                      onCheckedChange={() => toggleArrayValue("grade_ids", grade.id)}
                    />
                    <Label htmlFor={`grade-${grade.id}`} className="cursor-pointer text-sm">
                      {grade.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Estas asignaciones controlan que el rector solo pueda registrar notas en nombre de
              docentes validos para el grado.
            </p>
            {errors.grade_ids && <p className="text-xs text-destructive">{errors.grade_ids}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {teacher ? "Guardar cambios" : "Crear profesor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
