import { cn } from "@/lib/utils";
import { Shield, GraduationCap, Users } from "lucide-react";

interface RoleBadgeProps {
  role: "rector" | "profesor" | "parent";
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const isRector = role === "rector";
  const isParent = role === "parent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-bold",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        isRector
          ? "border-rector/25 bg-rector/10 text-rector"
          : isParent
            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
            : "border-profesor/25 bg-profesor/10 text-profesor",
        className,
      )}
    >
      {isRector ? (
        <Shield className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      ) : isParent ? (
        <Users className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      ) : (
        <GraduationCap className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      )}
      {isRector ? "Rector" : isParent ? "Estudiante" : "Profesor"}
    </span>
  );
}
