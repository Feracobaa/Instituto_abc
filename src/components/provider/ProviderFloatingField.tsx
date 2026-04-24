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
            "peer etymon-input h-12 rounded-lg border-[#2d2d2d] bg-[#151515] px-3 pb-2 pt-5 text-slate-100",
            "placeholder:text-transparent focus:border-[#00e7a7] focus-visible:ring-2 focus-visible:ring-[#00e7a7]/40 focus-visible:ring-offset-0",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-[#151515] px-1 text-sm text-slate-500 transition-all duration-200 peer-focus:top-0 peer-focus:text-xs peer-focus:text-[#8af7d6] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400"
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
            "peer etymon-input min-h-[110px] rounded-lg border-[#2d2d2d] bg-[#151515] px-3 pb-2 pt-6 text-slate-100",
            "placeholder:text-transparent focus:border-[#00e7a7] focus-visible:ring-2 focus-visible:ring-[#00e7a7]/40 focus-visible:ring-offset-0",
            className,
          )}
          {...props}
        />
        <label
          htmlFor={textareaId}
          className="pointer-events-none absolute left-3 top-5 -translate-y-1/2 bg-[#151515] px-1 text-sm text-slate-500 transition-all duration-200 peer-focus:top-0 peer-focus:text-xs peer-focus:text-[#8af7d6] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400"
        >
          {label}
        </label>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
