import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { GradeRecord, GradeRecordFilters } from "@/hooks/school/types";
import { asGradeRecordArray } from "@/hooks/school/typeGuards";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function useGradeRecords(filters?: GradeRecordFilters) {
  return useQuery({
    queryKey: schoolQueryKeys.gradeRecords.list(filters),
    queryFn: async (): Promise<GradeRecord[]> => {
      let query = supabase
        .from("grade_records")
        .select(`
          *,
          students(*),
          subjects(*),
          teachers(*),
          academic_periods(*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.studentId) {
        query = query.eq("student_id", filters.studentId);
      }
      if (filters?.periodId) {
        query = query.eq("period_id", filters.periodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Use type guard instead of unsafe cast
      return asGradeRecordArray(data ?? [], "useGradeRecords");
    },
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
      const { data: record, error } = await supabase.from("grade_records").insert(data).select().single();
      if (error) throw error;
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecords.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecordPartials.all });
      toast({ title: "Calificacion registrada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al registrar calificacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
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
      const { error } = await supabase.from("grade_records").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecords.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecordPartials.all });
      toast({ title: "Calificacion actualizada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar calificacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteGradeRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grade_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecords.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecordPartials.all });
      toast({ title: "Calificacion eliminada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar calificacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
