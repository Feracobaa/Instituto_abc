import { useEffect, useRef } from "react";
import { useAuth, OnlineUserPresence } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { useInstitutionStatus } from "@/hooks/useSchoolData";

// Detección del Navegador y Sistema Operativo del Cliente
function getClientBrowserAndOS() {
  const ua = navigator.userAgent;
  let browser = "Navegador Desconocido";
  let os = "OS Desconocido";

  // Browser
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/")) browser = "Google Chrome";
  else if (ua.includes("Safari/")) browser = "Apple Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  // OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

export function PresenceTracker() {
  const { user, userRole, signOut, isProviderOwner, setOnlineUsers, setPresenceChannel } = useAuth();
  const location = useLocation();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { data: instStatus } = useInstitutionStatus({
    enabled: Boolean(user) && !isProviderOwner,
  });

  // 1. Registrar pulso de sesión en la base de datos al cambiar de ruta o periódicamente
  useEffect(() => {
    if (!user || isProviderOwner) return;

    const { browser, os } = getClientBrowserAndOS();
    const userAgentStr = `${browser} en ${os}`;
    const pageUrl = location.pathname;

    const sendPulse = async () => {
      try {
        await supabase.rpc("register_user_presence_pulse", {
          p_page_url: pageUrl,
          p_user_agent: userAgentStr,
        });
      } catch (err) {
        console.error("PresenceTracker DB Pulse Error:", err);
      }
    };

    sendPulse();
    const pulseInterval = setInterval(sendPulse, 4 * 60 * 1000);

    return () => {
      clearInterval(pulseInterval);
    };
  }, [user, location.pathname, isProviderOwner]);

  // 2. Conexión WebSocket al canal de Supabase Realtime persistente
  useEffect(() => {
    if (!user) return;

    const { browser, os } = getClientBrowserAndOS();
    const pageUrl = location.pathname;

    console.log("PresenceTracker Websocket: Conectando al canal 'etymon:presencia'...");
    const channel = supabase.channel("etymon:presencia", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    channelRef.current = channel;

    // Escuchar canales Broadcast en tiempo real
    channel
      .on("broadcast", { event: "kick-user" }, (payload) => {
        if (payload.payload?.user_id === user.id) {
          toast.error("Tu sesión ha sido finalizada de forma remota por el administrador de ETYMON.", {
            duration: 8000,
          });
          setTimeout(() => {
            signOut();
          }, 1500);
        }
      })
      .on("broadcast", { event: "show-alert" }, (payload) => {
        if (payload.payload?.user_id === user.id || payload.payload?.user_id === "all") {
          toast.info(payload.payload?.message || "Mensaje del administrador", {
            duration: 8000,
          });
        }
      })
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        console.log("PresenceTracker Websocket: Sincronizando estado de presencia:", presenceState);
        const usersList: OnlineUserPresence[] = [];

        Object.keys(presenceState).forEach((key) => {
          const presenceList = presenceState[key] as unknown as Record<string, unknown>[];
          if (presenceList && presenceList.length > 0) {
            const metadata = presenceList[presenceList.length - 1];
            if (!metadata.user_id) return;

            usersList.push({
              user_id: String(metadata.user_id),
              email: String(metadata.email || ""),
              full_name: String(metadata.full_name || "Usuario"),
              role: String(metadata.role || "usuario"),
              institution_name: String(metadata.institution_name || "Sin institución"),
              page_url: String(metadata.page_url || "/"),
              browser: String(metadata.browser || "Desconocido"),
              os: String(metadata.os || "Desconocido"),
              online_at: String(metadata.online_at || new Date().toISOString()),
            });
          }
        });

        // Eliminar duplicados si un usuario tiene múltiples conexiones en distintas keys
        const uniqueUsers: OnlineUserPresence[] = [];
        const seenUserIds = new Set<string>();

        usersList.forEach((u) => {
          if (!seenUserIds.has(u.user_id)) {
            seenUserIds.add(u.user_id);
            uniqueUsers.push(u);
          }
        });

        console.log("PresenceTracker Websocket: Listado de usuarios activos mapeado:", uniqueUsers);
        setOnlineUsers(uniqueUsers);
      });

    // Suscribirse activamente al socket y enviar datos de presencia inicial
    channel.subscribe((status) => {
      console.log(`PresenceTracker Websocket: Estado de conexión: ${status}`);
      if (status === "SUBSCRIBED") {
        setPresenceChannel(channel);
        channel.track({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          role: isProviderOwner ? "administrador" : (userRole || "usuario"),
          institution_name: isProviderOwner ? "ETYMON" : (instStatus?.institution_name || "Sin institución"),
          page_url: pageUrl,
          browser,
          os,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      console.log("PresenceTracker Websocket: Desconectando canal de presencia...");
      channel.unsubscribe();
      channelRef.current = null;
      setPresenceChannel(null);
      setOnlineUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, signOut, isProviderOwner, instStatus?.institution_name, setOnlineUsers, setPresenceChannel]);

  // 3. Actualizar metadatos de track cuando el usuario navegue sin reconectar el canal
  useEffect(() => {
    if (!user || !channelRef.current) return;

    // Solo actualizar si el canal está en estado suscrito
    if (channelRef.current.state === "joined") {
      const { browser, os } = getClientBrowserAndOS();
      const pageUrl = location.pathname;

      console.log(`PresenceTracker Websocket: Actualizando página activa en tiempo real: ${pageUrl}`);
      channelRef.current.track({
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: isProviderOwner ? "administrador" : (userRole || "usuario"),
        institution_name: isProviderOwner ? "ETYMON" : (instStatus?.institution_name || "Sin institución"),
        page_url: pageUrl,
        browser,
        os,
        online_at: new Date().toISOString(),
      });
    }
  }, [location.pathname, user, userRole, isProviderOwner, instStatus?.institution_name]);

  return null;
}
