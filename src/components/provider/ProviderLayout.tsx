import {
  Building2,
  CreditCard,
  Home,
  LifeBuoy,
  LogOut,
  ScrollText,
  Shield,
  Tags,
  Users,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ProviderLayoutProps {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}

const providerNavItems = [
  { icon: Home, label: "Dashboard", path: "/etymon" },
  { icon: Building2, label: "Instituciones", path: "/etymon/instituciones" },
  { icon: Users, label: "Usuarios", path: "/etymon/usuarios" },
  { icon: CreditCard, label: "Suscripciones", path: "/etymon/suscripciones" },
  { icon: Tags, label: "Planes", path: "/etymon/planes" },
  { icon: LifeBuoy, label: "Soporte", path: "/etymon/soporte" },
  { icon: ScrollText, label: "Auditoria", path: "/etymon/auditoria" },
];

function ProviderNav({ locationPathname }: { locationPathname: string }) {
  return (
    <nav className="space-y-1 px-3 py-4">
      {providerNavItems.map((item) => {
        const isActive = locationPathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
              isActive
                ? "bg-white/[0.04] text-white"
                : "text-white/70 hover:bg-white/[0.03] hover:text-white",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-2 h-8 w-0.5 rounded-r-full bg-[#00e7a7] transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon className={cn("h-[18px] w-[18px] transition-all", isActive ? "text-[#00e7a7] opacity-100" : "opacity-20 group-hover:opacity-70")} />
            <span className={cn(isActive ? "font-medium" : "font-normal")}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function ProviderLayout({ children, subtitle, title }: ProviderLayoutProps) {
  const { signOut, supportContext, user } = useAuth();
  const location = useLocation();
  const userName = user?.user_metadata?.full_name || user?.email || "Provider Owner";

  return (
    <div className="etymon-shell min-h-screen w-full">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#2d2d2d] bg-[#141414] lg:flex lg:flex-col">
          <div className="border-b border-[#2d2d2d] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#2d2d2d] bg-[#191919] text-[#00e7a7]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Provider Console</p>
                <h1 className="text-xl font-semibold tracking-tight text-white">ETYMON</h1>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <ProviderNav locationPathname={location.pathname} />
          </div>

          <footer className="border-t border-[#2d2d2d] p-4">
            <div className="rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] p-3">
              <p className="truncate text-sm font-medium text-slate-100">{userName}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Owner</p>
            </div>
            <button onClick={signOut} className="etymon-btn-ghost mt-3 w-full">
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </footer>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#2d2d2d] bg-[#121212]/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
              </div>

              {supportContext ? (
                <div className="inline-flex items-center rounded-full border border-[#00e7a7]/40 bg-[#00e7a7]/10 px-3 py-1 text-xs font-medium text-[#9cf7df]">
                  Soporte activo: {supportContext.institution_name}
                </div>
              ) : (
                <div className="inline-flex items-center rounded-full border border-[#2d2d2d] bg-[#1a1a1a] px-3 py-1 text-xs text-slate-500">
                  Sin soporte activo
                </div>
              )}
            </div>

            <div className="mx-auto mt-4 max-w-[1800px] overflow-x-auto lg:hidden">
              <div className="flex min-w-max gap-2 pb-1">
                {providerNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                        isActive
                          ? "border-[#00e7a7]/50 bg-[#00e7a7]/15 text-[#9cf7df]"
                          : "border-[#2d2d2d] bg-[#191919] text-slate-400",
                      )}
                    >
                      <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-[#00e7a7]" : "opacity-60")} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-[1800px]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
