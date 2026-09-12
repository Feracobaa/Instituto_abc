import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  LogOut,
  UserPlus,
  Sun,
  Moon,
  Calculator,
  Lock,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useGuardianAccount, useInstitutionModuleAccess, useInstitutionSettings } from "@/hooks/useSchoolData";
import type { SchoolModuleCode } from "@/features/access/modules";
import { cn } from "@/lib/utils";

type MenuRole = "rector" | "profesor" | "parent" | "contable";

const menuItems: Array<{
  icon: React.ElementType;
  moduleCode: SchoolModuleCode;
  title: string;
  url: string;
}> = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard, moduleCode: "dashboard" },
    { title: "Contabilidad", url: "/contabilidad", icon: Calculator, moduleCode: "contabilidad" },
    { title: "Pensiones", url: "/pensiones", icon: GraduationCap, moduleCode: "contabilidad" },
    { title: "Usuarios", url: "/usuarios", icon: Users, moduleCode: "usuarios" },
    { title: "Profesores", url: "/profesores", icon: Users, moduleCode: "profesores" },
    { title: "Estudiantes", url: "/estudiantes", icon: UserPlus, moduleCode: "estudiantes" },
    { title: "Portal Estudiantil", url: "/familias", icon: Users, moduleCode: "familias" },
    { title: "Horarios", url: "/horarios", icon: Calendar, moduleCode: "horarios" },
    { title: "Grados", url: "/grados", icon: GraduationCap, moduleCode: "grados" },
    { title: "Materias", url: "/materias", icon: BookOpen, moduleCode: "materias" },
    { title: "Calificaciones", url: "/calificaciones", icon: ClipboardList, moduleCode: "calificaciones" },
    { title: "Tareas", url: "/tareas", icon: BookOpen, moduleCode: "calificaciones" },
    { title: "Asistencias", url: "/asistencias", icon: ClipboardCheck, moduleCode: "asistencias" },
    { title: "Mi Portal", url: "/portal", icon: BookOpen, moduleCode: "mis_notas" },
  ];

export function AppSidebar() {
  const location = useLocation();
  const { user, userRole, signOut, isProviderOwner } = useAuth();
  const { data: guardianAccount } = useGuardianAccount(userRole === "parent");
  const { data: institutionSettings } = useInstitutionSettings();
  const { data: moduleAccess } = useInstitutionModuleAccess({ enabled: Boolean(user) });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const availableMenuItems = menuItems
    .filter((item) => {
      // If provider owner, see everything
      if (isProviderOwner) return true;
      // If moduleAccess is loaded, hide items completely if they have no access (is_enabled = false)
      if (moduleAccess && moduleAccess[item.moduleCode]?.is_enabled === false) return false;

      // Hide student portal from non-parent users
      if (userRole !== "parent" && item.url === "/portal") return false;

      return true;
    })
    .map((item) => {
      return { ...item, isLocked: false };
    });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((token) => token[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const displayName = userRole === "parent"
    ? guardianAccount?.students?.guardian_name
    || guardianAccount?.username
    || user?.user_metadata?.full_name
    || "Acudiente"
    : user?.user_metadata?.full_name || user?.email || "Usuario";
  const institutionName = institutionSettings?.display_name?.trim() || "Instituto Pedagogico ABC";
  const institutionLogo = institutionSettings?.logo_url?.trim() || "/logo-iabc.jpg";

  const roleConfig = {
    rector: {
      activeColor: "hsl(var(--primary))",
      badgeClass: "bg-blue-600 text-white font-bold",
      gradientClass: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm",
      label: "RECTOR",
      lightBg: "bg-blue-500/10",
    },
    contable: {
      activeColor: "hsl(var(--primary))",
      badgeClass: "bg-blue-600 text-white font-bold",
      gradientClass: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm",
      label: "CONTABLE",
      lightBg: "bg-blue-500/10",
    },
    profesor: {
      activeColor: "hsl(var(--primary))",
      badgeClass: "bg-sky-600 text-white font-bold",
      gradientClass: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm",
      label: "PROFESOR",
      lightBg: "bg-sky-500/10",
    },
    parent: {
      activeColor: "hsl(var(--primary))",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-200 font-bold",
      gradientClass: "bg-slate-900 text-white dark:bg-amber-500",
      label: "ESTUDIANTE",
      lightBg: "bg-amber-50 dark:bg-amber-500/10",
    },
  } as const;

  const role = roleConfig[(userRole ?? "profesor") as MenuRole];



  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar transition-all duration-300">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card p-1 shadow-sm">
            <img src={institutionLogo} alt={`Logo ${institutionName}`} className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="font-heading leading-tight tracking-tight text-foreground">
              <span className="block font-bold">PLATAFORMA</span>
              <span className="block text-sm font-semibold text-muted-foreground">{institutionName}</span>
            </h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableMenuItems.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.url || location.pathname.startsWith(`${item.url}/`);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:bg-white/[0.08] dark:border-white/15 dark:text-white font-semibold shadow-sm backdrop-blur-sm"
                            : item.isLocked
                              ? "border border-transparent text-muted-foreground/50 hover:bg-secondary/50 cursor-pointer"
                              : "border border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                        )}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                          />
                        )}
                        <item.icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0 transition-colors",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : item.isLocked
                                ? "opacity-50"
                                : "group-hover:text-foreground",
                          )}
                        />
                        <span className={cn("font-medium flex-1", item.isLocked && "opacity-60")}>{item.title}</span>
                        {item.isLocked && (
                          <Lock className="h-3.5 w-3.5 opacity-40 flex-shrink-0" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <button
          onClick={toggleDark}
          className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
        </button>

        <div className={cn("flex items-center gap-3 rounded-xl p-3 border transition-colors", isDark ? "bg-card/70 border-border" : cn(role.lightBg, "border-border/40"))}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className={cn("text-sm font-bold text-white", role.gradientClass)}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <span className={cn("mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-xs font-bold", role.badgeClass)}>
              {role.label}
            </span>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
