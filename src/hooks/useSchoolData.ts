import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/types';
import { useToast } from '@/hooks/use-toast';

export type AcademicPeriod = Tables<'academic_periods'>;
export type Grade = Tables<'grades'>;
export type Subject = Tables<'subjects'>;
export type TeacherBase = Tables<'teachers'>;
export type TeacherSubjectAssignment = Tables<'teacher_subjects'> & {
  subjects: Subject | null;
};
export type TeacherGradeAssignment = Tables<'teacher_grade_assignments'> & {
  grades: Grade | null;
};
export type Teacher = TeacherBase & {
  teacher_grade_assignments: TeacherGradeAssignment[] | null;
  teacher_subjects: TeacherSubjectAssignment[] | null;
};
export type Student = Tables<'students'> & {
  grades: Grade | null;
};
export type Schedule = Tables<'schedules'> & {
  grades: Grade | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};
export type GradeRecord = Tables<'grade_records'> & {
  academic_periods: AcademicPeriod | null;
  students: Student | null;
  subjects: Subject | null;
  teachers: TeacherBase | null;
};
export type PreescolarEvaluation = Tables<'preescolar_evaluations'>;
export type ScheduleInsert = TablesInsert<'schedules'>;

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      console.log('🔍 useSubjects: Iniciando query a Supabase...');
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      console.log('🔍 useSubjects: Data recibida:', data);
      console.log('🔍 useSubjects: Error:', error);
      if (error) {
        console.error('❌ useSubjects Error:', error);
        throw error;
      }
      return (data ?? []) as Subject[];
    },
    staleTime: 0,
    gcTime: 0
  });
}

export function useGrades() {
  return useQuery({
    queryKey: ['grades'],
    queryFn: async (): Promise<Grade[]> => {
      console.log('🔍 useGrades: Iniciando query a Supabase...');
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('level');
      console.log('🔍 useGrades: Data recibida:', data);
      console.log('🔍 useGrades: Error:', error);
      if (error) {
        console.error('❌ useGrades Error:', error);
        throw error;
      }
      return (data ?? []) as Grade[];
    },
    staleTime: 0,
    gcTime: 0
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          teacher_grade_assignments(
            grade_id,
            grades(
              id,
              name,
              level
            )
          ),
          teacher_subjects(
            subject_id,
            subjects(*)
          )
        `)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Teacher[];
    }
  });
}

export function useStudents(gradeId?: string) {
  return useQuery({
    queryKey: ['students', gradeId],
    queryFn: async (): Promise<Student[]> => {
      let query = supabase
        .from('students')
        .select(`
          *,
          grades(*)
        `)
        .eq('is_active', true)
        .order('full_name');
      
      if (gradeId) {
        query = query.eq('grade_id', gradeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Student[];
    }
  });
}

export function useAcademicPeriods() {
  return useQuery({
    queryKey: ['academic_periods'],
    queryFn: async (): Promise<AcademicPeriod[]> => {
      const { data, error } = await supabase
        .from('academic_periods')
        .select('*')
        .order('start_date');
      if (error) throw error;
      return (data ?? []) as AcademicPeriod[];
    }
  });
}

export function useSchedules(gradeId?: string, teacherId?: string) {
  return useQuery({
    queryKey: ['schedules', gradeId, teacherId],
    queryFn: async (): Promise<Schedule[]> => {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          subjects(*),
          teachers(*),
          grades(*)
        `)
        .order('day_of_week')
        .order('start_time');
      
      if (gradeId) {
        query = query.eq('grade_id', gradeId);
      }
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Schedule[];
    }
  });
}

export function useGradeRecords(filters?: { studentId?: string; periodId?: string }) {
  return useQuery({
    queryKey: ['grade_records', filters],
    queryFn: async (): Promise<GradeRecord[]> => {
      let query = supabase
        .from('grade_records')
        .select(`
          *,
          students(*),
          subjects(*),
          teachers(*),
          academic_periods(*)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.periodId) {
        query = query.eq('period_id', filters.periodId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as GradeRecord[];
    }
  });
}

// Mutations
export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      email: string;
      phone?: string;
      subject_ids: string[];
      grade_ids: string[];
    }) => {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .insert({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone
        })
        .select()
        .single();
      
      if (error) throw error;

      if (data.subject_ids.length > 0) {
        const teacherSubjects = data.subject_ids.map(subjectId => ({
          teacher_id: teacher.id,
          subject_id: subjectId
        }));
        
        const { error: subjectError } = await supabase
          .from('teacher_subjects')
          .insert(teacherSubjects);
        
        if (subjectError) throw subjectError;
      }

      if (data.grade_ids.length > 0) {
        const teacherGradeAssignments = data.grade_ids.map(gradeId => ({
          teacher_id: teacher.id,
          grade_id: gradeId
        }));

        const { error: gradeError } = await supabase
          .from('teacher_grade_assignments')
          .insert(teacherGradeAssignments);

        if (gradeError) throw gradeError;
      }

      return teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({ title: 'Profesor creado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear profesor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      full_name: string;
      email: string;
      phone?: string;
      subject_ids: string[];
      grade_ids: string[];
    }) => {
      const { error } = await supabase
        .from('teachers')
        .update({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone
        })
        .eq('id', data.id);
      
      if (error) throw error;

      // Update subjects
      await supabase.from('teacher_subjects').delete().eq('teacher_id', data.id);
      await supabase.from('teacher_grade_assignments').delete().eq('teacher_id', data.id);
      
      if (data.subject_ids.length > 0) {
        const teacherSubjects = data.subject_ids.map(subjectId => ({
          teacher_id: data.id,
          subject_id: subjectId
        }));
        
        const { error: insertError } = await supabase.from('teacher_subjects').insert(teacherSubjects);
        if (insertError) throw insertError;
      }

      if (data.grade_ids.length > 0) {
        const teacherGradeAssignments = data.grade_ids.map(gradeId => ({
          teacher_id: data.id,
          grade_id: gradeId
        }));

        const { error: gradeInsertError } = await supabase
          .from('teacher_grade_assignments')
          .insert(teacherGradeAssignments);

        if (gradeInsertError) throw gradeInsertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({ title: 'Profesor actualizado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar profesor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({ title: 'Profesor eliminado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar profesor', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      full_name: string; 
      grade_id: string; 
      guardian_name?: string;
      guardian_phone?: string;
    }) => {
      const { data: student, error } = await supabase
        .from('students')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: 'Estudiante creado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear estudiante', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { 
      id: string;
      full_name: string; 
      grade_id: string; 
      guardian_name?: string;
      guardian_phone?: string;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: 'Estudiante actualizado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar estudiante', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: 'Estudiante eliminado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar estudiante', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreateGradeRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      subject_id: string;
      teacher_id: string;
      period_id: string;
      grade: number;
      achievements?: string;
      comments?: string;
    }) => {
      const { data: record, error } = await supabase
        .from('grade_records')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade_records'] });
      toast({ title: 'Calificación registrada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al registrar calificación', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateGradeRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      grade: number;
      achievements?: string;
      comments?: string;
      teacher_id?: string;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('grade_records')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade_records'] });
      toast({ title: 'Calificación actualizada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar calificación', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteGradeRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grade_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade_records'] });
      toast({ title: 'Calificación eliminada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar calificación', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      color: string;
      parent_id?: string | null;
      grade_level?: number | null;
    }) => {
      const { data: subject, error } = await supabase
        .from('subjects')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({ title: 'Materia habilitada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear materia', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      color: string;
      parent_id?: string | null;
      grade_level?: number | null;
    }) => {
      const { id, ...updateData } = data;
      const { data: subject, error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({ title: 'Materia actualizada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar materia', description: error.message, variant: 'destructive' });
    }
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ScheduleInsert | ScheduleInsert[]) => {
      // array of objects or single object
      const isArray = Array.isArray(data);
      const { data: schedule, error } = await supabase
        .from('schedules')
        .insert(data)
        .select();
        
      if (error) throw error;
      return isArray ? schedule : schedule[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Bloque de horario creado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear horario', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({ title: 'Bloque de horario eliminado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar horario', description: error.message, variant: 'destructive' });
    }
  });
}

// ============================================================================
// PREESCOLAR EVALUATIONS CRUD
// ============================================================================

export function usePreescolarEvaluations(filters?: { studentId?: string; periodId?: string }) {
  return useQuery({
    queryKey: ['preescolar_evaluations', filters],
    queryFn: async (): Promise<PreescolarEvaluation[]> => {
      let query = supabase
        .from('preescolar_evaluations')
        .select(`*`)
        .order('created_at', { ascending: false });
      
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }
      if (filters?.periodId) {
        query = query.eq('period_id', filters.periodId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PreescolarEvaluation[];
    }
  });
}

export function useCreatePreescolarEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      dimension: string;
      period_id: string;
      teacher_id?: string | null;
      fortalezas: string;
      debilidades: string;
      recomendaciones: string;
    }) => {
      const { data: record, error } = await supabase
        .from('preescolar_evaluations')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preescolar_evaluations'] });
      toast({ title: 'Evaluación cualitativa registrada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al registrar evaluación cualitativa', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdatePreescolarEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      fortalezas: string;
      debilidades: string;
      recomendaciones: string;
      teacher_id?: string | null;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('preescolar_evaluations')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preescolar_evaluations'] });
      toast({ title: 'Evaluación cualitativa actualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar evaluación', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeletePreescolarEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('preescolar_evaluations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preescolar_evaluations'] });
      toast({ title: 'Evaluación eliminada exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar evaluación', description: error.message, variant: 'destructive' });
    }
  });
}
