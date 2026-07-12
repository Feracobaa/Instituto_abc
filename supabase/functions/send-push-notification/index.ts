// @ts-expect-error: Deno HTTP imports are not resolved in Node/Browser environment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import { corsHeaders } from "../_shared/cors.ts";
// @ts-expect-error: Deno imports are not resolved in Node/Browser environment
import webpush from "npm:web-push";

// Workaround for IDE using Node.js/Browser tsconfig instead of Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

let isVapidInitialized = false;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize VAPID details inside the handler to ensure env variables are available
    if (!isVapidInitialized) {
      const cleanEnv = (val?: string) => {
        if (!val) return "";
        return val.replace(/^["']|["']$/g, "").trim();
      };

      const publicKey = cleanEnv(Deno.env.get("VAPID_PUBLIC_KEY"));
      const privateKey = cleanEnv(Deno.env.get("VAPID_PRIVATE_KEY"));
      const email = cleanEnv(Deno.env.get("VAPID_EMAIL"));

      if (!publicKey || !privateKey || !email) {
        throw new Error("Missing VAPID environment variables (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL). Set them with: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_EMAIL=...");
      }
      
      webpush.setVapidDetails(email, publicKey, privateKey);
      isVapidInitialized = true;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json().catch(() => ({}));
    
    // Support database webhook event trigger or direct invocation
    // If it's a webhook, body.record is populated.
    const record = body.record || body;
    const { user_id, title, message, link_url } = record;

    if (!user_id || !title || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields (user_id, title, message)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions for this user
    const { data: subscriptions, error: subError } = await adminClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent_count: 0, message: "No push subscriptions for user." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const payload = JSON.stringify({
      title,
      message,
      link_url: link_url || "/"
    });

    let sentCount = 0;
    const deletedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          },
          payload
        );
        sentCount++;
      } catch (err) {
        const errorDetails = err as { statusCode?: number; message?: string };
        console.error(`Error sending push notification to sub ${sub.id}:`, err);
        // If the push service returns 404 or 410, it means the subscription is expired or invalid
        if (errorDetails.statusCode === 410 || errorDetails.statusCode === 404) {
          deletedSubscriptions.push(sub.id);
        }
      }
    }

    // Clean up expired/invalid subscriptions
    if (deletedSubscriptions.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .in("id", deletedSubscriptions);
      console.log(`Cleaned up ${deletedSubscriptions.length} expired subscriptions.`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent_count: sentCount, 
      cleaned_count: deletedSubscriptions.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
