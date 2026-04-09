import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateSubject, useGrades, useSubjects, useUpdateSubject } from "@/hooks/useSchoolData";
import type { Subject } from "@/hooks/useSchoolData";
import { getFieldErrors, subjectFormSchema } from "@/lib/schoolSchemas";

const COLORS = [
  { value: "bg-blue-500", label: "Azul" },
  { value: "bg-emerald-500", label: "Esmeralda" },
  { value: "bg-violet-500", label: "Violeta" },
  { value: "bg-rose-500", label: "Rosa" },
  { value: "bg-cyan-500", label: "Cyan" },
  { value: "bg-amber-500", label: "Ambar" },
  { value: "bg-pink-500", label: "Rosado" },
  { value: "bg-slate-600", label: "Gris" },
  { value: "bg-indigo-500", label: "Indigo" },
];

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject | null;
}

type SubjectFormData = {
  color: string;
  grade_level: string;
  name: string;
  parent_id: string;
};

const emptyFormData: SubjectFormData = {
  color: "bg-blue-500",
  grade_level: "none",
  name: "",
  parent_id: "none",
};

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
}: SubjectFormDialogProps) {
  const { data: subjects } = useSubjects();
  const { data: grades } = useGrades();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const { toast } = useToast();

  const [formData, setFormData] = useState<SubjectFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (subject) {
      setFormData({
        color: subject.color || "bg-blue-500",
        grade_level: subject.grade_level?.toString() || "none",
        name: subject.name,
        parent_id: subject.parent_id || "none",
      });
    } else {
      setFormData(emptyFormData);
    }

    setErrors({});
  }, [subject, open]);

  const updateField = <K extends keyof SubjectFormData>(field: K, value: SubjectFormData[K]) => {
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

  const handleSubmit = async () => {
    const validation = subjectFormSchema.safeParse(formData);
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
      color: validation.data.color,
      grade_level:
        validation.data.grade_level === "none" ? null : Number(validation.data.grade_level),
      name: validation.data.name.trim().toUpperCase(),
      parent_id: validation.data.parent_id === "none" ? null : validation.data.parent_id,
    };

    try {
      if (subject?.id) {
        await updateSubject.mutateAsync({
          id: subject.id,
          ...payload,
        });
      } else {
        await createSubject.mutateAsync(payload);
      }

      setErrors({});
      onOpenChange(false);
    } catch {
      // El hook ya reporta el error legible.
    }
  };

  const availableParentSubjects = subjects?.filter((item) => !item.parent_id && item.id !== subject?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? "Editar materia" : "Nueva materia o submateria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre de la materia</Label>
            <Input
              placeholder="Ej. ESTADISTICA, GEOMETRIA..."
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Color distintivo</Label>
            <select
              value={formData.color}
              onChange={(event) => updateField("color", event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Es submateria de otra principal? (Opcional)</Label>
            <select
              value={formData.parent_id}
              onChange={(event) => updateField("parent_id", event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="none">No, es una materia principal</option>
              {availableParentSubjects?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Si seleccionas una materia padre, esta se presentara como una rama de dicha materia.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Grado oficial (Opcional)</Label>
            <select
              value={formData.grade_level}
              onChange={(event) => updateField("grade_level", event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="none">General / todos los grados</option>
              {grades?.map((grade) => (
                <option key={grade.id} value={grade.level.toString()}>
                  {grade.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Dejalo en general si la materia aplica a varios grados o se organiza por materia
              padre.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createSubject.isPending || updateSubject.isPending}
            >
              {(createSubject.isPending || updateSubject.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {subject ? "Guardar cambios" : "Guardar materia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
