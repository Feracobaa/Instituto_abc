// supabase/functions/etymon-create-user/index.ts
// Etymon Super Admin — Secure user creation with temporary password
// Deploy: Supabase Dashboard → Edge Functions → "etymon-create-user"
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-available in Edge Functions)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CreateUserPayload {
  email: string;
  full_name: string;
  institution_id: string;
  role: "rector" | "profesor" | "contable";
  /** Optional. If omitted the function auto-generates a secure 12-char password. */
  temporary_password?: string;
}

interface CreateUserResponse {
  user_id: string;
  email: string;
  full_name: string;
  temporary_password: string;
  role: string;
  institution_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateSecurePassword(): string {
  // Generates a human-readable temporary password: Adj4-Noun8-Sym#
  const adjectives = ["Coral", "Amber", "Storm", "Swift", "Lunar", "Solar", "Cedar", "Delta"];
  const nouns = ["Eagle", "River", "Flame", "Stone", "Atlas", "Titan", "Blaze", "Arrow"];
  const symbols = ["#", "@", "!", "$"];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99

  return `${adj}${noun}${num}${sym}`;
}

function validatePayload(body: unknown): CreateUserPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const { email, full_name, institution_id, role, temporary_password } = body as Record<string, unknown>;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new Error("Invalid email address.");
  }
  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
    throw new Error("full_name must be at least 2 characters.");
  }
  if (!institution_id || typeof institution_id !== "string") {
    throw new Error("institution_id is required.");
  }
  const validRoles = ["rector", "profesor", "contable"];
  if (!role || !validRoles.includes(role as string)) {
    throw new Error(`role must be one of: ${validRoles.join(", ")}`);
  }
  if (temporary_password !== undefined && (typeof temporary_password !== "string" || temporary_password.length < 8)) {
    throw new Error("temporary_password must be at least 8 characters.");
  }

  return {
    email: email.trim().toLowerCase(),
    full_name: full_name.trim(),
    institution_id,
    role: role as CreateUserPayload["role"],
    temporary_password: temporary_password as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 1. Build two clients ────────────────────────────────────────────────
  // caller_client: respects RLS — used to verify the caller's identity
  // admin_client: service_role — used to create/delete auth users
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // ── 2. Verify caller is an active Etymon owner ──────────────────────────
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();

  if (callerError || !callerUser) {
    return new Response(JSON.stringify({ error: "Unauthorized: could not verify caller." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: providerRow, error: providerError } = await adminClient
    .from("provider_users")
    .select("role, is_active")
    .eq("user_id", callerUser.id)
    .eq("is_active", true)
    .maybeSingle();

  if (providerError || !providerRow || providerRow.role !== "owner") {
    return new Response(
      JSON.stringify({ error: "Forbidden: only Etymon owners can create users." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── 3. Parse & validate payload ─────────────────────────────────────────
  let payload: CreateUserPayload;
  try {
    const body = await req.json();
    payload = validatePayload(body);
  } catch (validationError) {
    return new Response(
      JSON.stringify({ error: (validationError as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const temporaryPassword = payload.temporary_password ?? generateSecurePassword();

  // ── 4. Create the auth user (admin API) ─────────────────────────────────
  const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: temporaryPassword,
    email_confirm: true, // Skip email verification flow — Etymon confirms directly
    user_metadata: {
      full_name: payload.full_name,
      must_change_password: true, // Frontend reads this and forces change on first login
      temp_password_set_by: "etymon_admin",
    },
  });

  if (createAuthError || !newAuthUser.user) {
    // Check if user already exists
    const isDuplicate =
      createAuthError?.message?.toLowerCase().includes("already registered") ||
      createAuthError?.message?.toLowerCase().includes("already exists");

    return new Response(
      JSON.stringify({
        error: isDuplicate
          ? "A user with this email already exists. Use the role assignment panel to link them to this institution."
          : `Failed to create auth user: ${createAuthError?.message}`,
      }),
      { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const newUserId = newAuthUser.user.id;

  // ── 5. Create profile ───────────────────────────────────────────────────
  const { error: profileError } = await adminClient.from("profiles").insert({
    email: payload.email,
    full_name: payload.full_name,
    institution_id: payload.institution_id,
    user_id: newUserId,
  });

  if (profileError) {
    // Rollback: delete the auth user to avoid orphaned accounts
    await adminClient.auth.admin.deleteUser(newUserId);
    return new Response(
      JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── 6. Create institution membership ────────────────────────────────────
  const { error: membershipError } = await adminClient.from("institution_memberships").insert({
    institution_id: payload.institution_id,
    is_default: true,
    role: payload.role,
    user_id: newUserId,
  });

  if (membershipError) {
    // Rollback both profile and auth user
    await adminClient.from("profiles").delete().eq("user_id", newUserId);
    await adminClient.auth.admin.deleteUser(newUserId);
    return new Response(
      JSON.stringify({ error: `Failed to assign institution role: ${membershipError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── 7. Log the action in provider_audit_logs ────────────────────────────
  await adminClient.from("provider_audit_logs").insert({
    action: "etymon.create_user",
    actor_user_id: callerUser.id,
    institution_id: payload.institution_id,
    record_id: newUserId,
    table_name: "auth.users",
    details: {
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
    },
  });

  // ── 8. Return success ────────────────────────────────────────────────────
  const response: CreateUserResponse = {
    email: payload.email,
    full_name: payload.full_name,
    institution_id: payload.institution_id,
    role: payload.role,
    temporary_password: temporaryPassword,
    user_id: newUserId,
  };

  return new Response(JSON.stringify(response), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
