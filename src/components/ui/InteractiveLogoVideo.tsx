import { useEffect, useRef, useState } from "react";

interface InteractiveLogoVideoProps {
  src: string;
  className?: string;
}

export function InteractiveLogoVideo({ src, className = "" }: InteractiveLogoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cuando el cursor entra, reproducimos el video a velocidad normal/rápida para que brille y se anime
    if (isHovered) {
      video.playbackRate = 1.2;
      video.play().catch((err) => console.log("Video playback prevented:", err));
    } else {
      // Cuando sale, pausamos el video o lo regresamos al frame de inicio de forma prolija
      video.pause();
      // Opcional: regresamos al inicio de la animación
      video.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <div
      className={`relative overflow-hidden cursor-pointer rounded-2xl transition-all duration-500 ${
        isHovered
          ? "scale-105 shadow-[0_0_50px_rgba(0,231,167,0.4)] brightness-125"
          : "scale-100 shadow-[0_0_20px_rgba(0,231,167,0.1)] brightness-100"
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop
        className="h-full w-full object-cover transition-all duration-500"
      />
    </div>
  );
}
