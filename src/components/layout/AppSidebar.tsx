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
  roles: MenuRole[];
  title: string;
  url: string;
}> = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, moduleCode: "dashboard", roles: ["rector", "profesor", "parent", "contable"] },
  { title: "Contabilidad", url: "/contabilidad", icon: Calculator, moduleCode: "contabilidad", roles: ["rector", "contable"] },
  { title: "Usuarios", url: "/usuarios", icon: Users, moduleCode: "usuarios", roles: ["rector"] },
  { title: "Profesores", url: "/profesores", icon: Users, moduleCode: "profesores", roles: ["rector"] },
  { title: "Estudiantes", url: "/estudiantes", icon: UserPlus, moduleCode: "estudiantes", roles: ["rector"] },
  { title: "Portal Estudiantil", url: "/familias", icon: Users, moduleCode: "familias", roles: ["rector"] },
  { title: "Horarios", url: "/horarios", icon: Calendar, moduleCode: "horarios", roles: ["rector", "profesor"] },
  { title: "Grados", url: "/grados", icon: GraduationCap, moduleCode: "grados", roles: ["rector"] },
  { title: "Materias", url: "/materias", icon: BookOpen, moduleCode: "materias", roles: ["rector", "profesor"] },
  { title: "Calificaciones", url: "/calificaciones", icon: ClipboardList, moduleCode: "calificaciones", roles: ["rector", "profesor"] },
  { title: "Asistencias", url: "/asistencias", icon: ClipboardCheck, moduleCode: "asistencias", roles: ["rector", "profesor"] },
  { title: "Mis Notas", url: "/mis-notas", icon: ClipboardList, moduleCode: "mis_notas", roles: ["parent"] },
  { title: "Mi Horario", url: "/mi-horario", icon: Calendar, moduleCode: "mi_horario", roles: ["parent"] },
  { title: "Mi Perfil", url: "/mi-perfil", icon: BookOpen, moduleCode: "mi_perfil", roles: ["parent"] },
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

  const filteredMenuItems = menuItems.filter((item) => {
    const roleAllowed = item.roles.includes((userRole ?? "profesor") as MenuRole);
    if (!roleAllowed) return false;

    if (isProviderOwner) return true;

    const isEnabled = moduleAccess?.[item.moduleCode];
    return isEnabled ?? true;
  });

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

  return (
    <Sidebar className="border-r border-border">
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
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? cn("font-semibold text-white shadow-sm", role.gradientClass)
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {!isActive && (
                          <span
                            className="absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-r-full transition-all duration-200 group-hover:h-6"
                            style={{ background: role.activeColor }}
                          />
                        )}
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{item.title}</span>
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
