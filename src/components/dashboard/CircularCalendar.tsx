import { useEffect, useState } from "react";
import { useSchedules } from "@/hooks/useSchoolData";
import { Cloud, CloudRain, CloudSun, Sun, Moon, HelpCircle, Loader2 } from "lucide-react";

// Types for weather
interface WeatherData {
  temp: number;
  code: number;
  loading: boolean;
}

export function CircularCalendar() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({ temp: 18, code: 0, loading: true });

  const { data: schedules, isLoading: schedulesLoading } = useSchedules();

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Real weather integration using Open-Meteo
  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
        );
        const data = await response.json();
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error fetching weather:", error);
        setWeather(prev => ({ ...prev, loading: false })); // Keep default temp but clear loading
      }
    };

    // Geolocation detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Fallback to Bogota coordinates
          fetchWeather(4.6097, -74.0817);
        }
      );
    } else {
      fetchWeather(4.6097, -74.0817);
    }
  }, []);

  // Map weather WMO codes to Lucide icons
  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="h-10 w-10 text-amber-500 animate-pulse" />;
    if (code >= 1 && code <= 3) return <CloudSun className="h-10 w-10 text-blue-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="h-10 w-10 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="h-10 w-10 text-blue-500 animate-bounce" />;
    return <CloudSun className="h-10 w-10 text-slate-400" />;
  };

  // 3. Real school data weekly bar chart (class density per day)
  const getWeeklyClassStats = () => {
    // Weekdays index mapping (0: Monday, 1: Tuesday, 2: Wednesday, 3: Thursday, 4: Friday, 5: Saturday, 6: Sunday)
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    if (schedules && schedules.length > 0) {
      schedules.forEach(schedule => {
        // schedules day_of_week is typically 0 (Lunes) to 4 (Viernes)
        const day = schedule.day_of_week;
        if (day >= 0 && day <= 6) {
          counts[day] += 1;
        }
      });
    } else {
      // Fallback placeholder with standard visual density if no schedules exist in DB
      return [8, 12, 10, 11, 7, 0, 0].map((c, i) => ({ count: c, active: i < new Date().getDay() }));
    }

    const maxCount = Math.max(...counts, 1);
    const todayIndex = new Date().getDay();
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1; // convert Sun-Sat (0-6) to Mon-Sun (0-6)

    return counts.map((count, i) => {
      // Height calculation (min 5px, max 85px)
      const height = (count / maxCount) * 75 + 10;
      return {
        count: height,
        active: i <= adjustedTodayIndex,
      };
    });
  };

  const barStats = getWeeklyClassStats();

  // 4. Calendar details
  const dayNameVal = time.getDay() === 0 ? 7 : time.getDay(); // 1-7 (Mon-Sun)
  const dayVal = time.getDate(); // 1-31
  const monthVal = time.getMonth() + 1; // 1-12

  // Anillos text definitions
  const dayNameString = "MON TUE WED THU FRI SAT SUN";
  const monthString = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC";
  
  // Format day list: "01 02 ... 31"
  const daysArray = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const dayString = daysArray.join(" ");

  // Ring rotation math helper
  const range = 270;
  const getRingRotation = (input: number, sections: number) => {
    const sectionWidth = range / sections;
    const initialRotation = 135 - sectionWidth / 2;
    return initialRotation - sectionWidth * (input - 1);
  };

  // Check if character index is within the highlighted active group
  const isCharActive = (index: number, input: number, characters: number) => {
    const start = characters * (input - 1) + (input - 1) + 1;
    const charIndex = index + 1;
    return charIndex >= start && charIndex < start + characters;
  };

  // Clock arm rotations
  const secondsRotation = time.getSeconds() * 6;
  const minutesRotation = time.getMinutes() * 6;
  const hoursRotation = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-card/40 backdrop-blur-md w-full max-w-[500px] overflow-hidden">
      <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase self-start mb-2">
        Calendario Escolar Activo
      </h3>

      <div className="relative w-[340px] h-[340px] md:w-[380px] md:h-[380px] flex items-center justify-center select-none scale-90 sm:scale-100">
        
        {/* Ring 3: Days (Outer) */}
        <div 
          className="absolute w-[330px] h-[330px] md:w-[360px] md:h-[360px] rounded-full border-[8px] border-secondary/40 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${getRingRotation(dayVal, 31)}deg)` }}
        >
          <div className="absolute inset-0 text-[9px] font-mono font-bold tracking-widest text-muted-foreground/30">
            {dayString.split("").map((char, index) => {
              const active = isCharActive(index, dayVal, 2);
              const angle = (index + 1 - 47) * 2.90322580645;
              return (
                <span 
                  key={index} 
                  className="absolute left-1/2 -ml-[4px] top-1 origin-[50%_165px] md:origin-[50%_180px] text-center w-[8px] transition-colors duration-300"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    color: active ? "rgb(239, 68, 68)" : undefined // Slate red (dayColor)
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Ring 2: Months (Middle) */}
        <div 
          className="absolute w-[260px] h-[260px] md:w-[290px] md:h-[290px] rounded-full border-[8px] border-secondary/40 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${getRingRotation(monthVal, 12)}deg)` }}
        >
          <div className="absolute inset-0 text-[10px] font-mono font-bold text-muted-foreground/30">
            {monthString.split("").map((char, index) => {
              const active = isCharActive(index, monthVal, 3);
              const angle = (index + 1 - 24) * 5.625;
              return (
                <span 
                  key={index} 
                  className="absolute left-1/2 -ml-[4px] top-1 origin-[50%_130px] md:origin-[50%_145px] text-center w-[8px] transition-colors duration-300"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    color: active ? "rgb(59, 130, 246)" : undefined // Slate blue (monthColor)
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Ring 1: Day Names (Inner) */}
        <div 
          className="absolute w-[190px] h-[190px] md:w-[220px] md:h-[220px] rounded-full border-[8px] border-secondary/40 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${getRingRotation(dayNameVal, 7)}deg)` }}
        >
          <div className="absolute inset-0 text-[11px] font-mono font-bold text-muted-foreground/30">
            {dayNameString.split("").map((char, index) => {
              const active = isCharActive(index, dayNameVal, 3);
              const angle = (index + 1 - 14) * 9.64285714285;
              return (
                <span 
                  key={index} 
                  className="absolute left-1/2 -ml-[4px] top-1 origin-[50%_95px] md:origin-[50%_110px] text-center w-[8px] transition-colors duration-300"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    color: active ? "rgb(34, 197, 94)" : undefined // Slate green (dayNameColor)
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Central Analog Clock */}
        <div className="absolute w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full bg-card border-4 border-border shadow-md flex items-center justify-center z-10 dark:bg-slate-900/90">
          <div className="relative w-full h-full">
            {/* Hour hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[4px] h-[25px] bg-foreground rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-100 ease-out"
              style={{ transform: `translate(-50%, -100%) rotate(${hoursRotation}deg)` }}
            />
            {/* Minute hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[3px] h-[38px] bg-muted-foreground rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-100 ease-out"
              style={{ transform: `translate(-50%, -100%) rotate(${minutesRotation}deg)` }}
            />
            {/* Second hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[1px] h-[42px] bg-red-500 rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-75"
              style={{ transform: `translate(-50%, -100%) rotate(${secondsRotation}deg)` }}
            />
            {/* Pin */}
            <div className="absolute left-1/2 top-1/2 w-[6px] h-[6px] rounded-full bg-foreground border border-background -translate-x-1/2 -translate-y-1/2 z-20" />
          </div>
        </div>

        {/* Dynamic top highlight cursor */}
        <div className="absolute top-0 w-[4px] h-[16px] bg-primary rounded-full z-20 shadow-glow" />
      </div>

      {/* Widgets row at bottom */}
      <div className="grid grid-cols-2 gap-4 w-full border-t border-border pt-4">
        
        {/* Real weather Widget */}
        <div className="flex items-center gap-3 rounded-xl bg-secondary/30 p-3 h-[72px]">
          {weather.loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            getWeatherIcon(weather.code)
          )}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Clima Local</p>
            <p className="text-lg font-extrabold text-foreground tracking-tight mt-1">
              {weather.loading ? "..." : `${weather.temp}°C`}
            </p>
          </div>
        </div>

        {/* Real Activity Widget: Class Density */}
        <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3 h-[72px]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Clases / Día</span>
            <span className="text-xs font-semibold text-foreground mt-1">Intensidad</span>
          </div>
          <div className="flex items-end gap-[3px] h-[45px] pb-1">
            {barStats.map((stat, i) => (
              <div 
                key={i} 
                className="w-[3px] rounded-t-full transition-all duration-500"
                style={{ 
                  height: `${stat.count}%`,
                  backgroundColor: stat.active 
                    ? "hsl(var(--primary))" 
                    : "var(--border)"
                }}
                title={`Día ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
