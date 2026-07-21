import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'rector' | 'profesor';
  alert?: boolean;
  badge?: string;
}

export function StatCard({ 
  title, value, icon: Icon, description, trend, variant = 'default', alert, badge
}: StatCardProps) {

  const containerVariants = {
    default: 'bg-card border text-foreground',
    primary: 'bg-blue-500/12 dark:bg-blue-500/18 border-blue-500/30 text-foreground backdrop-blur-md shadow-sm',
    success: 'bg-success/8 border-success/30 text-foreground backdrop-blur-md',
    warning: 'bg-warning/8 border-warning/30 text-foreground backdrop-blur-md',
    rector: 'bg-purple-500/12 dark:bg-purple-500/18 border-purple-500/30 text-foreground backdrop-blur-md shadow-sm',
    profesor: 'bg-sky-500/12 dark:bg-sky-500/18 border-sky-500/30 text-foreground backdrop-blur-md shadow-sm',
  };

  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    rector: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    profesor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  };

  const isColored = false;

  return (
    <div className={cn(
      "rounded-xl p-5 shadow-card animate-fade-in hover-lift relative overflow-hidden",
      containerVariants[variant],
      alert && "ring-2 ring-destructive"
    )}>
      {/* Background decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -right-1 -top-1 w-12 h-12 rounded-full bg-white/5 pointer-events-none" />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isColored ? 'text-white/75' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <div className="flex items-end gap-2 mt-1.5">
            <p className={cn(
              "text-3xl font-bold",
              isColored ? 'text-white' : 'text-foreground'
            )}>
              {value}
            </p>
            {badge && (
              <span className={cn(
                "text-xs font-medium mb-1 px-1.5 py-0.5 rounded-md",
                isColored ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
              )}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className={cn(
              "text-xs mt-1",
              isColored ? 'text-white/65' : 'text-muted-foreground'
            )}>
              {description}
            </p>
          )}
        </div>

        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
          iconVariants[variant]
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Trend or Alert row */}
      {(trend || alert) && (
        <div className="mt-3 pt-3 border-t border-current/10 flex items-center gap-1.5">
          {alert && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs text-destructive font-medium">Requiere atención</span>
            </>
          )}
          {trend && !alert && (
            <>
              {trend.isPositive 
                ? <TrendingUp className={cn("w-3.5 h-3.5", isColored ? 'text-white/80' : 'text-success')} />
                : <TrendingDown className={cn("w-3.5 h-3.5", isColored ? 'text-white/80' : 'text-destructive')} />
              }
              <span className={cn(
                "text-xs font-semibold",
                isColored ? 'text-white/80' : trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className={cn("text-xs", isColored ? 'text-white/60' : 'text-muted-foreground')}>
                vs período anterior
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
