import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import { useAcademicPeriods } from "@/hooks/school/useAcademicData";

export type Notification = {
  id: string;
  created_at: string;
  institution_id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link_url: string | null;
  is_read: boolean;
};

/** Grade notification title used by the DB trigger */
const GRADE_NOTIFICATION_TITLE = "Nueva Calificación";

export function useNotifications() {
  const { user } = useAuth();
  const { data: periods } = useAcademicPeriods();

  const activePeriod = periods?.find((p) => p.is_active) ?? null;

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // ── Auto-dismiss grade notifications from inactive periods ──
  useDismissStaleGradeNotifications(
    query.data ?? [],
    activePeriod?.start_date ?? null,
    user?.id ?? null
  );

  // Filter out stale grade notifications on the client so they
  // disappear instantly while the background mutation propagates.
  const filtered = (query.data ?? []).filter((n) => {
    if (
      n.title === GRADE_NOTIFICATION_TITLE &&
      activePeriod?.start_date &&
      new Date(n.created_at) < new Date(activePeriod.start_date)
    ) {
      return false; // hide grade notif from a previous period
    }
    return true;
  });

  return { ...query, data: filtered };
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal hook: auto-marks grade notifications as read when they belong to
// a period that is no longer active (i.e. created_at < activePeriod.start_date)
// ──────────────────────────────────────────────────────────────────────────────
function useDismissStaleGradeNotifications(
  notifications: Notification[],
  activePeriodStartDate: string | null,
  userId: string | null
) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!activePeriodStartDate || !userId || hasFired.current) return;

    const staleIds = notifications
      .filter(
        (n) =>
          !n.is_read &&
          n.title === GRADE_NOTIFICATION_TITLE &&
          new Date(n.created_at) < new Date(activePeriodStartDate)
      )
      .map((n) => n.id);

    if (staleIds.length === 0) return;

    // Mark once per mount to avoid repeated writes
    hasFired.current = true;

    supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", staleIds)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to auto-dismiss stale grade notifications:", error);
        }
      });
  }, [notifications, activePeriodStartDate, userId]);
}
