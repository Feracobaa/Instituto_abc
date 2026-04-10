import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { Teacher } from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

interface TeacherPayload {
  director_grade_ids: string[];
  full_name: string;
  email: string;
  phone?: string;
  subject_ids: string[];
  grade_ids: string[];
}

export function useTeachers() {
  return useQuery({
    queryKey: schoolQueryKeys.teachers.all,
    queryFn: async (): Promise<Teacher[]> => {
      const { data, error } = await supabase
        .from("teachers")
        .select(`
          *,
          teacher_grade_assignments(
            grade_id,
            is_group_director,
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
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Teacher[];
    },
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TeacherPayload) => {
      const { data: teacher, error } = await supabase
        .from("teachers")
        .insert({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.subject_ids.length > 0) {
        const teacherSubjects = data.subject_ids.map((subjectId) => ({
          teacher_id: teacher.id,
          subject_id: subjectId,
        }));

        const { error: subjectError } = await supabase.from("teacher_subjects").insert(teacherSubjects);
        if (subjectError) throw subjectError;
      }

      if (data.grade_ids.length > 0) {
        const teacherGradeAssignments = data.grade_ids.map((gradeId) => ({
          teacher_id: teacher.id,
          grade_id: gradeId,
          is_group_director: data.director_grade_ids.includes(gradeId),
        }));

        const { error: gradeError } = await supabase
          .from("teacher_grade_assignments")
          .insert(teacherGradeAssignments);

        if (gradeError) throw gradeError;
      }

      return teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.teachers.all });
      toast({ title: "Profesor creado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear profesor",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TeacherPayload & { id: string }) => {
      const { error } = await supabase
        .from("teachers")
        .update({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
        })
        .eq("id", data.id);

      if (error) throw error;

      await supabase.from("teacher_subjects").delete().eq("teacher_id", data.id);
      await supabase.from("teacher_grade_assignments").delete().eq("teacher_id", data.id);

      if (data.subject_ids.length > 0) {
        const teacherSubjects = data.subject_ids.map((subjectId) => ({
          teacher_id: data.id,
          subject_id: subjectId,
        }));

        const { error: insertError } = await supabase.from("teacher_subjects").insert(teacherSubjects);
        if (insertError) throw insertError;
      }

      if (data.grade_ids.length > 0) {
        const teacherGradeAssignments = data.grade_ids.map((gradeId) => ({
          teacher_id: data.id,
          grade_id: gradeId,
          is_group_director: data.director_grade_ids.includes(gradeId),
        }));

        const { error: gradeInsertError } = await supabase
          .from("teacher_grade_assignments")
          .insert(teacherGradeAssignments);

        if (gradeInsertError) throw gradeInsertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.teachers.all });
      toast({ title: "Profesor actualizado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar profesor",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teachers").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.teachers.all });
      toast({ title: "Profesor eliminado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar profesor",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
