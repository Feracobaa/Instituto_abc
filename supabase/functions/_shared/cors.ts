// supabase/functions/_shared/cors.ts
// Shared CORS headers for all Etymon Edge Functions

// Add your production domain(s) here
const ALLOWED_ORIGINS = [
  "https://plataforma-etymon.vercel.app",
  "https://instituto-abc.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

export function getCorsHeaders(request?: Request) {
  const origin = request?.headers.get("Origin") || request?.headers.get("origin") || "";
  let allowedOrigin = ALLOWED_ORIGINS[0];

  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
                      origin.endsWith(".vercel.app") || 
                      origin.startsWith("http://localhost:") ||
                      origin.startsWith("http://127.0.0.1:");
    if (isAllowed) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
  };
}

// Export default headers helper that dynamically evaluates or falls back
export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

