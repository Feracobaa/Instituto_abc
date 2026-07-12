// supabase/functions/_shared/cors.ts
// Shared CORS headers for all Etymon Edge Functions

// Add your production domain(s) here
const ALLOWED_ORIGINS = [
  "https://instituto-abc.vercel.app",    // TODO: Replace with your actual production domain
  "http://localhost:5173",                // Vite dev server
  "http://localhost:8080",                // Alternative dev server
];

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
  };
}

// Legacy export for backward compatibility — prefer getCorsHeaders(request) for origin-aware CORS
export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
};
