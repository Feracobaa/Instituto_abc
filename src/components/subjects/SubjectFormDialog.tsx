import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGrades, useSubjects, useCreateSubject, useUpdateSubject } from '@/hooks/useSchoolData';
import { Loader2 } from 'lucide-react';

const COLORS = [
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-emerald-500', label: 'Esmeralda' },
  { value: 'bg-violet-500', label: 'Violeta' },
  { value: 'bg-rose-500', label: 'Rosa' },
  { value: 'bg-cyan-500', label: 'Cyan' },
  { value: 'bg-amber-500', label: 'Ámbar' },
  { value: 'bg-pink-500', label: 'Rosado' },
  { value: 'bg-slate-600', label: 'Gris' },
  { value: 'bg-indigo-500', label: 'Índigo' },
];

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: {
    id: string;
    name: string;
    color: string;
    parent_id?: string | null;
    grade_level?: number | null;
  } | null;
}

export function SubjectFormDialog({ open, onOpenChange, subject }: SubjectFormDialogProps) {
  const { data: subjects } = useSubjects();
  const { data: grades } = useGrades();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  
  const [formData, setFormData] = useState({
    name: '',
    color: 'bg-blue-500',
    parent_id: 'none',
    grade_level: 'none'
  });

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        color: subject.color || 'bg-blue-500',
        parent_id: subject.parent_id || 'none',
        grade_level: subject.grade_level?.toString() || 'none'
      });
    } else if (!open) {
      setFormData({ name: '', color: 'bg-blue-500', parent_id: 'none', grade_level: 'none' });
    }
  }, [subject, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    if (subject && subject.id) {
      await updateSubject.mutateAsync({
        id: subject.id,
        name: formData.name.trim().toUpperCase(),
        color: formData.color,
        parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
        grade_level: formData.grade_level === 'none' ? null : Number(formData.grade_level)
      });
    } else {
      await createSubject.mutateAsync({
        name: formData.name.trim().toUpperCase(),
        color: formData.color,
        parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
        grade_level: formData.grade_level === 'none' ? null : Number(formData.grade_level)
      });
    }
    setFormData({ name: '', color: 'bg-blue-500', parent_id: 'none', grade_level: 'none' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subject ? 'Editar Materia' : 'Nueva Materia o Sub-materia'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre de la Materia</Label>
            <Input
              placeholder="Ej. ESTADÍSTICA, GEOMETRÍA..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Color Distintivo</Label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COLORS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>¿Es sub-materia de otra principal? (Opcional)</Label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="none">No, es una materia principal</option>
              {subjects?.filter(s => !(s as any).parent_id).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Si seleccionas una materia padre (ej. Matemáticas), esta se presentará como una rama de dicha materia.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Grado oficial (Opcional)</Label>
            <select
              value={formData.grade_level}
              onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="none">General / todos los grados</option>
              {grades?.map((grade) => (
                <option key={grade.id} value={grade.level.toString()}>
                  {grade.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Déjalo en general si la materia aplica a varios grados o se organiza por materia padre.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createSubject.isPending || updateSubject.isPending || !formData.name.trim()}>
              {(createSubject.isPending || updateSubject.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {subject ? 'Guardar Cambios' : 'Guardar Materia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
