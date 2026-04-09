import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, ClipboardList, Calendar, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "outline";
}

interface QuickActionsBarProps {
  role: "rector" | "profesor" | "parent";
  className?: string;
}

export function QuickActionsBar({ role, className }: QuickActionsBarProps) {
  const navigate = useNavigate();

  const rectorActions: QuickAction[] = [
    { label: "Nuevo Profesor", icon: Plus, onClick: () => navigate("/profesores") },
    { label: "Nuevo Estudiante", icon: UserPlus, onClick: () => navigate("/estudiantes") },
    { label: "Portal Estudiantil", icon: Users, onClick: () => navigate("/familias"), variant: "outline" },
    { label: "Ver Calificaciones", icon: ClipboardList, onClick: () => navigate("/calificaciones"), variant: "outline" },
  ];

  const profesorActions: QuickAction[] = [
    { label: "Registrar Calificacion", icon: ClipboardList, onClick: () => navigate("/calificaciones") },
    { label: "Mi Horario", icon: Calendar, onClick: () => navigate("/horarios"), variant: "outline" },
    { label: "Mis Materias", icon: FileText, onClick: () => navigate("/materias"), variant: "outline" },
  ];

  const parentActions: QuickAction[] = [
    { label: "Ver Notas", icon: ClipboardList, onClick: () => navigate("/mis-notas") },
    { label: "Ver Horario", icon: Calendar, onClick: () => navigate("/mi-horario"), variant: "outline" },
    { label: "Completar Perfil", icon: Users, onClick: () => navigate("/mi-perfil"), variant: "outline" },
  ];

  const actions = role === "rector" ? rectorActions : role === "parent" ? parentActions : profesorActions;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.label}
            variant={action.variant ?? "default"}
            size="sm"
            onClick={action.onClick}
            className={cn(
              "h-8 gap-1.5 text-xs transition-all duration-200",
              action.variant !== "outline" && role === "rector"
                ? "gradient-rector border-0 hover:opacity-90"
                : action.variant !== "outline" && role === "profesor"
                  ? "gradient-profesor border-0 hover:opacity-90"
                  : action.variant !== "outline" && role === "parent"
                    ? "border-0 bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                    : "",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
