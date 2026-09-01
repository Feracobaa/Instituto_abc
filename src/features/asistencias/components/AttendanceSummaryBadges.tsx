import { CalendarDays, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AttendanceSummaryBadgesProps {
  studentsCount: number;
  attendanceSummary: {
    present: number;
    absent: number;
    justified: number;
    pending: number;
  };
}

export function AttendanceSummaryBadges({
  studentsCount,
  attendanceSummary,
}: AttendanceSummaryBadgesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>{studentsCount} estudiante{studentsCount !== 1 ? "s" : ""} en lista</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Presentes: {attendanceSummary.present}
        </Badge>
        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Ausentes: {attendanceSummary.absent}
        </Badge>
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          Justificadas: {attendanceSummary.justified}
        </Badge>
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          Sin marcar: {attendanceSummary.pending}
        </Badge>
      </div>
    </div>
  );
}
