import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ProviderFloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  hint?: string;
  label: string;
}

interface ProviderFloatingTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> {
  hint?: string;
  label: string;
}

export function ProviderFloatingInput({ className, hint, id, label, ...props }: ProviderFloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <div className="relative">
        <Input
          id={inputId}
          placeholder=" "
          className={cn(
            "peer etymon-input etymon-floating-input h-12 rounded-lg px-3 pb-2 pt-5",
            "placeholder:text-transparent focus:border-[var(--et-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--et-accent-soft)] focus-visible:ring-offset-0",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="etymon-floating-label pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 px-1 text-sm transition-all duration-200 peer-focus:top-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs"
        >
          {label}
        </label>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ProviderFloatingTextarea({ className, hint, id, label, ...props }: ProviderFloatingTextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <div className="relative">
        <Textarea
          id={textareaId}
          placeholder=" "
          className={cn(
            "peer etymon-input etymon-floating-input min-h-[110px] rounded-lg px-3 pb-2 pt-6",
            "placeholder:text-transparent focus:border-[var(--et-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--et-accent-soft)] focus-visible:ring-offset-0",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={textareaId}
          className="etymon-floating-label pointer-events-none absolute left-3 top-5 -translate-y-1/2 px-1 text-sm transition-all duration-200 peer-focus:top-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs"
        >
          {label}
        </label>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
