// @ts-expect-error: Deno HTTP imports are not resolved in Node/Browser environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import { getCorsHeaders } from "../_shared/cors.ts";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import { buildGuardianAuthEmail } from "../_shared/guardianAccounts.ts";

// Workaround for IDE using Node.js/Browser tsconfig instead of Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

interface BiometricLoginPayload {
  embedding?: number[];
  match_threshold?: number;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json().catch(() => ({}))) as BiometricLoginPayload;

    const embedding = body.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return new Response(JSON.stringify({ error: "Embedding facial inválido (debe tener 128 dimensiones)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threshold = typeof body.match_threshold === "number" ? body.match_threshold : 0.90;
    const vectorStr = `[${embedding.join(",")}]`;

    // 1. Ejecutar RPC de búsqueda vectorial con umbral estricto (> 90%)
    const { data: matchData, error: matchError } = await adminClient.rpc("match_biometric_login", {
      query_embedding: vectorStr,
      match_threshold: threshold,
    });

    if (matchError) {
      return new Response(JSON.stringify({ error: `Error en búsqueda biométrica: ${matchError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!matchData || matchData.length === 0) {
      return new Response(JSON.stringify({ error: "Rostro no reconocido o coincidencia insuficiente." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = matchData[0];
    const targetEmail = match.email;

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: "El usuario biométrico no tiene correo registrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Generar link/OTP de inicio de sesión de un solo uso vía Auth Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: `Error generando token de sesión: ${linkError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        status: "success",
        user_id: match.target_user_id,
        user_name: match.full_name,
        email: match.email,
        user_type: match.user_type,
        student_name: match.full_name,
        similarity: match.similarity,
        hashed_token: linkData.properties.hashed_token,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
