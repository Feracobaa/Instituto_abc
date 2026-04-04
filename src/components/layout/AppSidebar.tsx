import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  GraduationCap,
  ClipboardList,
  LogOut,
  UserPlus,
  Sun,
  Moon,
  Building2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ['rector', 'profesor'] },
  { title: "Profesores", url: "/profesores", icon: Users, roles: ['rector'] },
  { title: "Estudiantes", url: "/estudiantes", icon: UserPlus, roles: ['rector'] },
  { title: "Horarios", url: "/horarios", icon: Calendar, roles: ['rector', 'profesor'] },
  { title: "Grados", url: "/grados", icon: GraduationCap, roles: ['rector'] },
  { title: "Materias", url: "/materias", icon: BookOpen, roles: ['rector', 'profesor'] },
  { title: "Calificaciones", url: "/calificaciones", icon: ClipboardList, roles: ['rector', 'profesor'] },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuario';
  const isRector = userRole === 'rector';

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(userRole || '')
  );

  const roleConfig = {
    rector: {
      label: 'RECTOR',
      gradientClass: 'gradient-rector',
      badgeClass: 'bg-rector text-rector-foreground',
      glowClass: 'shadow-glow-rector',
      activeColor: 'hsl(var(--rector-accent))',
      lightBg: 'bg-rector-light',
    },
    profesor: {
      label: 'PROFESOR',
      gradientClass: 'gradient-profesor',
      badgeClass: 'bg-profesor text-profesor-foreground',
      glowClass: 'shadow-glow-profesor',
      activeColor: 'hsl(var(--profesor-accent))',
      lightBg: 'bg-profesor-light',
    },
  };

  const role = roleConfig[userRole as 'rector' | 'profesor'] ?? roleConfig['profesor'];

  return (
    <Sidebar className="border-r border-border">
      {/* === HEADER === */}
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-sm border border-border">
            <img src="/logo-iabc.jpg" alt="Logo ABC" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-foreground font-heading leading-tight tracking-tight">PLATAFORMA<br />INSTITUTO Pedagógico ABC</h1>
          </div>
        </div>
      </SidebarHeader>

      {/* === MENU === */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Menú Principal
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
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group",
                          isActive
                            ? cn("text-white font-semibold shadow-sm", role.gradientClass)
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {!isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-r-full transition-all duration-200 group-hover:h-6"
                            style={{ background: role.activeColor }}
                          />
                        )}
                        <item.icon className="w-5 h-5 flex-shrink-0" />
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

      {/* === FOOTER === */}
      <SidebarFooter className="p-3 border-t border-border">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm mb-1"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>

        {/* User info */}
        <div className={cn("flex items-center gap-3 p-3 rounded-xl", role.lightBg)}>
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className={cn("font-bold text-sm", role.gradientClass, "text-white")}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
            <span className={cn(
              "inline-block text-xs font-bold px-1.5 py-0.5 rounded-sm mt-0.5",
              role.badgeClass
            )}>
              {role.label}
            </span>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
