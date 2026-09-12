import { useEffect, useState } from "react";
import { useSchedules } from "@/hooks/useSchoolData";
import { Cloud, CloudRain, CloudSun, Sun, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherData {
  temp: number;
  code: number;
  loading: boolean;
}

export function CircularCalendar() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData>({ temp: 18, code: 0, loading: true });
  const { data: schedules } = useSchedules();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
        );
        const data = await res.json();
        if (data.current) {
          setWeather({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, loading: false });
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeather(prev => ({ ...prev, loading: false }));
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(4.6097, -74.0817)
      );
    } else {
      fetchWeather(4.6097, -74.0817);
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="h-9 w-9 text-amber-500 animate-pulse" />;
    if (code >= 1 && code <= 3) return <CloudSun className="h-9 w-9 text-blue-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="h-9 w-9 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="h-9 w-9 text-blue-500 animate-bounce" />;
    return <CloudSun className="h-9 w-9 text-slate-400" />;
  };

  const getWeeklyClassStats = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    if (schedules && schedules.length > 0) {
      schedules.forEach(s => {
        if (s.day_of_week >= 0 && s.day_of_week <= 6) counts[s.day_of_week] += 1;
      });
    } else {
      return [8, 12, 10, 11, 7, 0, 0].map((c, i) => ({ count: c, active: i < new Date().getDay() }));
    }
    const maxCount = Math.max(...counts, 1);
    const todayIndex = new Date().getDay();
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    return counts.map((count, i) => ({
      count: (count / maxCount) * 75 + 10,
      active: i <= adjustedTodayIndex,
    }));
  };

  const barStats = getWeeklyClassStats();
  const dayNameVal = time.getDay() === 0 ? 7 : time.getDay();
  const dayVal = time.getDate();
  const monthVal = time.getMonth() + 1;

  const dayNameString = "LUN MAR MIE JUE VIE SAB DOM";
  const monthString = "ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC";
  const daysArray = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const dayString = daysArray.join(" ");

  const range = 270;
  const getRingRotation = (input: number, sections: number) => {
    const sectionWidth = range / sections;
    return 135 - sectionWidth / 2 - sectionWidth * (input - 1);
  };

  const isCharActive = (index: number, input: number, characters: number) => {
    const start = characters * (input - 1) + (input - 1) + 1;
    const charIndex = index + 1;
    return charIndex >= start && charIndex < start + characters;
  };

  const secondsRotation = time.getSeconds() * 6;
  const minutesRotation = time.getMinutes() * 6;
  const hoursRotation = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;
  const current12Hour = time.getHours() % 12 || 12;

  const clockHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-card/40 backdrop-blur-md w-full max-w-[500px] overflow-hidden">
      <div className="w-full flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Calendario Escolar Activo
        </h3>
        <span className="text-[11px] font-mono font-semibold text-muted-foreground/80 bg-secondary/50 px-2.5 py-0.5 rounded-full border border-border/40">
          {time.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      <div className="relative w-[340px] h-[340px] flex items-center justify-center select-none scale-[0.95] sm:scale-100 my-1">
        {/* Top precision marker */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none">
          <div className="w-1.5 h-3.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
          <div className="w-0.5 h-3 bg-gradient-to-b from-blue-500 to-transparent" />
        </div>

        {/* Static Concentric Lane Dividers (Líneas circulares delimitadoras) */}
        <div className="absolute w-[340px] h-[340px] rounded-full border-2 border-secondary/40 dark:border-slate-800/80 pointer-events-none" />
        <div className="absolute w-[270px] h-[270px] rounded-full border-2 border-secondary/40 dark:border-slate-800/80 pointer-events-none" />
        <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-secondary/40 dark:border-slate-800/80 pointer-events-none" />
        <div className="absolute w-[130px] h-[130px] rounded-full border-2 border-secondary/40 dark:border-slate-800/80 pointer-events-none" />

        {/* Ring 3: Days 1-31 (Outer lane: 135px to 170px radius) */}
        <div 
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
          style={{ transform: `rotate(${getRingRotation(dayVal, 31)}deg)` }}
        >
          <div className="absolute inset-0 text-[9px] font-mono font-bold tracking-widest text-muted-foreground/35">
            {dayString.split("").map((char, index) => {
              const active = isCharActive(index, dayVal, 2);
              const angle = (index + 1 - 47) * 2.90322580645;
              return (
                <span 
                  key={index} 
                  className={cn(
                    "absolute left-1/2 -ml-[4px] top-[12px] text-center w-[8px] transition-all duration-300",
                    active && "text-red-500 dark:text-red-400 font-black drop-shadow-[0_0_6px_rgba(239,68,68,0.8)] scale-110"
                  )}
                  style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 158px" }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Ring 2: Months ENE-DIC (Middle lane: 100px to 135px radius) */}
        <div 
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
          style={{ transform: `rotate(${getRingRotation(monthVal, 12)}deg)` }}
        >
          <div className="absolute inset-0 text-[10px] font-mono font-bold text-muted-foreground/35">
            {monthString.split("").map((char, index) => {
              const active = isCharActive(index, monthVal, 3);
              const angle = (index + 1 - 24) * 5.625;
              return (
                <span 
                  key={index} 
                  className={cn(
                    "absolute left-1/2 -ml-[4px] top-[47px] text-center w-[8px] transition-all duration-300",
                    active && "text-blue-500 dark:text-blue-400 font-black drop-shadow-[0_0_6px_rgba(59,130,246,0.8)] scale-110"
                  )}
                  style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 123px" }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Ring 1: Weekdays LUN-DOM (Inner lane: 65px to 100px radius) */}
        <div 
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
          style={{ transform: `rotate(${getRingRotation(dayNameVal, 7)}deg)` }}
        >
          <div className="absolute inset-0 text-[10.5px] font-mono font-bold text-muted-foreground/35">
            {dayNameString.split("").map((char, index) => {
              const active = isCharActive(index, dayNameVal, 3);
              const angle = (index + 1 - 14) * 9.64285714285;
              return (
                <span 
                  key={index} 
                  className={cn(
                    "absolute left-1/2 -ml-[4px] top-[82px] text-center w-[8px] transition-all duration-300",
                    active && "text-emerald-500 dark:text-emerald-400 font-black drop-shadow-[0_0_6px_rgba(34,197,94,0.8)] scale-110"
                  )}
                  style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 88px" }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Central Analog Clock with Hours 1-12 and Ticks */}
        <div className="absolute w-[124px] h-[124px] rounded-full bg-gradient-to-b from-card via-card to-secondary/30 border-2 border-border/80 shadow-md flex items-center justify-center z-10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="relative w-full h-full">
            {/* 12 Hour Ticks */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute left-1/2 top-1/2 origin-[center_bottom] -translate-x-1/2",
                  i % 3 === 0 ? "w-[1.5px] h-[4px] bg-foreground/40" : "w-[1px] h-[2.5px] bg-muted-foreground/20"
                )}
                style={{ transform: `translate(-50%, -100%) rotate(${i * 30}deg) translateY(-51px)` }}
              />
            ))}

            {/* 12 Hour Numbers */}
            {clockHours.map((h) => {
              const isActive = current12Hour === h;
              const rad = (h * 30 * Math.PI) / 180;
              return (
                <span
                  key={h}
                  className={cn(
                    "absolute text-[8px] font-mono font-bold -translate-x-1/2 -translate-y-1/2 transition-colors select-none",
                    isActive
                      ? "text-blue-500 dark:text-blue-400 font-extrabold scale-110 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]"
                      : "text-muted-foreground/55"
                  )}
                  style={{ left: `${50 + 34 * Math.sin(rad)}%`, top: `${50 - 34 * Math.cos(rad)}%` }}
                >
                  {h}
                </span>
              );
            })}

            {/* Hour hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[3.5px] h-[24px] bg-foreground rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-100 ease-out shadow-xs"
              style={{ transform: `translate(-50%, -100%) rotate(${hoursRotation}deg)` }}
            />
            {/* Minute hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[2px] h-[34px] bg-muted-foreground rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-100 ease-out shadow-xs"
              style={{ transform: `translate(-50%, -100%) rotate(${minutesRotation}deg)` }}
            />
            {/* Second hand */}
            <div 
              className="absolute left-1/2 top-1/2 w-[1px] h-[40px] bg-red-500 rounded-full origin-[center_bottom] -translate-x-1/2 -translate-y-full transition-transform duration-75 shadow-[0_0_3px_rgba(239,68,68,0.8)]"
              style={{ transform: `translate(-50%, -100%) rotate(${secondsRotation}deg)` }}
            />
            {/* Center Pin */}
            <div className="absolute left-1/2 top-1/2 w-[7px] h-[7px] rounded-full bg-foreground border border-background -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
              <div className="w-[2px] h-[2px] rounded-full bg-red-500" />
            </div>
          </div>
        </div>
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
                style={{ height: `${stat.count}%`, backgroundColor: stat.active ? "hsl(var(--primary))" : "var(--border)" }}
                title={`Día ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
