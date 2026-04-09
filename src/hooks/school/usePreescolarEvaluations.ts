import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  PreescolarEvaluation,
  PreescolarEvaluationFilters,
} from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function usePreescolarEvaluations(filters?: PreescolarEvaluationFilters) {
  return useQuery({
    queryKey: schoolQueryKeys.preescolarEvaluations.list(filters),
    queryFn: async (): Promise<PreescolarEvaluation[]> => {
      let query = supabase
        .from("preescolar_evaluations")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.studentId) {
        query = query.eq("student_id", filters.studentId);
      }
      if (filters?.periodId) {
        query = query.eq("period_id", filters.periodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PreescolarEvaluation[];
    },
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
        .from("preescolar_evaluations")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.preescolarEvaluations.all });
      toast({ title: "Evaluacion cualitativa registrada" });
    },
    onError: (error) => {
      toast({
        title: "Error al registrar evaluacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
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
      const { error } = await supabase.from("preescolar_evaluations").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.preescolarEvaluations.all });
      toast({ title: "Evaluacion cualitativa actualizada" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar evaluacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeletePreescolarEvaluation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("preescolar_evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.preescolarEvaluations.all });
      toast({ title: "Evaluacion eliminada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar evaluacion",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
