import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { Student } from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function useStudents(gradeId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.students.list(gradeId),
    queryFn: async (): Promise<Student[]> => {
      let query = supabase
        .from("students")
        .select(`
          *,
          grades(*)
        `)
        .eq("is_active", true)
        .order("full_name");

      if (gradeId) {
        query = query.eq("grade_id", gradeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      address?: string;
      birth_date?: string | null;
      full_name: string;
      grade_id: string;
      guardian_name?: string;
      guardian_phone?: string;
    }) => {
      const { data: student, error } = await supabase.from("students").insert(data).select().single();
      if (error) throw error;
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.students.all });
      toast({ title: "Estudiante creado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear estudiante",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      address?: string;
      birth_date?: string | null;
      id: string;
      full_name: string;
      grade_id: string;
      guardian_name?: string;
      guardian_phone?: string;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from("students").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.students.all });
      toast({ title: "Estudiante actualizado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar estudiante",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.students.all });
      toast({ title: "Estudiante eliminado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar estudiante",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
