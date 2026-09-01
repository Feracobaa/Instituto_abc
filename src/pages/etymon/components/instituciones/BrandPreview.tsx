import { Sparkles } from "lucide-react";
import {
  BrandingFormState,
  fontPreviewClass,
  styleBadgeClass,
  visualStyleOptions,
} from "./types";

interface BrandPreviewProps {
  title: string;
  branding: BrandingFormState;
}

export function BrandPreview({ title, branding }: BrandPreviewProps) {
  return (
    <div className="etymon-surface-soft overflow-hidden p-0">
      <div
        className="relative min-h-[190px] p-4"
        style={{
          background: `linear-gradient(145deg, ${branding.primary_color} 0%, ${branding.secondary_color} 52%, ${branding.accent_color} 100%)`,
        }}
      >
        {branding.cover_image_url ? (
          <img
            src={branding.cover_image_url}
            alt="Portada de marca"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/90">
            <Sparkles className="h-3.5 w-3.5" />
            Preview de marca
          </div>

          <div>
            <p className={`text-[11px] text-white/75 ${styleBadgeClass(branding.visual_style)}`}>{title}</p>
            <h4 className={`mt-1 text-xl text-white ${fontPreviewClass(branding.font_family)}`}>
              {branding.display_name || "Nombre institucional"}
            </h4>
            <p className="mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs text-white">
              {visualStyleOptions.find((option) => option.value === branding.visual_style)?.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
