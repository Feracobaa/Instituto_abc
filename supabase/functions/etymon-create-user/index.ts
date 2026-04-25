// etymon-create-user — Supabase Edge Function
// Paste this entire file in the Supabase Dashboard → Edge Functions → Create function
// No external files needed. Everything is self-contained.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface CreateUserPayload {
  email: string;
  full_name: string;
  institution_id: string;
  role: "rector" | "profesor" | "contable";
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function generatePassword(): string {
  const adj = ["Coral","Amber","Storm","Swift","Lunar","Solar","Cedar","Delta"];
  const noun = ["Eagle","River","Flame","Stone","Atlas","Titan","Blaze","Arrow"];
  const sym = ["#","@","!","$"];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const s = sym[Math.floor(Math.random() * sym.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}${s}`;
}

function validatePayload(body: unknown): CreateUserPayload {
  if (!body || typeof body !== "object") throw new Error("Body must be JSON.");
  const { email, full_name, institution_id, role, temporary_password } = body as Record<string, unknown>;
  if (!email || typeof email !== "string" || !email.includes("@")) throw new Error("Invalid email.");
  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) throw new Error("full_name too short.");
  if (!institution_id || typeof institution_id !== "string") throw new Error("institution_id required.");
  if (!["rector","profesor","contable"].includes(role as string)) throw new Error("Invalid role.");
  if (temporary_password !== undefined && (typeof temporary_password !== "string" || temporary_password.length < 8))
    throw new Error("temporary_password must be at least 8 characters.");
  return {
    email: (email as string).trim().toLowerCase(),
    full_name: (full_name as string).trim(),
    institution_id: institution_id as string,
    role: role as CreateUserPayload["role"],
    temporary_password: temporary_password as string | undefined,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

  // callerClient uses the caller's JWT (respects RLS) — only used to verify identity
  const callerClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // adminClient uses service_role — used for all write operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 1. Verify caller is an active Etymon owner
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser) return json({ error: "Unauthorized." }, 401);

  const { data: providerRow, error: providerError } = await adminClient
    .from("provider_users")
    .select("role, is_active")
    .eq("user_id", callerUser.id)
    .eq("is_active", true)
    .maybeSingle();

  if (providerError || !providerRow || providerRow.role !== "owner")
    return json({ error: "Forbidden: only Etymon owners can create users." }, 403);

  // 2. Validate payload
  let payload: CreateUserPayload;
  try {
    payload = validatePayload(await req.json());
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const tempPassword = payload.temporary_password ?? generatePassword();

  // 3. Create auth user
  const { data: newAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: payload.full_name,
      must_change_password: true,
    },
  });

  if (createAuthError || !newAuthUser.user) {
    const isDuplicate = createAuthError?.message?.toLowerCase().includes("already");
    return json({
      error: isDuplicate
        ? "User already exists. Use the role assignment panel to link them."
        : `Auth error: ${createAuthError?.message}`,
    }, isDuplicate ? 409 : 500);
  }

  const uid = newAuthUser.user.id;

  // 4. Create profile
  const { error: profileError } = await adminClient.from("profiles").insert({
    email: payload.email,
    full_name: payload.full_name,
    institution_id: payload.institution_id,
    user_id: uid,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(uid);
    return json({ error: `Profile error: ${profileError.message}` }, 500);
  }

  // 5. Create institution membership
  const { error: membershipError } = await adminClient.from("institution_memberships").insert({
    institution_id: payload.institution_id,
    is_default: true,
    role: payload.role,
    user_id: uid,
  });

  if (membershipError) {
    await adminClient.from("profiles").delete().eq("user_id", uid);
    await adminClient.auth.admin.deleteUser(uid);
    return json({ error: `Membership error: ${membershipError.message}` }, 500);
  }

  // 6. Audit log (non-blocking)
  await adminClient.from("provider_audit_logs").insert({
    action: "etymon.create_user",
    actor_user_id: callerUser.id,
    institution_id: payload.institution_id,
    record_id: uid,
    table_name: "auth.users",
    details: { email: payload.email, full_name: payload.full_name, role: payload.role },
  });

  // 7. Return credentials
  const response: CreateUserResponse = {
    email: payload.email,
    full_name: payload.full_name,
    institution_id: payload.institution_id,
    role: payload.role,
    temporary_password: tempPassword,
    user_id: uid,
  };

  return json(response, 201);
});
