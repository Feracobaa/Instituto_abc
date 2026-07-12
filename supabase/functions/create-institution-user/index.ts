// create-institution-user - Supabase Edge Function
// Used by rectors to create staff accounts (contable, profesor) within their institution.
// Uses admin.createUser() so it works even with "Allow new users to sign up" disabled.

// @ts-expect-error: Deno HTTP imports are not resolved in Node/Browser environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import { corsHeaders } from "../_shared/cors.ts";

// Workaround for IDE using Node.js/Browser tsconfig instead of Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

// Types
interface CreateUserPayload {
  email: string;
  full_name: string;
  role: "contable" | "profesor";
  temporary_password?: string;
}

// Helpers
function generatePassword(): string {
  const adj = ["Coral","Amber","Storm","Swift","Lunar","Solar","Cedar","Delta","Brave","Noble"];
  const noun = ["Eagle","River","Flame","Stone","Atlas","Titan","Blaze","Arrow","Pearl","Crest"];
  const sym = ["#","@","!","$","&"];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const s = sym[Math.floor(Math.random() * sym.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}${s}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

  // callerClient uses the caller's JWT — only to verify identity
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // adminClient uses service_role — for all write operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 1. Verify caller identity
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser) return json({ error: "Unauthorized." }, 401);

  // 2. Verify caller is a rector
  const { data: roleRow, error: roleError } = await adminClient
    .from("user_roles")
    .select("role, institution_id")
    .eq("user_id", callerUser.id)
    .maybeSingle();

  if (roleError) return json({ error: `Could not verify role: ${roleError.message}` }, 500);
  if (!roleRow || roleRow.role !== "rector") {
    return json({ error: "Forbidden: only rectors can create staff accounts." }, 403);
  }

  const callerInstitutionId = roleRow.institution_id;
  if (!callerInstitutionId) {
    return json({ error: "Rector has no institution assigned." }, 400);
  }

  // 3. Validate payload
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const { email, full_name, role, temporary_password } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return json({ error: "Invalid email." }, 400);
  }
  if (!full_name || typeof full_name !== "string" || (full_name as string).trim().length < 2) {
    return json({ error: "full_name too short." }, 400);
  }
  if (!["contable", "profesor"].includes(role as string)) {
    return json({ error: "Invalid role. Must be 'contable' or 'profesor'." }, 400);
  }
  if (temporary_password !== undefined && (typeof temporary_password !== "string" || (temporary_password as string).length < 8)) {
    return json({ error: "temporary_password must be at least 8 characters." }, 400);
  }

  const cleanEmail = (email as string).trim().toLowerCase();
  const cleanName = (full_name as string).trim();
  const tempPassword = (temporary_password as string) || generatePassword();

  // 4. Create auth user via admin API (works even with sign-ups disabled)
  // The PostgreSQL trigger "handle_new_user" will automatically create the
  // profile, user_roles, and institution_memberships when these metadata fields are present.
  const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: cleanEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: cleanName,
      institution_id: callerInstitutionId,
      role: role as string,
      must_change_password: true,
    },
  });

  if (createAuthError || !newAuthUser.user) {
    const isDuplicate = createAuthError?.message?.toLowerCase().includes("already");
    return json({
      error: isDuplicate
        ? "Ya existe un usuario con ese correo."
        : `Error de autenticación: ${createAuthError?.message}`,
    }, isDuplicate ? 409 : 500);
  }

  // 5. Return credentials (the rector shares these with the new staff member)
  return json({
    user_id: newAuthUser.user.id,
    email: cleanEmail,
    full_name: cleanName,
    role,
    temporary_password: tempPassword,
    institution_id: callerInstitutionId,
  }, 201);
});
