import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type {
  AccountingLedgerEntry,
  FinancialTransaction,
  InventoryItem,
  Student,
  TuitionMonthStatus,
  TuitionPayment,
  TuitionProfile,
  TuitionSummary,
} from "@/hooks/school/types";

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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

export function useAccountingStudents() {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.students,
    queryFn: async (): Promise<Array<Pick<Student, "id" | "full_name">>> => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .or("is_active.is.null,is_active.eq.true")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<Pick<Student, "id" | "full_name">>;
    },
  });
}

export function useAccountingTeachers() {
  return useQuery({
    queryKey: ["accounting_teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, is_active")
        .or("is_active.is.null,is_active.eq.true")
        .order("full_name");
      if (error) throw error;
      return data;
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

export interface TuitionPaymentWithStudent extends TuitionPayment {
  students: Pick<Student, "full_name"> | null;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      student_id: string;
      student_name: string;
      period_month: string;
      amount: number;
    }) => {
      // Find guardian accounts for this student
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
  const { toast } = useToast();

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
  const { toast } = useToast();

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
  const { toast } = useToast();

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

export function useAccountingLedger(periodMonth?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.ledger(periodMonth),
    queryFn: async (): Promise<AccountingLedgerEntry[]> => {
      let query = supabase
        .from("accounting_ledger")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (periodMonth) {
        query = query.eq("period_month", periodMonth);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AccountingLedgerEntry[];
    },
  });
}

export function useFinancialTransactions(filters?: {
  periodMonth?: string;
  movementType?: FinancialTransaction["movement_type"];
  category?: FinancialTransaction["category"];
}) {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.transactions(filters),
    queryFn: async (): Promise<FinancialTransaction[]> => {
      let query = supabase
        .from("financial_transactions")
        .select("*, teachers(full_name)")
        .order("transaction_date", { ascending: false });
      if (filters?.periodMonth) {
        query = query.eq("period_month", filters.periodMonth);
      }
      if (filters?.movementType) {
        query = query.eq("movement_type", filters.movementType);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FinancialTransaction[];
    },
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Omit<FinancialTransaction, "id" | "created_at" | "updated_at" | "institution_id">) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FinancialTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Movimiento registrado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al registrar el movimiento",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFinancialTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Movimiento eliminado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar movimiento",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useInventoryItems() {
  return useQuery({
    queryKey: schoolQueryKeys.accounting.inventory,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("acquisition_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "institution_id">) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as InventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.inventory });
      toast({ title: "Item de inventario creado" });
    },
    onError: (error) => {
      toast({
        title: "Error al crear inventario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: Pick<InventoryItem, "id"> & Partial<InventoryItem>) => {
      const { id, ...updateData } = payload;
      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.inventory });
      toast({ title: "Inventario actualizado" });
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar inventario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.accounting.inventory });
      queryClient.invalidateQueries({ queryKey: ["accounting", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting", "ledger"] });
      toast({ title: "Item eliminado exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar item",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
