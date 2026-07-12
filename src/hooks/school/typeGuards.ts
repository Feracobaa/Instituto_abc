/**
 * Type Guards & Validators for School Types
 * Provides runtime validation and safe type conversion
 * 
 * Purpose: Eliminate unsafe `as` castings by providing validated conversions
 */

import type { Teacher, Student, GradeRecord, UserRole, Profile, StudentAttendance } from "./types";

// ============================================================================
// TYPE GUARDS - Validate at runtime if value matches type
// ============================================================================

/**
 * Type guard: Check if value is a valid Teacher
 * @param value - Value to check
 * @returns true if value matches Teacher interface
 */
export function isTeacher(value: unknown): value is Teacher {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    typeof obj.full_name === "string" &&
    typeof obj.email === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.institution_id === "string"
  );
}

/**
 * Type guard: Check if value is a valid array of Teachers
 */
export function isTeacherArray(value: unknown): value is Teacher[] {
  return Array.isArray(value) && value.every(isTeacher);
}

/**
 * Type guard: Check if value is a valid Student
 */
export function isStudent(value: unknown): value is Student {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    typeof obj.full_name === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.institution_id === "string"
  );
}

/**
 * Type guard: Check if value is a valid array of Students
 */
export function isStudentArray(value: unknown): value is Student[] {
  return Array.isArray(value) && value.every(isStudent);
}

/**
 * Type guard: Check if value is a valid GradeRecord
 */
export function isGradeRecord(value: unknown): value is GradeRecord {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    typeof obj.student_id === "string" &&
    typeof obj.subject_id === "string" &&
    typeof obj.teacher_id === "string" && // CRITICAL: Must NOT be NULL
    typeof obj.period_id === "string" &&
    typeof obj.grade === "number" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.institution_id === "string"
  );
}

/**
 * Type guard: Check if value is a valid array of GradeRecords
 */
export function isGradeRecordArray(value: unknown): value is GradeRecord[] {
  return Array.isArray(value) && value.every(isGradeRecord);
}

/**
 * Type guard: Check if value is a valid StudentAttendance
 */
export function isStudentAttendance(value: unknown): value is StudentAttendance {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    typeof obj.student_id === "string" &&
    typeof obj.grade_id === "string" &&
    typeof obj.subject_id === "string" &&
    typeof obj.teacher_id === "string" &&
    typeof obj.attendance_date === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.institution_id === "string"
  );
}

/**
 * Type guard: Check if value is a valid array of StudentAttendance
 */
export function isStudentAttendanceArray(value: unknown): value is StudentAttendance[] {
  return Array.isArray(value) && value.every(isStudentAttendance);
}

/**
 * Type guard: Check if value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  const validRoles = ["rector", "profesor", "parent", "admin", "contable"];
  
  return (
    typeof obj.id === "string" &&
    typeof obj.user_id === "string" &&
    typeof obj.role === "string" &&
    validRoles.includes(obj.role as string) &&
    typeof obj.institution_id === "string"
  );
}

/**
 * Type guard: Check if value is a valid Profile
 */
export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === "string" &&
    typeof obj.user_id === "string" &&
    typeof obj.full_name === "string" &&
    typeof obj.email === "string" &&
    typeof obj.created_at === "string" &&
    typeof obj.updated_at === "string" &&
    typeof obj.institution_id === "string"
  );
}

// ============================================================================
// SAFE CONVERSION FUNCTIONS - Convert with validation
// ============================================================================

/**
 * Safely convert value to Teacher[]
 * @throws Error if conversion fails
 */
export function asTeacherArray(value: unknown, context?: string): Teacher[] {
  if (isTeacherArray(value)) return value;
  
  if (Array.isArray(value)) {
    const invalid = value.findIndex(v => !isTeacher(v));
    throw new Error(
      `Cannot convert to Teacher[] at index ${invalid}${context ? ` (${context})` : ""}`
    );
  }
  
  throw new Error(
    `Expected Teacher[] but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to Student[]
 * @throws Error if conversion fails
 */
export function asStudentArray(value: unknown, context?: string): Student[] {
  if (isStudentArray(value)) return value;
  
  if (Array.isArray(value)) {
    const invalid = value.findIndex(v => !isStudent(v));
    throw new Error(
      `Cannot convert to Student[] at index ${invalid}${context ? ` (${context})` : ""}`
    );
  }
  
  throw new Error(
    `Expected Student[] but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to GradeRecord[]
 * @throws Error if conversion fails
 */
export function asGradeRecordArray(value: unknown, context?: string): GradeRecord[] {
  if (isGradeRecordArray(value)) return value;
  
  if (Array.isArray(value)) {
    const invalid = value.findIndex(v => !isGradeRecord(v));
    throw new Error(
      `Cannot convert to GradeRecord[] at index ${invalid}${context ? ` (${context})` : ""}`
    );
  }
  
  throw new Error(
    `Expected GradeRecord[] but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to Teacher
 * @throws Error if conversion fails
 */
export function asTeacher(value: unknown, context?: string): Teacher {
  if (isTeacher(value)) return value;
  
  throw new Error(
    `Expected Teacher but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to Student
 * @throws Error if conversion fails
 */
export function asStudent(value: unknown, context?: string): Student {
  if (isStudent(value)) return value;
  
  throw new Error(
    `Expected Student but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to GradeRecord
 * @throws Error if conversion fails
 */
export function asGradeRecord(value: unknown, context?: string): GradeRecord {
  if (isGradeRecord(value)) return value;
  
  throw new Error(
    `Expected GradeRecord but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}

/**
 * Safely convert value to StudentAttendance[]
 * @throws Error if conversion fails
 */
export function asStudentAttendanceArray(value: unknown, context?: string): StudentAttendance[] {
  if (isStudentAttendanceArray(value)) return value;
  
  if (Array.isArray(value)) {
    const invalid = value.findIndex(v => !isStudentAttendance(v));
    throw new Error(
      `Cannot convert to StudentAttendance[] at index ${invalid}${context ? ` (${context})` : ""}`
    );
  }
  
  throw new Error(
    `Expected StudentAttendance[] but got ${typeof value}${context ? ` (${context})` : ""}`
  );
}