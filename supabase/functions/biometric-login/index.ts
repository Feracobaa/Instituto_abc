// @ts-expect-error: Deno HTTP imports are not resolved in Node/Browser environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import { getCorsHeaders } from "../_shared/cors.ts";

// Workaround for IDE using Node.js/Browser tsconfig instead of Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

interface BiometricLoginPayload {
  embedding?: number[];
  institution_id?: string;
}

interface RateLimitEntry {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_LOGIN_SIMILARITY = 0.92; // Umbral fijo estricto en servidor (92% de similitud coseno)
const MAX_ATTEMPTS = 5; // Máximo 5 intentos fallidos
const WINDOW_MS = 5 * 60 * 1000; // Ventana de 5 minutos
const BLOCK_DURATION_MS = 60 * 1000; // Bloqueo temporal de 60 segundos

const rateLimitMap = new Map<string, RateLimitEntry>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logBiometricEvent(adminClient: any, payload: {
  institution_id: string;
  event_type: 'login_success' | 'login_failed' | 'rate_limited';
  user_id?: string | null;
  student_id?: string | null;
  similarity_score?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await adminClient.from("biometric_audit_logs").insert({
      institution_id: payload.institution_id,
      event_type: payload.event_type,
      user_id: payload.user_id || null,
      student_id: payload.student_id || null,
      similarity_score: payload.similarity_score || null,
      ip_address: payload.ip_address || null,
      user_agent: payload.user_agent || null,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Fallo no bloqueante al registrar auditoría biométrica:", err);
  }
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

  // A browser-only liveness result is not evidence that the server can trust.
  // Keep this endpoint closed until a server-verifiable PAD protocol (challenge,
  // one-time nonce and validated capture evidence) is deployed.  This check is
  // deliberately before parsing the biometric vector or issuing a magic link so
  // direct API calls cannot bypass the UI challenge.
  return new Response(
    JSON.stringify({
      error: "El inicio de sesión facial está temporalmente deshabilitado hasta completar la verificación de vida en servidor.",
      code: "BIOMETRIC_LOGIN_REQUIRES_SERVER_PAD",
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

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

    // 1. Validación estricta de institución (Aislamiento Multi-Tenant)
    const institutionId = body.institution_id;
    if (!institutionId || typeof institutionId !== "string" || !UUID_REGEX.test(institutionId)) {
      return new Response(
        JSON.stringify({ error: "Identificador institucional inválido o ausente (institution_id requerido)." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate Limiting por IP + Institución contra ataques de fuerza bruta
    const rateKey = `${clientIp}:${institutionId}`;
    const now = Date.now();
    const rateEntry = rateLimitMap.get(rateKey);

    if (rateEntry) {
      if (rateEntry.blockedUntil > now) {
        const waitSec = Math.ceil((rateEntry.blockedUntil - now) / 1000);
        void logBiometricEvent(adminClient, {
          institution_id: institutionId,
          event_type: "rate_limited",
          ip_address: clientIp,
          user_agent: userAgent,
          metadata: { waitSec },
        });

        return new Response(
          JSON.stringify({ error: `Demasiados intentos fallidos. Intente de nuevo en ${waitSec} segundos.` }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (now - rateEntry.firstAttemptTime > WINDOW_MS) {
        rateLimitMap.set(rateKey, { attempts: 1, firstAttemptTime: now, blockedUntil: 0 });
      }
    } else {
      rateLimitMap.set(rateKey, { attempts: 1, firstAttemptTime: now, blockedUntil: 0 });
    }

    // 2. Validación de integridad matemática del vector biométrico
    const embedding = body.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return new Response(
        JSON.stringify({ error: "Embedding facial inválido (debe contener exactamente 128 dimensiones)." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
      const v = embedding[i];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return new Response(
          JSON.stringify({ error: "El vector biométrico contiene valores numéricos no finitos o corruptos." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      sumSq += v * v;
    }

    const norm = Math.sqrt(sumSq);
    if (norm < 0.85 || norm > 1.15) {
      return new Response(
        JSON.stringify({ error: "El vector biométrico no posee una norma geométrica válida." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Normalización forzada en servidor a norma L2 unitaria
    const unitVector = embedding.map((v) => v / norm);
    const vectorStr = `[${unitVector.join(",")}]`;

    // 3. Búsqueda vectorial acotada exclusivamente a la institución con umbral fijo de servidor
    const { data: matchData, error: matchError } = await adminClient.rpc("match_biometric_login", {
      query_embedding: vectorStr,
      p_institution_id: institutionId,
      match_threshold: MIN_LOGIN_SIMILARITY,
    });

    if (matchError) {
      return new Response(JSON.stringify({ error: `Error en búsqueda biométrica: ${matchError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!matchData || matchData.length === 0) {
      // Incrementar contador de intentos fallidos para rate-limiting
      const currentRate = rateLimitMap.get(rateKey) || { attempts: 0, firstAttemptTime: now, blockedUntil: 0 };
      currentRate.attempts += 1;
      if (currentRate.attempts >= MAX_ATTEMPTS) {
        currentRate.blockedUntil = now + BLOCK_DURATION_MS;
      }
      rateLimitMap.set(rateKey, currentRate);

      void logBiometricEvent(adminClient, {
        institution_id: institutionId,
        event_type: "login_failed",
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { reason: "Sin coincidencia o similitud menor a 0.92" },
      });

      return new Response(JSON.stringify({ error: "Rostro no reconocido o coincidencia insuficiente para esta institución." }), {
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

    // 4. Generar link/OTP de inicio de sesión de un solo uso vía Auth Admin
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

    // Éxito: Limpiar rate limiting y registrar log de auditoría
    rateLimitMap.delete(rateKey);

    void logBiometricEvent(adminClient, {
      institution_id: institutionId,
      event_type: "login_success",
      // target_user_id identifica la cuenta Auth; target_student_id es la FK real a students.
      user_id: match.target_user_id,
      student_id: match.user_type === 'student' ? match.target_student_id : null,
      similarity_score: match.similarity,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        user_name: match.full_name,
        user_type: match.user_type,
      },
    });

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
