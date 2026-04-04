import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, ClipboardList, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

interface QuickActionsBarProps {
  role: 'rector' | 'profesor';
  className?: string;
}

export function QuickActionsBar({ role, className }: QuickActionsBarProps) {
  const navigate = useNavigate();

  const rectorActions: QuickAction[] = [
    {
      label: "Nuevo Profesor",
      icon: Plus,
      onClick: () => navigate('/profesores'),
    },
    {
      label: "Nuevo Estudiante",
      icon: UserPlus,
      onClick: () => navigate('/estudiantes'),
    },
    {
      label: "Ver Calificaciones",
      icon: ClipboardList,
      onClick: () => navigate('/calificaciones'),
      variant: 'outline',
    },
    {
      label: "Ver Horarios",
      icon: Calendar,
      onClick: () => navigate('/horarios'),
      variant: 'outline',
    },
  ];

  const profesorActions: QuickAction[] = [
    {
      label: "Registrar Calificación",
      icon: ClipboardList,
      onClick: () => navigate('/calificaciones'),
    },
    {
      label: "Mi Horario",
      icon: Calendar,
      onClick: () => navigate('/horarios'),
      variant: 'outline',
    },
    {
      label: "Mis Materias",
      icon: FileText,
      onClick: () => navigate('/materias'),
      variant: 'outline',
    },
  ];

  const actions = role === 'rector' ? rectorActions : profesorActions;

  return (
    <div className={cn(
      "flex flex-wrap gap-2",
      className
    )}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            variant={action.variant ?? 'default'}
            size="sm"
            onClick={action.onClick}
            className={cn(
              "gap-1.5 text-xs h-8 transition-all duration-200",
              action.variant !== 'outline' && role === 'rector'
                ? "gradient-rector border-0 hover:opacity-90"
                : action.variant !== 'outline' && role === 'profesor'
                ? "gradient-profesor border-0 hover:opacity-90"
                : ""
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
