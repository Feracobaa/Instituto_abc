import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  Assignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
  EvaluateSubmissionPayload,
  SubmitAssignmentPayload,
} from "@/types/assignments";
import { optimizeHomeworkImage } from "@/utils/imageScannerOptimizer";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export function useAssignmentsList(filters?: {
  gradeId?: string;
  teacherId?: string;
  periodId?: string;
  studentId?: string;
}) {
  return useQuery({
    queryKey: schoolQueryKeys.assignments.list(filters?.gradeId, filters?.teacherId, filters?.periodId),
    queryFn: async (): Promise<Assignment[]> => {
      let query = supabase
        .from("assignments")
        .select(`
          *,
          teachers(id, full_name, email),
          grades(id, name, level),
          subjects(id, name, color),
          academic_periods(id, name)
        `)
        .order("due_date", { ascending: true });

      if (filters?.gradeId) {
        query = query.eq("grade_id", filters.gradeId);
      }

      if (filters?.teacherId) {
        query = query.eq("teacher_id", filters.teacherId);
      }

      if (filters?.periodId) {
        query = query.eq("period_id", filters.periodId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const assignments = (data ?? []) as unknown as Assignment[];

      // Si tenemos studentId, obtener también las entregas del estudiante para mapear estados
      if (filters?.studentId && assignments.length > 0) {
        const assignmentIds = assignments.map((a) => a.id);
        const { data: submissionsData } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", filters.studentId)
          .in("assignment_id", assignmentIds);

        const submissionsMap = new Map<string, AssignmentSubmission>();
        (submissionsData ?? []).forEach((sub) => {
          submissionsMap.set(sub.assignment_id, sub as unknown as AssignmentSubmission);
        });

        return assignments.map((a) => ({
          ...a,
          user_submission: submissionsMap.get(a.id) ?? null,
        }));
      }

      return assignments;
    },
  });
}

export function useAssignmentSubmissionsList(assignmentId?: string) {
  return useQuery({
    queryKey: schoolQueryKeys.assignmentSubmissions.listByAssignment(assignmentId ?? ""),
    enabled: Boolean(assignmentId),
    queryFn: async (): Promise<AssignmentSubmission[]> => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select(`
          *,
          students(id, full_name, grade_id)
        `)
        .eq("assignment_id", assignmentId as string)
        .order("submitted_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as unknown as AssignmentSubmission[];
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAssignmentPayload) => {
      const { data: instId, error: instErr } = await supabase.rpc("current_institution_id");
      if (instErr || !instId) {
        throw new Error("No se pudo obtener la institución actual.");
      }

      const { data, error } = await supabase
        .from("assignments")
        .insert({
          institution_id: instId,
          teacher_id: payload.teacher_id,
          grade_id: payload.grade_id,
          subject_id: payload.subject_id,
          period_id: payload.period_id || null,
          title: payload.title,
          description_json: payload.description_json || null,
          due_date: payload.due_date,
          attachment_url: payload.attachment_url || null,
          status: payload.status || "published",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.assignments.all });
      toast.success("Tarea publicada correctamente.");
    },
    onError: (error) => {
      toast.error(`Error al publicar tarea: ${getFriendlyErrorMessage(error)}`);
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.assignments.all });
      toast.success("Tarea eliminada.");
    },
    onError: (error) => {
      toast.error(`Error al eliminar tarea: ${getFriendlyErrorMessage(error)}`);
    },
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitAssignmentPayload) => {
      const { data: instId, error: instErr } = await supabase.rpc("current_institution_id");
      if (instErr || !instId) {
        throw new Error("No se pudo obtener la institución actual.");
      }

      let uploadedFileUrl: string | null = payload.file_url || null;

      // Si el estudiante adjunta un archivo/foto, procesarlo con el Optimizador de Escáner
      if (payload.file) {
        toast.info("Optimizando y escaneando evidencia...");
        const optimized = await optimizeHomeworkImage(payload.file, { mode: "scanner" });

        const fileName = `${instId}/${payload.assignment_id}/${payload.student_id}_${Date.now()}.webp`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("assignment-files")
          .upload(fileName, optimized.file, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadErr) {
          // Si el bucket público falla o no está creado aún, usar DataURL optimizado o manejar error
          console.warn("Storage upload warn, falling back to data URL if needed", uploadErr);
        }

        if (uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from("assignment-files")
            .getPublicUrl(uploadData.path);
          uploadedFileUrl = publicUrlData.publicUrl;
        } else {
          uploadedFileUrl = optimized.dataUrl;
        }

        toast.success(`Evidencia reducida de ${(optimized.originalSize / 1024).toFixed(0)} KB a solo ${(optimized.optimizedSize / 1024).toFixed(0)} KB!`);
      }

      // Upsert entrega del estudiante
      const { data, error } = await supabase
        .from("assignment_submissions")
        .upsert(
          {
            institution_id: instId,
            assignment_id: payload.assignment_id,
            student_id: payload.student_id,
            submission_text: payload.submission_text || null,
            file_url: uploadedFileUrl,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,student_id" }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.assignmentSubmissions.all });
      toast.success("Tarea entregada con éxito.");
    },
    onError: (error) => {
      toast.error(`Error al entregar tarea: ${getFriendlyErrorMessage(error)}`);
    },
  });
}

export function useEvaluateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EvaluateSubmissionPayload) => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .update({
          score: payload.score ?? null,
          feedback: payload.feedback ?? null,
          status: payload.status || "evaluated",
        })
        .eq("id", payload.submission_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.assignmentSubmissions.all });
      toast.success("Retroalimentación guardada.");
    },
    onError: (error) => {
      toast.error(`Error al evaluar entrega: ${getFriendlyErrorMessage(error)}`);
    },
  });
}
