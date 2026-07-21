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
import { useEffect, useState, useRef } from "react";
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

  const activePillRef = useRef<HTMLLIElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

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

  const activeIndex = availableMenuItems.findIndex((item) => location.pathname === item.url);

  useEffect(() => {
    if (activeIndex === -1) {
      if (activePillRef.current) {
        activePillRef.current.style.height = "0px";
        activePillRef.current.style.opacity = "0";
      }
      return;
    }

    const btn = itemRefs.current[activeIndex];
    const pill = activePillRef.current;
    if (!btn || !pill) return;

    pill.style.height = `${btn.offsetHeight}px`;
    pill.style.transform = `translateY(${btn.offsetTop}px)`;
    pill.style.opacity = "1";
    pill.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), height 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease";
  }, [activeIndex, availableMenuItems]);

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
      activeColor: "hsl(var(--rector-accent))",
      badgeClass: "bg-rector text-rector-foreground",
      gradientClass: "gradient-rector",
      label: "RECTOR",
      lightBg: "bg-rector-light",
    },
    contable: {
      activeColor: "hsl(var(--rector-accent))",
      badgeClass: "bg-rector text-rector-foreground",
      gradientClass: "gradient-rector",
      label: "CONTABLE",
      lightBg: "bg-rector-light",
    },
    profesor: {
      activeColor: "hsl(var(--profesor-accent))",
      badgeClass: "bg-profesor text-profesor-foreground",
      gradientClass: "gradient-profesor",
      label: "PROFESOR",
      lightBg: "bg-profesor-light",
    },
    parent: {
      activeColor: "hsl(var(--primary))",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
      gradientClass: "bg-slate-900 text-white dark:bg-amber-500",
      label: "ESTUDIANTE",
      lightBg: "bg-amber-50 dark:bg-amber-500/10",
    },
  } as const;

  const role = roleConfig[(userRole ?? "profesor") as MenuRole];

  const getGlassStyle = () => {
    const isRectorOrContable = userRole === "rector" || userRole === "contable";
    const isProfesor = userRole === "profesor";
    const baseColor = isRectorOrContable
      ? "168, 85, 247" // Purple
      : isProfesor
      ? "14, 165, 233" // Sky blue
      : "59, 130, 246"; // Blue (parent)

    return {
      bg: isDark ? `rgba(${baseColor}, 0.32)` : `rgba(${baseColor}, 0.16)`,
      border: isDark ? `rgba(${baseColor}, 0.5)` : `rgba(${baseColor}, 0.28)`,
      shadow: isDark ? `rgba(${baseColor}, 0.22)` : `rgba(${baseColor}, 0.1)`,
    };
  };

  const glass = getGlassStyle();

  return (
    <Sidebar 
      className="border-r border-border backdrop-blur-md transition-all duration-300"
      style={{
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.35)",
      }}
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white p-1 shadow-sm">
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
            <SidebarMenu className="relative">
              {/* Sliding glass active pill */}
              <li
                ref={activePillRef}
                className="absolute left-0 right-0 rounded-lg pointer-events-none active-sidebar-pill list-none"
                style={{
                  zIndex: 0,
                  height: 0,
                  transform: "translateY(0px)",
                  backgroundColor: glass.bg,
                  border: `1px solid ${glass.border}`,
                  boxShadow: `0 4px 12px ${glass.shadow}, inset 0 1px 1px rgba(255, 255, 255, 0.15)`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  opacity: 0,
                }}
              />

              {availableMenuItems.map((item, index) => {
                const isActive = location.pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        ref={el => itemRefs.current[index] = el}
                        to={item.url}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 z-10 bg-transparent",
                          isActive
                            ? cn("font-semibold", isDark ? "text-white" : "")
                            : item.isLocked
                              ? "text-muted-foreground/50 hover:bg-secondary/50 cursor-pointer"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                        style={isActive && !isDark ? { color: role.activeColor } : undefined}
                      >
                        {!isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-r-full transition-all duration-200 group-hover:h-6"
                            style={{ background: role.activeColor }}
                          />
                        )}
                        <item.icon className={cn("h-5 w-5 flex-shrink-0", item.isLocked && "opacity-50")} />
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

        <div className={cn("flex items-center gap-3 rounded-xl p-3", role.lightBg)}>
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
