// @ts-expect-error Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-expect-error Deno source
import { getCorsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };

type RequestBody = { documentId: string; action: "VIEW" | "DOWNLOAD" | "GENERATE_URL" };
const json = (body: unknown, status: number, headers: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (request) => {
  const headers = getCorsHeaders(request);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
  const url = Deno.env.get("SUPABASE_URL"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Service configuration missing" }, 500, headers);
  const bearer = request.headers.get("Authorization") ?? "";
  const auth = createClient(url, serviceKey, { global: { headers: { Authorization: bearer } } });
  const admin = createClient(url, serviceKey);
  const { data: authData } = await auth.auth.getUser();
  const user = authData.user;
  if (!user) return json({ error: "Authentication required" }, 401, headers);
  const body = await request.json().catch(() => null) as RequestBody | null;
  if (!body?.documentId || !body.action) return json({ error: "Invalid request" }, 400, headers);

  const { data: document } = await admin.from("student_documents")
    .select("id,institution_id,student_id,storage_path,document_type_id,document_types(code,requires_consent,allowed_roles)")
    .eq("id", body.documentId).eq("is_active", true).maybeSingle();
  if (!document) return json({ error: "Document not found" }, 404, headers);
  const { data: membership } = await admin.from("institution_memberships").select("role")
    .eq("user_id", user.id).eq("institution_id", document.institution_id).maybeSingle();
  const type = document.document_types as unknown as { code: string; requires_consent: boolean; allowed_roles: string[] } | null;
  let reason: string | null = null;
  if (!membership) reason = "No active membership for institution";
  else if (!type?.allowed_roles?.includes(membership.role)) reason = "Role is not authorized for this document type";
  if (!reason && type?.requires_consent) {
    const { data: consent } = await admin.from("student_consents").select("id").eq("student_id", document.student_id)
      .eq("purpose", "DOCUMENT_STORAGE").eq("status", "GRANTED").maybeSingle();
    if (!consent) reason = "No active document-storage consent";
  }
  await admin.rpc("log_sensitive_document_access", {
    p_student_id: document.student_id, p_document_id: document.id, p_action: body.action,
    p_document_type: type?.code ?? "UNKNOWN", p_success: !reason, p_denied_reason: reason,
    p_ip_address: request.headers.get("x-forwarded-for"), p_user_agent: request.headers.get("user-agent"),
  });
  if (reason) return json({ error: "Access denied" }, 403, headers);
  const { data: signed, error } = await admin.storage.from("student-private-documents").createSignedUrl(document.storage_path, 300, { download: body.action === "DOWNLOAD" });
  if (error || !signed) return json({ error: "Unable to create temporary document URL" }, 500, headers);
  return json({ signedUrl: signed.signedUrl, expiresInSeconds: 300 }, 200, headers);
});
