import { ProviderFloatingInput } from "@/components/provider/ProviderFloatingField";
import { colorRegex } from "./types";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  const safeColor = colorRegex.test(value) ? value : "#0EA5E9";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--et-border)] bg-transparent p-1"
        />
        <ProviderFloatingInput
          label="Hex"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
