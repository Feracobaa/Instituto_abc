import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { AcademicPeriod, Grade, Subject } from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function useSubjects() {
  return useQuery({
    queryKey: schoolQueryKeys.subjects.all,
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
    staleTime: 0,
    gcTime: 0,
  });
}

export function useGrades() {
  return useQuery({
    queryKey: schoolQueryKeys.grades.all,
    queryFn: async (): Promise<Grade[]> => {
      const { data, error } = await supabase.from("grades").select("*").order("level");
      if (error) throw error;
      return (data ?? []) as Grade[];
    },
    staleTime: 0,
    gcTime: 0,
  });
}

export function useAcademicPeriods() {
  return useQuery({
    queryKey: schoolQueryKeys.academicPeriods.all,
    queryFn: async (): Promise<AcademicPeriod[]> => {
      const { data, error } = await supabase.from("academic_periods").select("*").order("start_date");
      if (error) throw error;
      return (data ?? []) as AcademicPeriod[];
    },
  });
}

export function useSetAcademicPeriodState() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; is_active: boolean }) => {
      if (data.is_active) {
        const { error: resetError } = await supabase
          .from("academic_periods")
          .update({ is_active: false })
          .neq("id", data.id);

        if (resetError) {
          throw resetError;
        }
      }

      const { data: period, error } = await supabase
        .from("academic_periods")
        .update({ is_active: data.is_active })
        .eq("id", data.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return period as AcademicPeriod;
    },
    onSuccess: (_period, variables) => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.academicPeriods.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecords.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.preescolarEvaluations.all });
      toast({
        title: variables.is_active
          ? "Bimestre activado"
          : "Bimestre desactivado",
        description: variables.is_active
          ? "La plataforma ya reconoce este bimestre como el periodo activo."
          : "El bimestre quedo deshabilitado para edicion activa.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar el bimestre",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
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
      const { data: subject, error } = await supabase.from("subjects").insert(data).select().single();
      if (error) throw error;
      return subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.subjects.all });
      toast({ title: "Materia habilitada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear materia",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
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
        .from("subjects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.subjects.all });
      toast({ title: "Materia actualizada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar materia",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
