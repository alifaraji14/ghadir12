import React, { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer: React.FC = () => {
  // Target date: Wednesday, June 10, 2026 at 16:30 (Tehran Time UTC+3:30)
  const targetDate = new Date('2026-06-10T16:30:00+03:30').getTime();
  
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate - Date.now();
      
      if (difference <= 0) {
        setIsFinished(true);
        setTimeLeft(null);
        return;
      }

      setIsFinished(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const padZero = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="max-w-xl mx-auto bg-teal-900 border border-teal-800 rounded-2xl p-5 shadow-md relative overflow-hidden select-none text-right">
      {/* Visual background traditional elements */}
      <div className="absolute -top-8 -right-8 w-20 h-20 bg-teal-800/40 rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-teal-800/40 rounded-full pointer-events-none"></div>
      
      <div className="relative flex flex-col items-center gap-3">
        <span className="text-[10px] text-amber-300 font-black tracking-widest block font-sans">
          ✧ شمارش معکوس تقویمی عید غدیر ✧
        </span>

        {isFinished ? (
          <div className="text-white font-extrabold text-sm py-2">
            🎉 مراسم فرخنده عید غدیر آغاز شده است!
          </div>
        ) : timeLeft ? (
          /* Enforced Left to Right layout */
          <div className="flex flex-row items-center justify-center gap-3 md:gap-4 font-mono select-none" dir="ltr">
            {/* Days Column - ON THE LEFT */}
            <div className="flex flex-col items-center">
              <div className="min-w-12 md:min-w-14 h-12 md:h-14 bg-teal-950/80 border border-teal-700/60 rounded-xl flex items-center justify-center shadow-inner text-white font-black text-sm md:text-base leading-none">
                {padZero(timeLeft.days)}
              </div>
              <span className="text-3xs text-teal-200 mt-1.5 font-sans font-bold">روز</span>
            </div>

            <div className="text-amber-400 font-bold mb-5 text-sm md:text-base">:</div>

            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <div className="min-w-12 md:min-w-14 h-12 md:h-14 bg-teal-950/80 border border-teal-700/60 rounded-xl flex items-center justify-center shadow-inner text-white font-black text-sm md:text-base leading-none">
                {padZero(timeLeft.hours)}
              </div>
              <span className="text-3xs text-teal-200 mt-1.5 font-sans font-bold">ساعت</span>
            </div>

            <div className="text-amber-400 font-bold mb-5 text-sm md:text-base">:</div>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <div className="min-w-12 md:min-w-14 h-12 md:h-14 bg-teal-950/80 border border-teal-700/60 rounded-xl flex items-center justify-center shadow-inner text-white font-black text-sm md:text-base leading-none">
                {padZero(timeLeft.minutes)}
              </div>
              <span className="text-3xs text-teal-200 mt-1.5 font-sans font-bold">دقیقه</span>
            </div>

            <div className="text-amber-400 font-bold mb-5 text-sm md:text-base">:</div>

            {/* Seconds Column - ON THE RIGHT */}
            <div className="flex flex-col items-center">
              <div className="min-w-12 md:min-w-14 h-12 md:h-14 bg-[#115e59] border border-teal-500/50 rounded-xl flex items-center justify-center shadow-lg text-amber-300 font-black text-xs md:text-sm leading-none animate-pulse">
                {padZero(timeLeft.seconds)}
              </div>
              <span className="text-3xs text-teal-200 mt-1.5 font-sans font-bold">ثانیه</span>
            </div>
          </div>
        ) : (
          <div className="text-teal-200 text-3xs font-bold py-2">
            در حال بارگذاری زمان...
          </div>
        )}
      </div>
    </div>
  );
};
