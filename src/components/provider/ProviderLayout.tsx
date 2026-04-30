import {
  Building2,
  CreditCard,
  Home,
  LifeBuoy,
  LogOut,
  Moon,
  ScrollText,
  Shield,
  Sun,
  Tags,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  { icon: Shield, label: "Permisos", path: "/etymon/permisos" },
  { icon: CreditCard, label: "Suscripciones", path: "/etymon/suscripciones" },
  { icon: Tags, label: "Planes", path: "/etymon/planes" },
  { icon: LifeBuoy, label: "Soporte", path: "/etymon/soporte" },
  { icon: ScrollText, label: "Auditoria", path: "/etymon/auditoria" },
];

const OWNER_THEME_STORAGE_KEY = "etymon.owner.theme";

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
                ? "bg-[var(--et-nav-active-bg)] text-[var(--et-text)]"
                : "text-[var(--et-nav-idle-text)] hover:bg-[var(--et-nav-idle-hover)] hover:text-[var(--et-text)]",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-2 h-8 w-0.5 rounded-r-full bg-[var(--et-accent)] transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon className={cn("h-[18px] w-[18px] transition-all", isActive ? "text-[var(--et-accent)] opacity-100" : "opacity-20 group-hover:opacity-70")} />
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const persistedTheme = localStorage.getItem(OWNER_THEME_STORAGE_KEY);
    if (persistedTheme === "light" || persistedTheme === "dark") {
      setTheme(persistedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(OWNER_THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div className={cn("etymon-shell min-h-screen w-full", theme === "light" ? "etymon-theme-light" : "etymon-theme-dark")}>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r [border-color:var(--et-border)] [background:var(--et-panel-bg)] lg:flex lg:flex-col">
          <div className="border-b [border-color:var(--et-border)] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border [border-color:var(--et-border)] [background:var(--et-chip-bg)] text-[var(--et-accent)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--et-nav-title)]">Provider Console</p>
                <h1 className="text-xl font-semibold tracking-tight text-[var(--et-text)]">ETYMON</h1>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <ProviderNav locationPathname={location.pathname} />
          </div>

          <footer className="border-t [border-color:var(--et-border)] p-4">
            <div className="rounded-lg border [border-color:var(--et-border)] [background:var(--et-chip-bg)] p-3">
              <p className="truncate text-sm font-medium text-[var(--et-text)]">{userName}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--et-text-muted)]">Owner</p>
            </div>
            <button onClick={signOut} className="etymon-btn-ghost mt-3 w-full">
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </footer>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 border-b [border-color:var(--et-border)] [background:var(--et-header-bg)] px-4 py-4 backdrop-blur sm:px-6">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--et-text)]">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-[var(--et-text-subtle)]">{subtitle}</p> : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                  className="etymon-btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium"
                  aria-label={theme === "dark" ? "Activar modo dia" : "Activar modo oscuro"}
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {theme === "dark" ? "Modo dia" : "Modo oscuro"}
                </button>

                {supportContext ? (
                  <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium [border-color:var(--et-accent-soft)] [background:color-mix(in_srgb,var(--et-accent)_16%,transparent)] text-[var(--et-text)]">
                    Soporte activo: {supportContext.institution_name}
                  </div>
                ) : (
                  <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs [border-color:var(--et-border)] [background:var(--et-chip-bg)] text-[var(--et-text-muted)]">
                    Sin soporte activo
                  </div>
                )}
              </div>
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
                          ? "border-[var(--et-accent-soft)] [background:color-mix(in_srgb,var(--et-accent)_16%,transparent)] text-[var(--et-text)]"
                          : "border-[var(--et-border)] [background:var(--et-chip-bg)] text-[var(--et-text-subtle)]",
                      )}
                    >
                      <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-[var(--et-accent)]" : "opacity-60")} />
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
