import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateStudent, useGrades, useUpdateStudent } from "@/hooks/useSchoolData";
import { getFieldErrors, studentFormSchema } from "@/lib/schoolSchemas";

interface Student {
  address?: string | null;
  birth_date?: string | null;
  id: string;
  full_name: string;
  grade_id?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
}

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

type StudentFormData = {
  address: string;
  birth_date: string;
  full_name: string;
  grade_id: string;
  guardian_name: string;
  guardian_phone: string;
};

const emptyFormData: StudentFormData = {
  address: "",
  birth_date: "",
  full_name: "",
  grade_id: "",
  guardian_name: "",
  guardian_phone: "",
};

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const { data: grades } = useGrades();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const { toast } = useToast();

  const [formData, setFormData] = useState<StudentFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (student) {
      setFormData({
        address: student.address || "",
        birth_date: student.birth_date || "",
        full_name: student.full_name,
        grade_id: student.grade_id || "",
        guardian_name: student.guardian_name || "",
        guardian_phone: student.guardian_phone || "",
      });
    } else {
      setFormData(emptyFormData);
    }

    setErrors({});
  }, [student, open]);

  const updateField = <K extends keyof StudentFormData>(field: K, value: StudentFormData[K]) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = studentFormSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getFieldErrors(validation.error));
      toast({
        title: "Revisa el formulario",
        description: "Corrige los campos marcados antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      address: validation.data.address || undefined,
      birth_date: validation.data.birth_date || undefined,
      full_name: validation.data.full_name,
      grade_id: validation.data.grade_id,
      guardian_name: validation.data.guardian_name || undefined,
      guardian_phone: validation.data.guardian_phone || undefined,
    };

    try {
      if (student) {
        await updateStudent.mutateAsync({ id: student.id, ...payload });
      } else {
        await createStudent.mutateAsync(payload);
      }

      setErrors({});
      onOpenChange(false);
    } catch {
      // El hook ya muestra el error real.
    }
  };

  const isLoading = createStudent.isPending || updateStudent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? "Editar estudiante" : "Nuevo estudiante"}</DialogTitle>
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
            <Label htmlFor="grade">Grado</Label>
            <Select value={formData.grade_id} onValueChange={(value) => updateField("grade_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grado" />
              </SelectTrigger>
              <SelectContent>
                {grades?.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade_id && <p className="text-xs text-destructive">{errors.grade_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_name">Nombre del acudiente</Label>
            <Input
              id="guardian_name"
              value={formData.guardian_name}
              onChange={(event) => updateField("guardian_name", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_phone">Telefono del acudiente</Label>
            <Input
              id="guardian_phone"
              value={formData.guardian_phone}
              onChange={(event) => updateField("guardian_phone", event.target.value)}
            />
            {errors.guardian_phone && (
              <p className="text-xs text-destructive">{errors.guardian_phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Cumpleanos del estudiante</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(event) => updateField("birth_date", event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {student ? "Guardar cambios" : "Crear estudiante"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
