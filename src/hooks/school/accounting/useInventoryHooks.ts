import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { toast } from "@/components/ui/sonner";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";
import type { InventoryItem, Student } from "@/hooks/school/types";

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
