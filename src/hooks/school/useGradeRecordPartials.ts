import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { schoolQueryKeys } from "@/hooks/school/queryKeys";
import type {
  GradeRecord,
  GradeRecordPartial,
  GradeRecordPartialFilters,
} from "@/hooks/school/types";
import type { TablesInsert } from "@/integrations/types";
import { getFriendlyErrorMessage } from "@/lib/supabaseErrors";

export interface GradeRecordPartialDraft {
  activity_name?: string | null;
  achievements?: string | null;
  comments?: string | null;
  grade: number | null;
  partial_index: number;
}

interface UpsertGradeRecordPartialsInput {
  achievements?: string | null;
  comments?: string | null;
  id?: string;
  partials: GradeRecordPartialDraft[];
  period_id: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
}

function calculateWeightedFinal(partials: GradeRecordPartialDraft[]) {
  const validPartials = partials.filter(
    (partial) =>
      typeof partial.grade === "number"
      && !Number.isNaN(partial.grade),
  );

  if (validPartials.length === 0) {
    return null;
  }

  const gradesTotal = validPartials.reduce(
    (accumulator, partial) => accumulator + (partial.grade as number),
    0,
  );

  return Number((gradesTotal / validPartials.length).toFixed(1));
}

function firstNotEmpty(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function deriveRecordAchievement(partials: GradeRecordPartialDraft[]) {
  for (const partial of partials) {
    const candidate = firstNotEmpty(partial.achievements);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function deriveRecordComments(partials: GradeRecordPartialDraft[]) {
  for (const partial of partials) {
    const candidate = firstNotEmpty(partial.comments);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export function useGradeRecordPartials(filters?: GradeRecordPartialFilters) {
  return useQuery({
    queryKey: schoolQueryKeys.gradeRecordPartials.list(filters),
    queryFn: async (): Promise<GradeRecordPartial[]> => {
      let query = supabase
        .from("grade_record_partials")
        .select(`
          id,
          grade_record_id,
          partial_index,
          activity_name,
          grade,
          achievements,
          comments,
          created_at,
          updated_at,
          grade_records!inner(
            id,
            student_id,
            subject_id,
            teacher_id,
            period_id
          )
        `)
        .order("partial_index", { ascending: true });

      if (filters?.gradeRecordId) {
        query = query.eq("grade_record_id", filters.gradeRecordId);
      }

      if (filters?.studentId) {
        query = query.eq("grade_records.student_id", filters.studentId);
      }

      if (filters?.periodId) {
        query = query.eq("grade_records.period_id", filters.periodId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return (data ?? []) as GradeRecordPartial[];
    },
  });
}

export function useUpsertGradeRecordPartials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: UpsertGradeRecordPartialsInput): Promise<GradeRecord> => {
      const partials = payload.partials.map((partial) => ({
        activity_name: firstNotEmpty(partial.activity_name),
        achievements: firstNotEmpty(partial.achievements),
        comments: firstNotEmpty(partial.comments),
        grade:
          typeof partial.grade === "number" && !Number.isNaN(partial.grade)
            ? partial.grade
            : null,
        partial_index: partial.partial_index,
      }));

      const validPartials = partials.filter((partial) => partial.grade !== null);

      if (validPartials.length === 0) {
        throw new Error("Debes registrar al menos una actividad con nota valida.");
      }

      const recordAchievement = firstNotEmpty(payload.achievements) ?? deriveRecordAchievement(partials);
      const recordComments = firstNotEmpty(payload.comments) ?? deriveRecordComments(partials);
      const initialFinalGrade = calculateWeightedFinal(validPartials) ?? 3;

      const { data: gradeRecord, error: gradeRecordError } = await supabase
        .from("grade_records")
        .upsert(
          {
            achievements: recordAchievement,
            comments: recordComments,
            grade: initialFinalGrade,
            id: payload.id,
            period_id: payload.period_id,
            student_id: payload.student_id,
            subject_id: payload.subject_id,
            teacher_id: payload.teacher_id,
          },
          {
            onConflict: "student_id,subject_id,period_id",
          },
        )
        .select("id")
        .single();

      if (gradeRecordError) {
        throw gradeRecordError;
      }

      const gradeRecordId = gradeRecord.id;

      const partialRows: TablesInsert<"grade_record_partials">[] = validPartials
        .sort((first, second) => first.partial_index - second.partial_index)
        .map((partial, index) => ({
        activity_name: partial.activity_name ?? `Actividad ${index + 1}`,
        achievements: partial.achievements,
        comments: partial.comments,
        grade: partial.grade,
        grade_record_id: gradeRecordId,
        partial_index: index + 1,
      }));

      const { error: partialError } = await supabase
        .from("grade_record_partials")
        .upsert(partialRows, {
          onConflict: "grade_record_id,partial_index",
        });

      if (partialError) {
        throw partialError;
      }

      const { error: trimExtraError } = await supabase
        .from("grade_record_partials")
        .delete()
        .eq("grade_record_id", gradeRecordId)
        .gt("partial_index", partialRows.length);

      if (trimExtraError) {
        throw trimExtraError;
      }

      const { data: refreshedRecord, error: refreshedError } = await supabase
        .from("grade_records")
        .select(`
          *,
          students(*),
          subjects(*),
          teachers(*),
          academic_periods(*)
        `)
        .eq("id", gradeRecordId)
        .single();

      if (refreshedError) {
        throw refreshedError;
      }

      return refreshedRecord as GradeRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecords.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.gradeRecordPartials.all });
      queryClient.invalidateQueries({ queryKey: schoolQueryKeys.guardianGradeRecords.all });
      toast({ title: "Actividades y nota final guardadas exitosamente" });
    },
    onError: (error) => {
      toast({
        title: "Error al guardar actividades",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
