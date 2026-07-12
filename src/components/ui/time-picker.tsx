import * as React from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // Formato DB "HH:MM" (24h)
  onChange: (time: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label = "Selecciona la hora" }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'hours' | 'minutes'>('hours');
  
  // Parse DB 24h string into internal 12h representation for UI
  const parseDBTime = (timeStr: string) => {
    const [h, m] = (timeStr || "07:00").split(':').map(Number);
    return {
      hour: h % 12 === 0 ? 12 : h % 12,
      minute: m,
      period: h >= 12 ? 'PM' : 'AM' as 'AM'|'PM'
    };
  };

  const initial = parseDBTime(value);
  const [selectedHour, setSelectedHour] = React.useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = React.useState(initial.minute);
  const [period, setPeriod] = React.useState<'AM' | 'PM'>(initial.period);

  // Sync state on open
  React.useEffect(() => {
    if (isOpen) {
      const init = parseDBTime(value);
      setSelectedHour(init.hour);
      setSelectedMinute(init.minute);
      setPeriod(init.period);
      setMode('hours');
    }
  }, [isOpen, value]);

  const handleConfirm = () => {
    let finalH = selectedHour;
    if (period === 'PM' && finalH < 12) finalH += 12;
    if (period === 'AM' && finalH === 12) finalH = 0;
    
    onChange(`${finalH.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  // Convert current state to display perfectly on the trigger button (12h format)
  const currentDBEquivalent = parseDBTime(value);
  const displayTrigger = value 
    ? `${currentDBEquivalent.hour.toString().padStart(2, '0')}:${currentDBEquivalent.minute.toString().padStart(2, '0')} ${currentDBEquivalent.period}`
    : label;

  // Dial Render Math
  const dialItems = mode === 'hours' 
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const currentAngle = mode === 'hours' 
    ? (selectedHour === 12 ? 0 : selectedHour * 30)
    : (selectedMinute * 6);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-semibold font-mono text-base",
            !value && "text-muted-foreground font-sans font-normal text-sm"
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-primary" />
          {displayTrigger}
        </Button>
      </PopoverTrigger>
      
      {/* Material Design Theme Popover */}
      <PopoverContent className="w-[300px] p-4 bg-[#F2EBFA] dark:bg-card border-border shadow-xl rounded-[28px] overflow-hidden" align="center">
        
        {/* Header: Large Digital Display */}
        <div className="flex justify-center items-center gap-2 mb-6 mt-2">
          <button 
            onClick={() => setMode('hours')}
            className={cn(
              "px-4 py-3 rounded-2xl text-4xl font-medium transition-colors",
              mode === 'hours' ? "bg-[#E6D4F9] text-[#291353] dark:bg-primary/30 dark:text-primary" : "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {selectedHour}
          </button>
          <span className="text-3xl font-light text-muted-foreground mb-1">:</span>
          <button 
            onClick={() => setMode('minutes')}
            className={cn(
              "px-4 py-3 rounded-2xl text-4xl font-medium transition-colors",
              mode === 'minutes' ? "bg-[#E6D4F9] text-[#291353] dark:bg-primary/30 dark:text-primary" : "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {selectedMinute.toString().padStart(2, '0')}
          </button>
          
          {/* AM / PM Toggle Side Column */}
          <div className="flex flex-col ml-1 bg-white/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 overflow-hidden">
            <button 
              onClick={() => setPeriod('AM')}
              className={cn("px-2 py-1.5 text-xs font-bold transition-colors", period === 'AM' ? "bg-[#D6C2F9] text-[#291353] dark:bg-primary/50 text-foreground" : "text-muted-foreground hover:bg-black/5")}
            >
              AM
            </button>
            <button 
              onClick={() => setPeriod('PM')}
              className={cn("px-2 py-1.5 text-xs font-bold transition-colors", period === 'PM' ? "bg-[#D6C2F9] text-[#291353] dark:bg-primary/50 text-foreground" : "text-muted-foreground hover:bg-black/5")}
            >
              PM
            </button>
          </div>
        </div>

        {/* Circular Dial Body */}
        <div className="flex justify-center mb-6">
          <div className="relative w-[240px] h-[240px] rounded-full bg-[#E5DDF0] dark:bg-secondary/40">
            {/* Center dot */}
            <div className="absolute top-[116px] left-[116px] w-[8px] h-[8px] rounded-full bg-[#5229A1] dark:bg-primary z-10" />
            
            {/* Hand Line Sweeping */}
            <div 
              className="absolute left-[118px] top-[40px] w-[4px] bg-[#5229A1] dark:bg-primary origin-bottom transition-transform duration-300 ease-out z-0"
              style={{ 
                height: '80px', 
                transform: `rotate(${currentAngle}deg)`
              }} 
            />

            {/* Bubble Selector at the end of the hand */}
            <div 
              className="absolute w-[40px] h-[40px] rounded-full bg-[#5229A1] dark:bg-primary z-0 transition-transform duration-300 ease-out flex items-center justify-center shadow-md scale-110"
              style={{
                left: 120 - 20,
                top: 120 - 20,
                transform: `rotate(${currentAngle}deg) translateY(-80px) rotate(-${currentAngle}deg)`
              }}
            />

            {/* Numbers List */}
            {dialItems.map((val) => {
              const displayVal = mode === 'minutes' ? val.toString().padStart(2, '0') : val;
              const isSelected = mode === 'hours' ? selectedHour === val : selectedMinute === val;
              
              // Math for positioning layout mapping (0 to 360)
              const deg = mode === 'hours' ? (val === 12 ? 0 : val * 30) : (val * 6);
              const rad = (deg - 90) * (Math.PI / 180);
              const radius = 80;
              const x = 120 + radius * Math.cos(rad) - 16;
              const y = 120 + radius * Math.sin(rad) - 16;

              return (
                <button
                  key={`dial-${mode}-${val}`}
                  onClick={() => {
                    if (mode === 'hours') {
                      setSelectedHour(val);
                      // Auto switch to minutes after selecting hour for better UX
                      setTimeout(() => setMode('minutes'), 300);
                    } else {
                      setSelectedMinute(val);
                    }
                  }}
                  className={cn(
                    "absolute w-[32px] h-[32px] rounded-full flex items-center justify-center text-[15px] z-20 cursor-pointer transition-colors outline-none",
                    isSelected ? "text-white font-medium" : "text-foreground hover:bg-black/5 dark:hover:bg-white/5 font-normal"
                  )}
                  style={{ left: x, top: y }}
                >
                  {displayVal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-1 px-2 pb-1">
          <Button variant="ghost" className="text-[#5229A1] dark:text-primary/80 hover:bg-[#E6D4F9] dark:hover:bg-primary/20 rounded-full font-semibold" onClick={handleCancel}>
            Dismiss
          </Button>
          <Button variant="ghost" className="text-[#5229A1] dark:text-primary/80 hover:bg-[#E6D4F9] dark:hover:bg-primary/20 rounded-full font-semibold" onClick={handleConfirm}>
            OK
          </Button>
        </div>

      </PopoverContent>
    </Popover>
  );
}
