import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { ProviderEmptyState } from "@/components/provider/ProviderEmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Loader2,
  Users,
  Compass,
  Monitor,
  Globe,
  Radio,
  Send,
  LogOut,
  Bell,
  Search,
  RefreshCcw,
} from "lucide-react";

interface OnlineUserPresence {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  institution_name: string;
  page_url: string;
  browser: string;
  os: string;
  online_at: string;
}

interface HistoricalSession {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  institution_name: string;
  page_url: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_active_at: string;
}

export default function EtymonEnLinea() {
  const { user, onlineUsers, setOnlineUsers, presenceChannel } = useAuth();
  const [historicalSessions, setHistoricalSessions] = useState<HistoricalSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIdForAlert, setSelectedUserIdForAlert] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  // Estados de paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const pageSize = 10;
  const isFirstRender = useRef(true);

  // 1. Obtener sesiones históricas de la base de datos con filtros y paginación
  const fetchHistory = async (page = currentPage, search = searchQuery, role = roleFilter) => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from("provider_user_sessions")
        .select("*", { count: "exact" });

      if (role !== "all") {
        query = query.eq("role", role);
      }

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,institution_name.ilike.%${search.trim()}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("last_active_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setHistoricalSessions((data as unknown as HistoricalSession[]) || []);
      setTotalRecords(count || 0);
    } catch (err) {
      console.error("Error al obtener historial de sesiones:", err);
      toast.error("No se pudo cargar el historial de sesiones.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Buscar con debounce para cambios en búsqueda o rol
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchHistory(1, "", "all");
      return;
    }

    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchHistory(1, searchQuery, roleFilter);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchHistory(newPage, searchQuery, roleFilter);
  };

  // 3. Comando Broadcast: Kick User (Desconectar)
  const handleKickUser = async (userId: string, userName: string) => {
    if (!presenceChannel) {
      toast.error("El canal de comunicación en tiempo real no está listo.");
      return;
    }

    try {
      await presenceChannel.send({
        type: "broadcast",
        event: "kick-user",
        payload: { user_id: userId },
      });
      toast.success(`Comando enviado para cerrar la sesión de ${userName}.`);
      
      // Removerlo temporalmente de la lista local de online
      setOnlineUsers((prev) => prev.filter((u) => u.user_id !== userId));
      
      // Refrescar el historial después de un breve retraso
      setTimeout(fetchHistory, 2500);
    } catch (err) {
      console.error("Error al desconectar usuario:", err);
      toast.error("No se pudo enviar el comando de desconexión.");
    }
  };

  // 4. Comando Broadcast: Send Alert (Enviar mensaje emergente)
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenceChannel || !selectedUserIdForAlert || !alertMessage.trim()) return;

    setSendingAlert(true);
    try {
      await presenceChannel.send({
        type: "broadcast",
        event: "show-alert",
        payload: {
          user_id: selectedUserIdForAlert,
          message: alertMessage.trim(),
        },
      });
      toast.success("Alerta emergente enviada con éxito.");
      setAlertMessage("");
      setSelectedUserIdForAlert(null);
    } catch (err) {
      console.error("Error al enviar alerta:", err);
      toast.error("No se pudo enviar el mensaje de soporte.");
    } finally {
      setSendingAlert(false);
    }
  };

  // El historial ya viene filtrado desde el servidor

  return (
    <ProviderLayout
      title="Usuarios en línea"
      subtitle="Monitoreo interactivo de sesiones activas, ubicaciones y control de soporte remoto en tiempo real"
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Panel de Conectores Concurrencia */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="etymon-surface p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--et-accent-soft)] text-[var(--et-accent)] relative">
              <Radio className="h-6 w-6 animate-pulse" />
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">Activos Ahora</p>
              <h3 className="text-2xl font-bold tracking-tight text-[var(--et-text)] mt-0.5">
                {onlineUsers.length} {onlineUsers.length === 1 ? "usuario" : "usuarios"}
              </h3>
            </div>
          </div>

          <div className="etymon-surface p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">Módulos visitados</p>
              <h3 className="text-2xl font-bold tracking-tight text-[var(--et-text)] mt-0.5">
                {new Set(onlineUsers.map((u) => u.page_url)).size} páginas activas
              </h3>
            </div>
          </div>

          <div className="etymon-surface p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--et-text-muted)]">Sesiones registradas hoy</p>
              <h3 className="text-2xl font-bold tracking-tight text-[var(--et-text)] mt-0.5">
                {historicalSessions.length} accesos
              </h3>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          
          {/* Listado en Tiempo Real (Presence) */}
          <article className="etymon-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--et-border)] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--et-accent)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--et-text)]">Sesiones activas en este instante</h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 animate-pulse border border-emerald-500/20">
                Tiempo real
              </span>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="py-12">
                <ProviderEmptyState
                  title="No hay usuarios en línea"
                  description="En este momento no se registran conexiones de red websockets activas en el portal escolar."
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {onlineUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="group relative flex flex-col gap-3 rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)] p-4 transition-all hover:bg-white/[0.01]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-[var(--et-text)]">{u.full_name}</h4>
                        <p className="text-xs text-[var(--et-text-muted)] font-mono mt-0.5">{u.email}</p>
                        <p className="text-[10px] text-[var(--et-text-subtle)] mt-1.5 flex items-center gap-1.5">
                          Colegio: <strong className="text-[var(--et-text)] font-semibold">{u.institution_name}</strong>
                        </p>
                      </div>
                      <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                        {u.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[var(--et-border)]/50 sm:grid-cols-2 text-xs text-[var(--et-text-subtle)]">
                      <div className="flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">Navegando: <strong className="font-mono text-[var(--et-text)]">{u.page_url}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{u.browser} en {u.os}</span>
                      </div>
                    </div>

                    {/* Acciones de Soporte */}
                    <div className="flex gap-2 justify-end pt-3 mt-1 border-t border-[var(--et-border)]/30 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => setSelectedUserIdForAlert(u.user_id)}
                        className="etymon-btn-outline h-8 text-[10px] py-1 px-3 gap-1 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-400"
                      >
                        <Bell className="h-3 w-3" />
                        Enviar alerta
                      </Button>
                      <Button
                        onClick={() => handleKickUser(u.user_id, u.full_name)}
                        className="etymon-btn-ghost h-8 text-[10px] py-1 px-3 gap-1 hover:bg-red-500/5 hover:text-red-400 hover:border-red-500/20"
                      >
                        <LogOut className="h-3 w-3" />
                        Desconectar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Formulario de Mensaje/Alerta Emergente (Ocultable) */}
          <div className="space-y-6">
            {selectedUserIdForAlert && (
              <article className="etymon-surface p-5 border-cyan-500/30 bg-cyan-500/5 animate-in slide-in-from-top-3 duration-300">
                <div className="flex items-center gap-2 mb-3 border-b border-[var(--et-border)] pb-2.5">
                  <Bell className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--et-text)]">Enviar Mensaje de Soporte</h4>
                </div>
                <form onSubmit={handleSendAlert} className="space-y-3">
                  <p className="text-xs text-[var(--et-text-muted)]">
                    El mensaje se mostrará inmediatamente como un aviso en la pantalla del usuario.
                  </p>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Escribe el mensaje o aviso de mantenimiento aquí..."
                    className="etymon-input w-full min-h-[90px] p-3 text-xs text-slate-100 resize-none border-[var(--et-border)] [background:var(--et-input-bg)] rounded-xl"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      onClick={() => setSelectedUserIdForAlert(null)}
                      className="etymon-btn-ghost h-9 text-xs px-3.5"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={sendingAlert}
                      className="etymon-btn-primary h-9 text-xs px-3.5 gap-1.5"
                    >
                      {sendingAlert ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Enviar mensaje
                    </Button>
                  </div>
                </form>
              </article>
            )}

            {/* Historial de Sesiones (Persistencia de Conexiones) */}
            <article className="etymon-surface p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--et-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--et-text)]">Historial de accesos recientes</h3>
                </div>
                <Button
                  onClick={() => fetchHistory(currentPage, searchQuery, roleFilter)}
                  className="etymon-btn-ghost h-8 w-8 p-0 hover:bg-[var(--et-chip-bg)]"
                  disabled={loadingHistory}
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Buscador y Filtro por Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,150px] gap-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--et-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o colegio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="etymon-input h-10 w-full pl-9 pr-4 text-xs text-slate-100 border-[var(--et-border)] [background:var(--et-input-bg)] rounded-xl"
                  />
                </div>
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="etymon-input h-10 w-full px-3 text-xs text-slate-100 border-[var(--et-border)] [background:var(--et-input-bg)] rounded-xl cursor-pointer"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="rector">Rector</option>
                    <option value="profesor">Docente</option>
                    <option value="contable">Contable</option>
                    <option value="parent">Acudiente</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : historicalSessions.length === 0 ? (
                <ProviderEmptyState
                  title="Sin registros"
                  description="No se encontraron sesiones históricas para los criterios ingresados."
                />
              ) : (
                <>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {historicalSessions.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-[var(--et-border)] bg-[var(--et-chip-bg)]/50 p-3 text-xs transition-all hover:bg-white/[0.01]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-[var(--et-text)]">{s.full_name}</p>
                            <p className="text-[10px] text-[var(--et-text-muted)] font-mono">{s.email}</p>
                          </div>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-[var(--et-text-muted)] font-medium uppercase tracking-wider">
                            {s.role}
                          </span>
                        </div>

                        <p className="mt-2 text-[10px] text-[var(--et-text-subtle)] truncate">
                          Colegio: <strong className="text-[var(--et-text)] font-semibold">{s.institution_name}</strong>
                        </p>

                        <div className="mt-2.5 grid grid-cols-1 gap-1.5 pt-2 border-t border-[var(--et-border)]/30 sm:grid-cols-2 text-[10px] text-[var(--et-text-muted)]">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>IP: <strong className="font-mono text-[var(--et-text-subtle)]">{s.ip_address}</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3 w-3 text-indigo-400 shrink-0" />
                            <span className="truncate">{s.user_agent}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--et-text-muted)] pt-1">
                          <span>Acceso: {new Date(s.created_at).toLocaleString("es-CO")}</span>
                          <span>Actividad: {new Date(s.last_active_at).toLocaleTimeString("es-CO")}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Controles de Paginación */}
                  {totalRecords > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--et-border)]/50 text-[11px] text-[var(--et-text-muted)]">
                      <div>
                        Mostrando <strong className="text-[var(--et-text)]">{Math.min(totalRecords, (currentPage - 1) * pageSize + 1)}</strong>-
                        <strong className="text-[var(--et-text)]">{Math.min(totalRecords, currentPage * pageSize)}</strong> de{" "}
                        <strong className="text-[var(--et-text)]">{totalRecords}</strong> accesos
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loadingHistory}
                          className="etymon-btn-outline h-8 px-2.5 text-[10px] gap-1 hover:bg-[var(--et-chip-bg)]"
                        >
                          Anterior
                        </Button>
                        <Button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage * pageSize >= totalRecords || loadingHistory}
                          className="etymon-btn-outline h-8 px-2.5 text-[10px] gap-1 hover:bg-[var(--et-chip-bg)]"
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </article>
          </div>
        </section>
      </div>
    </ProviderLayout>
  );
}
