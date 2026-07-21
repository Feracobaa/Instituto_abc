import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function LiquidNavbar() {
  const { user, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const navRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Map active route to navbar index
  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab(0);
    } else if (
      location.pathname === "/horarios" || 
      (location.pathname === "/portal" && location.search.includes("tab=horario"))
    ) {
      setActiveTab(1);
    } else if (
      location.pathname === "/calificaciones" || 
      (location.pathname === "/portal" && location.search.includes("tab=notas")) ||
      location.pathname === "/portal"
    ) {
      setActiveTab(2);
    }
  }, [location.pathname, location.search]);

  // Sync pill position
  const updatePill = (index: number, smooth = true) => {
    const btn = tabRefs.current[index];
    const pill = activePillRef.current;
    if (!btn || !pill) return;

    pill.style.transition = smooth
      ? "transform .5s cubic-bezier(.34,1.2,.64,1), width .5s cubic-bezier(.34,1.2,.64,1)"
      : "none";

    pill.style.width = `${btn.offsetWidth}px`;
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  };

  useEffect(() => {
    updatePill(activeTab, false);
    
    // Resize handler
    const handleResize = () => {
      updatePill(activeTab, false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // Sync dark theme on init
  useEffect(() => {
    const checkTheme = () => {
      const isCurrentlyDark = document.documentElement.classList.contains("dark");
      setIsDark(isCurrentlyDark);
    };
    
    checkTheme();
    // Observe class changes on html
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    
    // Delay pill update slightly to account for font loading / DOM layout recalculations
    setTimeout(() => {
      updatePill(activeTab, true);
    }, 100);
  };

  // Mouse move glare tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setGlareStyle({
      opacity: 1,
      backgroundImage: `radial-gradient(circle 90px at ${x}px ${y}px, var(--glare-color) 0%, transparent 100%)`,
    });
  };

  const handleMouseLeave = () => {
    setGlareStyle({ opacity: 0 });
  };

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    updatePill(index, true);

    const isParent = userRole === "parent";

    if (index === 0) {
      navigate("/");
    } else if (index === 1) {
      if (isParent) {
        navigate("/portal?tab=horario");
      } else {
        navigate("/horarios");
      }
    } else if (index === 2) {
      if (isParent) {
        navigate("/portal?tab=notas");
      } else {
        navigate("/calificaciones");
      }
    }
  };

  if (!user) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --glass-bg: rgba(255, 255, 255, 0.15);
          --glass-border: rgba(255, 255, 255, 0.4);
          --glass-shadow: rgba(0, 0, 0, 0.08);
          --glass-highlight: rgba(255, 255, 255, 0.8);
          --glass-caustic: rgba(255, 255, 255, 0.4);
          --reflection-start: rgba(255, 255, 255, 0.6);
          --reflection-end: rgba(255, 255, 255, 0.0);
          --glare-color: rgba(255, 255, 255, 0.5);
          --pill-bg: rgba(255, 255, 255, 0.75);
          --pill-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 1px rgba(255, 255, 255, 0.8);
          --icon-color: rgba(0, 0, 0, 0.5);
          --icon-active: rgba(0, 0, 0, 0.95);
          --divider-color: rgba(0, 0, 0, 0.12);
        }

        .dark {
          --glass-bg: rgba(30, 30, 35, 0.45);
          --glass-border: rgba(255, 255, 255, 0.15);
          --glass-shadow: rgba(0, 0, 0, 0.4);
          --glass-highlight: rgba(255, 255, 255, 0.25);
          --glass-caustic: rgba(255, 255, 255, 0.05);
          --reflection-start: rgba(255, 255, 255, 0.12);
          --reflection-end: rgba(255, 255, 255, 0.0);
          --glare-color: rgba(255, 255, 255, 0.15);
          --pill-bg: rgba(60, 60, 65, 0.8);
          --pill-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15);
          --icon-color: rgba(255, 255, 255, 0.5);
          --icon-active: #ffffff;
          --divider-color: rgba(255, 255, 255, 0.15);
        }

        .liquid-nav {
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: 99px;
          background: var(--glass-bg);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          box-shadow:
            0 20px 40px -10px var(--glass-shadow),
            0 5px 15px -5px var(--glass-shadow),
            inset 0 2px 3px -1px var(--glass-highlight),
            inset 0 -2px 4px -1px var(--glass-caustic),
            inset 0 0 0 1px var(--glass-border);
          transition: all 0.4s ease;
          z-index: 50;
        }

        .liquid-nav::before {
          content: '';
          position: absolute;
          top: 1px;
          left: 1px;
          right: 1px;
          height: 46%;
          border-radius: 99px 99px 24px 24px / 99px 99px 12px 12px;
          background: linear-gradient(180deg, var(--reflection-start) 0%, var(--reflection-end) 100%);
          pointer-events: none;
          z-index: 6;
          transition: background 0.4s ease;
        }

        .liquid-glare-container {
          position: absolute;
          inset: 0;
          border-radius: 99px;
          overflow: hidden;
          pointer-events: none;
          z-index: 5;
        }

        .liquid-glare {
          position: absolute;
          inset: 0;
          mix-blend-mode: overlay;
          transition: opacity 0.3s ease;
        }

        .nav-items {
          position: relative;
          display: flex;
          gap: 4px;
          z-index: 10;
        }

        .active-pill {
          position: absolute;
          top: 0;
          left: 0;
          height: 44px;
          background: var(--pill-bg);
          border-radius: 99px;
          box-shadow: var(--pill-shadow);
          z-index: 1;
        }

        .nav-btn {
          position: relative;
          background: transparent;
          border: none;
          padding: 0 20px;
          height: 44px;
          border-radius: 99px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: var(--icon-color);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.3s ease;
          outline: none;
          z-index: 2;
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .nav-btn:active .btn-content {
          transform: scale(0.92);
        }

        .nav-btn.active {
          color: var(--icon-active);
        }

        .divider {
          width: 1px;
          height: 22px;
          background: var(--divider-color);
          margin: 0 4px;
          z-index: 10;
          transition: background 0.4s ease;
        }

        .theme-btn {
          position: relative;
          background: transparent;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: var(--icon-color);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          z-index: 10;
          outline: none;
          margin-left: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }

        .theme-btn:hover,
        .theme-btn:active {
          color: var(--icon-active);
        }

        .theme-icon-wrapper {
          position: relative;
          width: 20px;
          height: 20px;
          pointer-events: none;
          transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .theme-btn:active .theme-icon-wrapper {
          transform: scale(0.8);
        }

        .theme-icon-wrapper svg {
          position: absolute;
          top: 0;
          left: 0;
          transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.4s ease;
          stroke-width: 2.2;
        }

        .sun {
          opacity: 1;
          transform: rotate(0deg) scale(1);
        }

        .moon {
          opacity: 0;
          transform: rotate(-90deg) scale(0);
        }

        .dark-active .sun {
          opacity: 0;
          transform: rotate(90deg) scale(0);
        }

        .dark-active .moon {
          opacity: 1;
          transform: rotate(0deg) scale(1);
        }
      `}} />

      <div 
        ref={navRef}
        className="liquid-nav scale-95 md:scale-100"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="liquid-glare-container">
          <div className="liquid-glare" style={glareStyle}></div>
        </div>

        <div className="nav-items">
          <div ref={activePillRef} className="active-pill"></div>

          {/* Button 1: Inicio */}
          <button 
            ref={el => tabRefs.current[0] = el}
            className={cn("nav-btn", activeTab === 0 && "active")}
            onClick={() => handleTabClick(0)}
          >
            <div className="btn-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span className="hidden sm:inline">Inicio</span>
            </div>
          </button>

          {/* Button 2: Horarios */}
          <button 
            ref={el => tabRefs.current[1] = el}
            className={cn("nav-btn", activeTab === 1 && "active")}
            onClick={() => handleTabClick(1)}
          >
            <div className="btn-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="hidden sm:inline">Horarios</span>
            </div>
          </button>

          {/* Button 3: Calificaciones */}
          <button 
            ref={el => tabRefs.current[2] = el}
            className={cn("nav-btn", activeTab === 2 && "active")}
            onClick={() => handleTabClick(2)}
          >
            <div className="btn-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="hidden sm:inline">Notas</span>
            </div>
          </button>
        </div>

        <div className="divider"></div>

        <button 
          className="theme-btn" 
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
        >
          <div className={cn("theme-icon-wrapper", isDark && "dark-active")}>
            <svg className="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg className="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
        </button>
      </div>
    </>
  );
}
