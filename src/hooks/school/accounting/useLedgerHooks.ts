import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type {
  AccountingLedgerEntry,
  FinancialTransaction,
} from "@/hooks/school/types";

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
