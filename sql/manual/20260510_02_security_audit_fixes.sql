-- 1. FIX: "Public Bucket Allows Listing"
-- Drop the broad SELECT policy on storage.objects to prevent listing all files.
-- For a public bucket, users can still download files via getPublicUrl without a SELECT policy.
DROP POLICY IF EXISTS "Logos public access" ON storage.objects;

-- 2. FIX: "Public/Signed-In Users Can Execute SECURITY DEFINER Function"
-- By default, PostgreSQL grants EXECUTE to PUBLIC for all functions.
-- We must revoke this and grant it only to roles that actually need it.

-- First, change default privileges for future functions to not grant EXECUTE to PUBLIC
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- A. Revoke EXECUTE from PUBLIC for ALL flagged functions
REVOKE EXECUTE ON FUNCTION public.audit_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bulk_assign_tuition_profiles(numeric, date, date, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_attendance_context(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_grade_record(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_mutate_module(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_module(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_institution_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_institution_module_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_teacher_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_institution_branding(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_report_snapshot(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role_module_access(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_module_enabled_for_current_institution(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_module_enabled_for_institution(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_provider_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_contable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_in_institution(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_parent() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_profesor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_user_rector() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_assign_user_role_by_email(uuid, text, public.user_role_enum, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_capture_audit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_clear_institution_context() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_clear_institution_module_override(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_create_institution(text, text, text, uuid, text, date, date, text, date, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_detect_identity_drift() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_get_institution_modules(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_get_role_permissions_matrix() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_get_support_context() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_link_rector_by_email(uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_repair_identity_drift(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_set_institution_active(uuid, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_set_institution_context(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_set_institution_module_override(uuid, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_set_plan_module_access(uuid, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provider_set_role_permission(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provision_institution(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_audit_logs(interval) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_student_payment(uuid, date, numeric, date, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_student_tuition_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_student_attendance(date, uuid, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_teacher_assignments_from_schedule() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_guardian_profile(text, text, text, date, boolean) FROM PUBLIC;

-- B. Explicitly grant EXECUTE to 'authenticated' for frontend/RLS-facing functions
GRANT EXECUTE ON FUNCTION public.bulk_assign_tuition_profiles(numeric, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_attendance_context(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_grade_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mutate_module(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_module(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_institution_module_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_report_snapshot(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_module_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_module_enabled_for_current_institution(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_module_enabled_for_institution(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_contable() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_institution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_parent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_profesor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_rector() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_assign_user_role_by_email(uuid, text, public.user_role_enum, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_capture_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_clear_institution_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_clear_institution_module_override(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_create_institution(text, text, text, uuid, text, date, date, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_detect_identity_drift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_get_institution_modules(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_get_role_permissions_matrix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_get_support_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_link_rector_by_email(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_repair_identity_drift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_set_institution_active(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_set_institution_context(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_set_institution_module_override(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_set_plan_module_access(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_set_role_permission(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_institution(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_audit_logs(interval) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_student_payment(uuid, date, numeric, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_student_tuition_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_student_attendance(date, uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_teacher_assignments_from_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_guardian_profile(text, text, text, date, boolean) TO authenticated;

-- C. Explicitly grant EXECUTE to 'anon' (and 'authenticated') ONLY for public frontend functions
GRANT EXECUTE ON FUNCTION public.get_public_institution_branding(text) TO anon, authenticated;

-- NOTE: Triggers (audit_trigger, handle_new_user) do not get granted to ANYONE. 
-- They are only executed internally by the database triggers.
