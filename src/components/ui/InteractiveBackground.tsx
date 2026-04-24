import { useEffect, useRef } from "react";

interface InteractiveBackgroundProps {
  primaryColor?: string;
}

export function InteractiveBackground({ primaryColor = "#00e7a7" }: InteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);
    resize();

    // Convert hex to RGB for alpha manipulation
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 231, b: 167 };
    };

    const color = hexToRgb(primaryColor);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;
    
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Create glowing orbs with varying properties
    const orbs = Array.from({ length: 6 }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      baseRadius: Math.random() * 300 + 250,
      radius: 0,
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      colorOffset: i * 25, // To create slight gradient variations
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Smooth mouse follow (easing)
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      orbs.forEach((orb) => {
        // Natural wandering
        orb.baseX += orb.vx;
        orb.baseY += orb.vy;

        // Bounce off bounds smoothly
        if (orb.baseX < -200) orb.vx *= -1;
        if (orb.baseX > width + 200) orb.vx *= -1;
        if (orb.baseY < -200) orb.vy *= -1;
        if (orb.baseY > height + 200) orb.vy *= -1;

        // Repel logic based on mouse
        const dx = mouseX - orb.baseX;
        const dy = mouseY - orb.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 600; // Influence radius of the mouse
        
        let targetX = orb.baseX;
        let targetY = orb.baseY;

        if (distance < repelRadius) {
          // The closer the mouse, the stronger the push
          const force = Math.pow((repelRadius - distance) / repelRadius, 2);
          targetX -= (dx / distance) * force * 400; 
          targetY -= (dy / distance) * force * 400;
        }

        // Apply easing to position for fluid motion
        orb.x += (targetX - orb.x) * 0.04;
        orb.y += (targetY - orb.y) * 0.04;
        orb.radius = orb.baseRadius;

        // Draw with radial gradient for bloom effect
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        
        // Add subtle hue shifts for a more premium look
        const r = Math.min(255, Math.max(0, color.r + (orb.colorOffset * (orb.vx > 0 ? 1 : -1))));
        const g = color.g;
        const b = Math.min(255, Math.max(0, color.b - orb.colorOffset));

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.18)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.06)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [primaryColor]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#020202]">
      {/* Noise texture overlay for premium, tactile feel */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.04] mix-blend-overlay" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      {/* Blurred glowing canvas */}
      <canvas
        ref={canvasRef}
        className="h-full w-full pointer-events-none mix-blend-screen blur-[30px]"
      />
    </div>
  );
}
