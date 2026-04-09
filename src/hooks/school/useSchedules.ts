import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type { Schedule, ScheduleInsert } from "@/hooks/school/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function useSchedules(gradeId?: string, teacherId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.schedules.list(gradeId, teacherId),
    queryFn: async (): Promise<Schedule[]> => {
      let query = supabase
        .from("schedules")
        .select(`
          *,
          subjects(*),
          teachers(*),
          grades(*)
        `)
        .order("day_of_week")
        .order("start_time");

      if (gradeId) {
        query = query.eq("grade_id", gradeId);
      }
      if (teacherId) {
        query = query.eq("teacher_id", teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Schedule[];
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ScheduleInsert | ScheduleInsert[]) => {
      const isArray = Array.isArray(data);
      const { data: schedule, error } = await supabase.from("schedules").insert(data).select();
      if (error) throw error;
      return isArray ? schedule : schedule[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.schedules.all });
      toast({ title: "Bloque de horario creado" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear horario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.schedules.all });
      toast({ title: "Bloque de horario eliminado" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar horario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
