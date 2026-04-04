import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubjects, useCreateSubject } from '@/hooks/useSchoolData';
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
}

export function SubjectFormDialog({ open, onOpenChange }: SubjectFormDialogProps) {
  const { data: subjects } = useSubjects();
  const createSubject = useCreateSubject();
  
  const [formData, setFormData] = useState({
    name: '',
    color: 'bg-blue-500',
    parent_id: 'none'
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    await createSubject.mutateAsync({
      name: formData.name.trim().toUpperCase(),
      color: formData.color,
      parent_id: formData.parent_id === 'none' ? null : formData.parent_id
    });
    setFormData({ name: '', color: 'bg-blue-500', parent_id: 'none' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Materia o Sub-materia</DialogTitle>
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createSubject.isPending || !formData.name.trim()}>
              {createSubject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Materia
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
