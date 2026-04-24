import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderEmptyStateProps {
  ctaLabel?: string;
  description: string;
  onCtaClick?: () => void;
  title: string;
}

export function ProviderEmptyState({ ctaLabel, description, onCtaClick, title }: ProviderEmptyStateProps) {
  return (
    <div className="etymon-empty-state flex flex-col items-center justify-center rounded-xl border border-[#2d2d2d] bg-[#171717] px-6 py-10 text-center">
      <svg viewBox="0 0 220 120" className="mb-4 h-28 w-56 text-white/20" fill="none" aria-hidden>
        <rect x="18" y="18" width="184" height="84" rx="12" stroke="currentColor" strokeWidth="1.2" />
        <path d="M35 80C53 60 70 67 86 53C100 41 117 45 133 57C147 68 164 72 184 50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="68" cy="52" r="6" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="152" cy="65" r="4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
      {ctaLabel && onCtaClick ? (
        <Button onClick={onCtaClick} className="etymon-btn-primary mt-5">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
