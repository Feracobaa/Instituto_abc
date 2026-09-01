import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type {
  Student,
  TuitionMonthStatus,
  TuitionPayment,
  TuitionProfile,
  TuitionSummary,
} from "@/hooks/school/types";

export interface TuitionPaymentWithStudent extends TuitionPayment {
  students: Pick<Student, "full_name"> | null;
}

export function useTuitionProfiles() {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.tuitionProfiles,
    queryFn: async (): Promise<TuitionProfile[]> => {
      const { data, error } = await supabase
        .from("student_tuition_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TuitionProfile[];
    },
  });
}

export function useCreateTuitionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<TuitionProfile, "id" | "created_at" | "updated_at" | "institution_id">) => {
      const { data, error } = await supabase
        .from("student_tuition_profiles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as TuitionProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionProfiles });
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      toast({ title: "Pension asignada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al asignar pension",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTuitionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Pick<TuitionProfile, "id"> & Partial<TuitionProfile>) => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from("student_tuition_profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TuitionProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionProfiles });
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      toast({ title: "Pension actualizada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar pension",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useBulkAssignTuitionProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      monthly_tuition: number;
      charge_start_month: string;
      charge_end_month?: string | null;
      overwrite?: boolean;
    }) => {
      const { data, error } = await supabase
        .rpc("bulk_assign_tuition_profiles", {
          p_monthly_tuition: payload.monthly_tuition,
          p_charge_start_month: payload.charge_start_month,
          p_charge_end_month: payload.charge_end_month ?? null,
          p_overwrite: payload.overwrite ?? false,
        });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionProfiles });
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      toast({
        title: "Pensiones asignadas",
        description: `Registros afectados: ${count}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al asignar pensiones",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useTuitionSummary() {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.tuitionSummary,
    queryFn: async (): Promise<TuitionSummary[]> => {
      const { data, error } = await supabase
        .from("student_tuition_summary")
        .select("*")
        .order("total_pending", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TuitionSummary[];
    },
  });
}

export function useTuitionPayments(periodMonth?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.payments(periodMonth),
    queryFn: async (): Promise<TuitionPaymentWithStudent[]> => {
      let query = supabase
        .from("student_tuition_payments")
        .select("*, students(full_name)")
        .order("payment_date", { ascending: false });
      if (periodMonth) {
        query = query.eq("period_month", periodMonth);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TuitionPaymentWithStudent[];
    },
  });
}

export function useTuitionMonthStatus(periodMonth?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.tuitionMonthStatus(periodMonth),
    queryFn: async (): Promise<TuitionMonthStatus[]> => {
      let query = supabase
        .from("student_tuition_month_status")
        .select("*")
        .order("student_name");
      if (periodMonth) {
        query = query.eq("period_month", periodMonth);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TuitionMonthStatus[];
    },
  });
}

export function useSendPaymentNotification() {
  return useMutation({
    mutationFn: async (payload: {
      student_id: string;
      student_name: string;
      period_month: string;
      amount: number;
    }) => {
      const { data: accounts, error: accountsError } = await supabase
        .from("student_guardian_accounts")
        .select("user_id, institution_id")
        .eq("student_id", payload.student_id);

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) {
        throw new Error("El estudiante no tiene una cuenta de acudiente vinculada.");
      }

      const notifications = accounts.map(acc => ({
        user_id: acc.user_id,
        institution_id: acc.institution_id,
        title: "Recordatorio de Pensión",
        message: `Se le recuerda el pago de la pensión de ${payload.student_name} correspondiente a ${payload.period_month} por un valor de $${(payload.amount > 0 && payload.amount < 1000 ? payload.amount * 1000 : payload.amount).toLocaleString('es-CO')}.`,
        type: "warning",
        link_url: "/portal",
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({ title: "Notificación enviada exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al enviar notificación",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useRegisterStudentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      student_id: string;
      period_month: string;
      amount: number;
      payment_date: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .rpc("register_student_payment", {
          p_student_id: payload.student_id,
          p_period_month: payload.period_month,
          p_amount: payload.amount,
          p_payment_date: payload.payment_date,
          p_notes: payload.notes ?? null,
        })
        .single();
      if (error) throw error;
      return data as TuitionPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.payments() });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Pago registrado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al registrar el pago",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTuitionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("student_tuition_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.payments() });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Pago eliminado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar pago",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTuitionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.rpc("reset_student_tuition_profile", {
        p_student_id: studentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionProfiles });
      queryClient.invalidateQueries({ queryKey: ["accounting", "tuition_month_status"] });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.tuitionSummary });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.payments() });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Estudiante reseteado", description: "Se eliminó el perfil de pensión y todos los pagos registrados." });
    },
    onError: (error) => {
      toast({
        title: "Error al resetear estudiante",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
