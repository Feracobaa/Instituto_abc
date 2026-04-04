import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6 bg-card rounded-xl border border-dashed animate-fade-in",
      className
    )}>
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/8 border-2 border-primary/15 flex items-center justify-center">
          {Icon ? (
            <Icon className="w-9 h-9 text-primary/50" />
          ) : (
            /* Default SVG illustration */
            <svg viewBox="0 0 80 80" fill="none" className="w-9 h-9 opacity-40">
              <rect x="10" y="20" width="60" height="45" rx="6" stroke="currentColor" strokeWidth="3" className="text-primary"/>
              <path d="M10 32h60" stroke="currentColor" strokeWidth="3" className="text-primary"/>
              <circle cx="22" cy="26" r="3" fill="currentColor" className="text-primary"/>
              <circle cx="33" cy="26" r="3" fill="currentColor" className="text-primary"/>
              <path d="M30 50h20M30 58h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary"/>
            </svg>
          )}
        </div>
        {/* Decorative rings */}
        <div className="absolute -inset-2 rounded-3xl border border-primary/10 pointer-events-none" />
        <div className="absolute -inset-4 rounded-3xl border border-primary/5 pointer-events-none" />
      </div>

      <h3 className="text-lg font-bold text-foreground font-heading text-center">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 text-center max-w-xs">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-5" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
