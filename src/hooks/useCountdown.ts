import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculate(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

export function useCountdown(target: Date): { timeLeft: TimeLeft; isComplete: boolean } {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculate(target));
  const [isComplete, setIsComplete] = useState(() => Date.now() >= target.getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      const done = Date.now() >= target.getTime();
      setIsComplete(done);
      setTimeLeft(calculate(target));
      if (done) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return { timeLeft, isComplete };
}
