import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildGuardianAuthEmail, buildGuardianUsernameBase, buildInitialGuardianPassword } from "../_shared/guardianAccounts.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ProvisionRequest {
  studentIds?: string[];
}

interface StudentRow {
  id: string;
  full_name: string;
  guardian_name: string | null;
  grade_id: string | null;
  grades: {
    name: string;
  } | null;
}

interface GuardianAccountRow {
  id: string;
  student_id: string;
  username: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized request." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return new Response(JSON.stringify({ error: `Could not verify rector role: ${roleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (roleRow?.role !== "rector") {
      return new Response(JSON.stringify({ error: "Only rector users can provision guardian accounts." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await request.json().catch(() => ({}))) as ProvisionRequest;
    const targetStudentIds = Array.isArray(body.studentIds) ? body.studentIds : [];

    let studentsQuery = adminClient
      .from("students")
      .select(`
        id,
        full_name,
        guardian_name,
        grade_id,
        grades(name)
      `)
      .eq("is_active", true)
      .not("grade_id", "is", null)
      .order("full_name");

    if (targetStudentIds.length > 0) {
      studentsQuery = studentsQuery.in("id", targetStudentIds);
    }

    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) {
      throw studentsError;
    }

    const studentRows = (students ?? []) as StudentRow[];

    const { data: existingAccounts, error: accountsError } = await adminClient
      .from("student_guardian_accounts")
      .select("id, student_id, username");

    if (accountsError) {
      throw accountsError;
    }

    const accountsByStudent = new Map(
      ((existingAccounts ?? []) as GuardianAccountRow[]).map((account) => [account.student_id, account]),
    );
    const takenUsernames = new Set(
      ((existingAccounts ?? []) as GuardianAccountRow[]).map((account) => account.username.toLowerCase()),
    );

    const results: Array<Record<string, unknown>> = [];

    for (const student of studentRows) {
      const existingAccount = accountsByStudent.get(student.id);
      if (existingAccount) {
        results.push({
          status: "already_exists",
          studentId: student.id,
          studentName: student.full_name,
          username: existingAccount.username,
        });
        continue;
      }

      if (!student.grade_id || !student.grades?.name) {
        results.push({
          status: "skipped_missing_grade",
          studentId: student.id,
          studentName: student.full_name,
        });
        continue;
      }

      const fullNameForCredential = student.full_name || "familia";
      const baseUsername = buildGuardianUsernameBase(fullNameForCredential);

      let usernameCandidate = baseUsername;
      let suffix = 2;
      while (takenUsernames.has(usernameCandidate.toLowerCase())) {
        usernameCandidate = `${baseUsername}${suffix}`;
        suffix += 1;
      }

      takenUsernames.add(usernameCandidate.toLowerCase());

      const syntheticEmail = buildGuardianAuthEmail(usernameCandidate);
      const temporaryPassword = buildInitialGuardianPassword(student.grades.name);
      const guardianFullName =
        student.guardian_name?.trim() || `Familia ${student.full_name}`;

      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        password: temporaryPassword,
        user_metadata: {
          full_name: guardianFullName,
          role: "parent",
          username: usernameCandidate,
        },
      });

      if (createUserError || !createdUser.user) {
        results.push({
          status: "error",
          studentId: student.id,
          studentName: student.full_name,
          message: createUserError?.message ?? "Could not create auth user.",
        });
        continue;
      }

      const { error: insertAccountError } = await adminClient
        .from("student_guardian_accounts")
        .insert({
          student_id: student.id,
          user_id: createdUser.user.id,
          username: usernameCandidate,
          must_change_password: true,
          last_credentials_issued_at: new Date().toISOString(),
        });

      if (insertAccountError) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
        results.push({
          status: "error",
          studentId: student.id,
          studentName: student.full_name,
          username: usernameCandidate,
          message: insertAccountError.message,
        });
        continue;
      }

      results.push({
        status: "created",
        studentId: student.id,
        studentName: student.full_name,
        username: usernameCandidate,
        temporaryPassword,
      });
    }

    return new Response(JSON.stringify({ accounts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
