import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSubjects, useGrades, useCreateTeacher, useUpdateTeacher } from '@/hooks/useSchoolData';
import { Loader2, Search, Filter } from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  teacher_subjects?: { subject_id: string; subjects: { id: string; name: string } }[];
}

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

export function TeacherFormDialog({ open, onOpenChange, teacher }: TeacherFormDialogProps) {
  const { data: subjects } = useSubjects();
  const { data: grades } = useGrades();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    subject_ids: [] as string[]
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        full_name: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone || '',
        subject_ids: teacher.teacher_subjects?.map(ts => ts.subject_id) || []
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        subject_ids: []
      });
    }
  }, [teacher, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (teacher) {
      await updateTeacher.mutateAsync({ id: teacher.id, ...formData });
    } else {
      await createTeacher.mutateAsync(formData);
    }
    
    onOpenChange(false);
  };

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter(id => id !== subjectId)
        : [...prev.subject_ids, subjectId]
    }));
  };

  const filteredSubjects = subjects?.filter((subject) => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase());
    const gradeLevel = (subject as any).grade_level;
    const matchesGrade = filterGrade === 'all' || gradeLevel?.toString() === filterGrade;
    return matchesSearch && matchesGrade;
  });

  const isLoading = createTeacher.isPending || updateTeacher.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{teacher ? 'Editar Profesor' : 'Nuevo Profesor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <Label>Materias que Imparte</Label>
            
            {/* Buscador Rápido */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm w-full"
              />
            </div>

            {/* Grid de Checkboxes */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg border border-border/50">
              {filteredSubjects?.length === 0 ? (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-4">
                  No se encontraron materias correspondientes.
                </div>
              ) : (
                filteredSubjects?.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject.id}
                      checked={formData.subject_ids.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                    />
                    <Label htmlFor={subject.id} className="text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis" title={subject.name}>
                      {subject.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {teacher ? 'Guardar Cambios' : 'Crear Profesor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
