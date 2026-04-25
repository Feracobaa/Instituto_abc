import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Attendance summary for a single student (for parent portal)
export function useGuardianStudentAttendance(studentId?: string) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["guardian_attendance", studentId ?? null],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("student_attendance")
        .select("id, attendance_date, status, subjects(name)")
        .eq("student_id", studentId)
        .order("attendance_date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        attendance_date: string;
        status: string;
        subjects: { name: string } | null;
      }[];
    },
  });
}

// Tuition month status for a single student (for parent portal)
export function useGuardianTuitionStatus(studentId?: string) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["guardian_tuition_status", studentId ?? null],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("student_tuition_month_status")
        .select("period_month, status, expected_amount, paid_amount, pending_amount")
        .eq("student_id", studentId)
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as {
        period_month: string | null;
        status: string | null;
        expected_amount: number | null;
        paid_amount: number | null;
        pending_amount: number | null;
      }[];
    },
  });
}
