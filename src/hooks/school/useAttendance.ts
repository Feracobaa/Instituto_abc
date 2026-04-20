import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildAttendanceClassContexts } from "@/features/asistencias/helpers";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  AttendanceClassContext,
  AttendanceClassFilters,
  AttendanceSaveRow,
  Schedule,
  Student,
  StudentAttendance,
  StudentAttendanceFilters,
} from "@/hooks/school/types";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

interface SaveStudentAttendanceInput {
  attendance_date: string;
  grade_id: string;
  rows: AttendanceSaveRow[];
  subject_id: string;
  teacher_id: string;
}

export function useAttendanceClassContexts(filters?: AttendanceClassFilters) {
  return useQuery({
    enabled: Boolean(filters?.date),
    queryKey: schoolQueryKeys.attendance.classContexts(filters?.date, filters?.teacherId),
    queryFn: async (): Promise<AttendanceClassContext[]> => {
      if (!filters?.date) {
        return [];
      }

      let query = supabase
        .from("schedules")
        .select(`
          *,
          grades(*),
          subjects(*),
          teachers(*)
        `)
        .not("subject_id", "is", null)
        .not("teacher_id", "is", null);

      if (filters.teacherId) {
        query = query.eq("teacher_id", filters.teacherId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return buildAttendanceClassContexts((data ?? []) as Schedule[], filters.date);
    },
  });
}

export function useStudentAttendance(filters?: StudentAttendanceFilters) {
  return useQuery({
    queryKey: schoolQueryKeys.attendance.list(filters),
    queryFn: async (): Promise<StudentAttendance[]> => {
      if (!filters?.date || !filters?.gradeId || !filters?.subjectId || !filters?.teacherId) {
        return [];
      }

      let query = supabase
        .from("student_attendance")
        .select(`
          *,
          students(*),
          grades(*),
          subjects(*),
          teachers(*),
          academic_periods(*)
        `)
        .eq("attendance_date", filters.date)
        .eq("grade_id", filters.gradeId)
        .eq("subject_id", filters.subjectId)
        .eq("teacher_id", filters.teacherId)
        .order("created_at", { ascending: true });

      if (filters.studentId) {
        query = query.eq("student_id", filters.studentId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return (data ?? []) as StudentAttendance[];
    },
  });
}

export function useAttendanceStudents(gradeId?: string) {
  return useQuery({
    enabled: Boolean(gradeId),
    queryKey: schoolQueryKeys.attendance.students(gradeId),
    queryFn: async (): Promise<Student[]> => {
      if (!gradeId) {
        return [];
      }

      const { data, error } = await supabase
        .from("students")
        .select(`*, grades(*)`)
        .eq("grade_id", gradeId)
        .or("is_active.is.null,is_active.eq.true")
        .order("full_name");

      if (error) {
        throw error;
      }

      return (data ?? []) as Student[];
    },
  });
}

export function useSaveStudentAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: SaveStudentAttendanceInput) => {
      const { data, error } = await supabase.rpc("save_student_attendance", {
        p_attendance_date: payload.attendance_date,
        p_grade_id: payload.grade_id,
        p_rows: payload.rows,
        p_subject_id: payload.subject_id,
        p_teacher_id: payload.teacher_id,
      });

      if (error) {
        throw error;
      }

      return data ?? 0;
    },
    onSuccess: (rowsSaved) => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.attendance.all });
      toast({
        description: `${rowsSaved} registro(s) actualizado(s).`,
        title: "Asistencia guardada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar asistencia",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
