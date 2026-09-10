-- Bucket privado: los archivos sólo se entregan mediante la Edge Function
-- secure-student-document, después de validar sesión, tenant, rol y consentimiento.
BEGIN;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-private-documents', 'student-private-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;
COMMIT;
