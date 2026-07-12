import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BMv1PloAuikZZxvZLvgixxnwNyFlwlsKb3B3TCdDz1DDIGNl4LxFTIb8Tw8OMvVgnPJkyOl-5oKSjehyLL8uD_Q";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check browser support and existing subscription
  const checkSubscription = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);
    
    if (!supported) {
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Double check in database that this subscription exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint)
          .maybeSingle();

        if (error) {
          console.error("Error verifying push subscription database record:", error);
        }

        if (data) {
          setIsSubscribed(true);
        } else {
          // If subscription exists locally but not in DB, sync it
          await syncSubscriptionWithDatabase(subscription, user.id);
          setIsSubscribed(true);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error checking push subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Helper to sync local subscription with supabase db
  const syncSubscriptionWithDatabase = async (subscription: PushSubscription, userId: string) => {
    try {
      const keyP256dh = subscription.getKey("p256dh");
      const keyAuth = subscription.getKey("auth");

      const p256dh = keyP256dh
        ? btoa(Array.from(new Uint8Array(keyP256dh)).map(b => String.fromCharCode(b)).join(""))
        : "";
      const auth = keyAuth
        ? btoa(Array.from(new Uint8Array(keyAuth)).map(b => String.fromCharCode(b)).join(""))
        : "";

      // Insert subscription record into database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("push_subscriptions").insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      });

      if (error) {
        // If it's a unique constraint error, it means it's already there
        if (!error.message.includes("unique")) {
          throw error;
        }
      }
    } catch (err) {
      console.error("Failed to sync push subscription with database:", err);
    }
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!user) {
      toast.error("Sesión requerida", {
        description: "Debes iniciar sesión para activar las notificaciones.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Request permission
      const userPermission = await Notification.requestPermission();
      setPermission(userPermission);

      if (userPermission !== "granted") {
        throw new Error("Permiso de notificaciones denegado.");
      }

      // 2. Get the active Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Clean up any existing subscription that may be stale
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        try { await existingSub.unsubscribe(); } catch { /* ignore */ }
      }

      // 4. Subscribe with VAPID Key (with retry for transient push service errors)
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription: PushSubscription | null = null;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
          break; // Success
        } catch (err) {
          lastError = err as Error;
          console.warn(`Push subscribe attempt ${attempt + 1}/3 failed:`, lastError.message);
          if (attempt < 2) {
            // Wait before retrying (1s, then 2s)
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          }
        }
      }

      if (!subscription) {
        // Provide a more descriptive error based on the error type
        if (lastError?.name === "AbortError") {
          // Detect Brave browser
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isBrave = (navigator as any).brave && typeof (navigator as any).brave.isBrave === "function";
          if (isBrave) {
            throw new Error(
              "Brave bloquea las notificaciones push por privacidad. " +
              "Abre esta página en Chrome o Edge para activarlas."
            );
          }
          throw new Error(
            "El servicio de push del navegador no respondió. " +
            "Verifica tu conexión a internet e intenta de nuevo en unos segundos."
          );
        }
        throw lastError || new Error("No se pudo completar la suscripción a push.");
      }

      // 5. Save to DB
      await syncSubscriptionWithDatabase(subscription, user.id);
      
      setIsSubscribed(true);
      toast.success("Notificaciones activadas", {
        description: "Recibirás alertas en este dispositivo, incluso con la app cerrada.",
      });
    } catch (error) {
      const err = error as Error;
      console.error("Error subscribing to push notifications:", err);
      toast.error("Error al activar notificaciones", {
        description: err.message || "Por favor, verifica los permisos en tu navegador.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 1. Unsubscribe from push manager
        await subscription.unsubscribe();

        // 2. Remove from DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);

        if (error) throw error;
      }

      setIsSubscribed(false);
      toast.success("Notificaciones desactivadas", {
        description: "Ya no recibirás alertas push en este dispositivo.",
      });
    } catch (error) {
      const err = error as Error;
      console.error("Error unsubscribing from push notifications:", err);
      toast.error("Error al desactivar notificaciones", {
        description: err.message || "Hubo un problema al procesar tu solicitud.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading,
  };
}
