import { cn } from "@/lib/utils";
import { Shield, GraduationCap } from "lucide-react";

interface RoleBadgeProps {
  role: 'rector' | 'profesor';
  size?: 'sm' | 'md';
  className?: string;
}

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const isRector = role === 'rector';

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-bold rounded-md border",
      size === 'sm' ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
      isRector
        ? "bg-rector/10 text-rector border-rector/25"
        : "bg-profesor/10 text-profesor border-profesor/25",
      className
    )}>
      {isRector 
        ? <Shield className={size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3"} />
        : <GraduationCap className={size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3"} />
      }
      {isRector ? 'Rector' : 'Profesor'}
    </span>
  );
}
