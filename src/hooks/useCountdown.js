import { useEffect, useState } from 'react';

function getTargetTimestamp(targetDate) {
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof targetDate !== 'string' || !isoDateTime.test(targetDate)) return NaN;

  const timestamp = Date.parse(targetDate);
  const [year, month, day] = targetDate.slice(0, 10).split('-').map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);

  const validCalendarDate = calendarDate.getUTCFullYear() === year
    && calendarDate.getUTCMonth() === month - 1
    && calendarDate.getUTCDate() === day;

  return validCalendarDate && Number(targetDate.slice(11, 13)) < 24
    && Number.isFinite(timestamp) ? timestamp : NaN;
}

// Invalid or timezone-free dates return zero values with isComplete: false.
export default function useCountdown(targetDate) {
  const targetTimestamp = getTargetTimestamp(targetDate);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    if (!Number.isFinite(targetTimestamp) || currentTime >= targetTimestamp) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= targetTimestamp) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  const validTarget = Number.isFinite(targetTimestamp);
  const remaining = validTarget ? Math.max(0, targetTimestamp - now) : 0;
  const totalSeconds = Math.ceil(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isComplete: validTarget && remaining === 0,
  };
}
