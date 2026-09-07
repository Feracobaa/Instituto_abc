import { useEffect, useMemo, useState } from "react";
import type { AttendanceClassContext, Schedule } from "@/hooks/school/types";
import { useCurrentClassAutoDetect, type ActiveClassScheduleInfo } from "./useCurrentClassAutoDetect";

export interface OptionItem {
  id: string;
  name: string;
}

export function buildTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface UseAttendanceSelectionProps {
  allClassContexts: AttendanceClassContext[];
  isRector: boolean;
  rawSchedules?: Schedule[] | null;
  selectedDate: string;
  teacherId?: string | null;
}

export function useAttendanceSelection({
  allClassContexts,
  isRector,
  rawSchedules,
  selectedDate,
  teacherId,
}: UseAttendanceSelectionProps) {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const effectiveTeacherId = isRector ? selectedTeacher : teacherId || "";

  // Auto-detección de clase activa según horario
  const { activeClass, hasActiveClass } = useCurrentClassAutoDetect(
    rawSchedules,
    selectedDate,
    effectiveTeacherId || undefined,
  );

  const teacherOptions = useMemo(() => {
    const optionsMap = new Map<string, OptionItem>();
    allClassContexts.forEach((context) => {
      if (!optionsMap.has(context.teacher_id)) {
        optionsMap.set(context.teacher_id, {
          id: context.teacher_id,
          name: context.teacher_name,
        });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [allClassContexts]);

  // Sincronización de docente
  useEffect(() => {
    if (!isRector && teacherId) {
      setSelectedTeacher(teacherId);
      return;
    }
    if (isRector && !selectedTeacher && teacherOptions.length === 1) {
      setSelectedTeacher(teacherOptions[0].id);
    }
  }, [isRector, selectedTeacher, teacherId, teacherOptions]);

  useEffect(() => {
    if (isRector && selectedTeacher && !teacherOptions.some((opt) => opt.id === selectedTeacher)) {
      setSelectedTeacher("");
    }
  }, [isRector, selectedTeacher, teacherOptions]);

  const teacherScopedContexts = useMemo(() => {
    if (!isRector || !selectedTeacher) return allClassContexts;
    return allClassContexts.filter((c) => c.teacher_id === selectedTeacher);
  }, [allClassContexts, isRector, selectedTeacher]);

  const gradeOptions = useMemo(() => {
    const optionsMap = new Map<string, OptionItem>();
    teacherScopedContexts.forEach((c) => {
      if (!optionsMap.has(c.grade_id)) {
        optionsMap.set(c.grade_id, { id: c.grade_id, name: c.grade_name });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [teacherScopedContexts]);

  useEffect(() => {
    if (selectedGrade && !gradeOptions.some((opt) => opt.id === selectedGrade)) {
      setSelectedGrade("");
      setSelectedSubject("");
    }
  }, [selectedGrade, gradeOptions]);

  const gradeScopedContexts = useMemo(() => {
    if (!selectedGrade) return teacherScopedContexts;
    return teacherScopedContexts.filter((c) => c.grade_id === selectedGrade);
  }, [selectedGrade, teacherScopedContexts]);

  const subjectOptions = useMemo(() => {
    const optionsMap = new Map<string, OptionItem>();
    gradeScopedContexts.forEach((c) => {
      if (!optionsMap.has(c.subject_id)) {
        optionsMap.set(c.subject_id, { id: c.subject_id, name: c.subject_name });
      }
    });
    return [...optionsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [gradeScopedContexts]);

  useEffect(() => {
    if (selectedSubject && !subjectOptions.some((opt) => opt.id === selectedSubject)) {
      setSelectedSubject("");
    }
  }, [selectedSubject, subjectOptions]);

  const selectedContext = useMemo(() => {
    if (!selectedGrade || !selectedSubject || !effectiveTeacherId) return null;
    return (
      allClassContexts.find(
        (c) =>
          c.grade_id === selectedGrade &&
          c.subject_id === selectedSubject &&
          c.teacher_id === effectiveTeacherId,
      ) ?? null
    );
  }, [allClassContexts, effectiveTeacherId, selectedGrade, selectedSubject]);

  const applyActiveClass = (info?: ActiveClassScheduleInfo | null) => {
    const target = info ?? activeClass;
    if (!target) return;
    if (isRector && target.teacherId) {
      setSelectedTeacher(target.teacherId);
    }
    setSelectedGrade(target.gradeId);
    setSelectedSubject(target.subjectId);
  };

  return {
    activeClass,
    applyActiveClass,
    effectiveTeacherId,
    gradeOptions,
    hasActiveClass,
    selectedContext,
    selectedGrade,
    selectedSubject,
    selectedTeacher,
    setSelectedGrade,
    setSelectedSubject,
    setSelectedTeacher,
    subjectOptions,
    teacherOptions,
  };
}
