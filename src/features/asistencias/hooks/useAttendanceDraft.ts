import { useEffect, useMemo, useState } from "react";
import type { AttendanceStatus, Student, StudentAttendance } from "@/hooks/school/types";
import {
  buildAttendanceDraftFromData,
  type AttendanceDraftMap,
} from "@/features/asistencias/helpers";

interface UseAttendanceDraftProps {
  attendanceRecords: StudentAttendance[];
  contextKey: string;
  selectedContext: unknown;
  students: Student[];
}

export function useAttendanceDraft({
  attendanceRecords,
  contextKey,
  selectedContext,
  students,
}: UseAttendanceDraftProps) {
  const [draftMap, setDraftMap] = useState<AttendanceDraftMap>({});

  const attendanceSummary = useMemo(() => {
    const summary = { absent: 0, justified: 0, pending: 0, present: 0 };
    students.forEach((student) => {
      const status = draftMap[student.id]?.status;
      if (!status) {
        summary.pending += 1;
        return;
      }
      summary[status] += 1;
    });
    return summary;
  }, [draftMap, students]);

  useEffect(() => {
    if (!selectedContext) {
      setDraftMap({});
      return;
    }
    setDraftMap((prevDraft) => {
      const initial = buildAttendanceDraftFromData(students, attendanceRecords);
      const merged = { ...initial };
      Object.keys(prevDraft).forEach((studentId) => {
        if (prevDraft[studentId]?.status) {
          merged[studentId] = prevDraft[studentId];
        }
      });
      return merged;
    });
  }, [attendanceRecords, contextKey, selectedContext, students]);

  const setDraftStatus = (studentId: string, status: AttendanceStatus | "") => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        justification_note: status === "justified" ? (prev[studentId]?.justification_note ?? "") : "",
        status,
      },
    }));
  };

  const setDraftNote = (studentId: string, value: string) => {
    setDraftMap((prev) => ({
      ...prev,
      [studentId]: {
        justification_note: value,
        status: prev[studentId]?.status ?? "",
      },
    }));
  };

  const markAllPresent = () => {
    setDraftMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { justification_note: "", status: "present" };
      });
      return next;
    });
  };

  const markUnmarkedAsAbsent = () => {
    setDraftMap((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        if (!next[s.id]?.status) {
          next[s.id] = { justification_note: "", status: "absent" };
        }
      });
      return next;
    });
  };

  return {
    attendanceSummary,
    draftMap,
    markAllPresent,
    markUnmarkedAsAbsent,
    setDraftMap,
    setDraftNote,
    setDraftStatus,
  };
}
