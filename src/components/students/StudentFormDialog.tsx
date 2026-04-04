import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGrades, useCreateStudent, useUpdateStudent } from '@/hooks/useSchoolData';
import { Loader2 } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  grade_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
}

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
  const { data: grades } = useGrades();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [formData, setFormData] = useState({
    full_name: '',
    grade_id: '',
    guardian_name: '',
    guardian_phone: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        full_name: student.full_name,
        grade_id: student.grade_id || '',
        guardian_name: student.guardian_name || '',
        guardian_phone: student.guardian_phone || ''
      });
    } else {
      setFormData({
        full_name: '',
        grade_id: '',
        guardian_name: '',
        guardian_phone: ''
      });
    }
  }, [student, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      full_name: formData.full_name,
      grade_id: formData.grade_id,
      guardian_name: formData.guardian_name || undefined,
      guardian_phone: formData.guardian_phone || undefined
    };
    
    if (student) {
      await updateStudent.mutateAsync({ id: student.id, ...data });
    } else {
      await createStudent.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const isLoading = createStudent.isPending || updateStudent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? 'Editar Estudiante' : 'Nuevo Estudiante'}</DialogTitle>
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
            <Label htmlFor="grade">Grado</Label>
            <Select 
              value={formData.grade_id} 
              onValueChange={(value) => setFormData({ ...formData, grade_id: value })}
            >
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_name">Nombre del Acudiente</Label>
            <Input
              id="guardian_name"
              value={formData.guardian_name}
              onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian_phone">Teléfono del Acudiente</Label>
            <Input
              id="guardian_phone"
              value={formData.guardian_phone}
              onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {student ? 'Guardar Cambios' : 'Crear Estudiante'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
