import { useState, useEffect, memo } from 'react';

/* Pre-computed snowflake positions — no Math.random() in render */
const SNOWFLAKES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: `${(i * 2.5) % 100}%`,
  delay: `${(i * 0.17) % 7}s`,
  duration: `${3 + (i % 5) * 0.8}s`,
  size: `${9 + (i % 4) * 3}px`,
}));

/* NewYearMode listens to the same holidayChanged event instead of making its own fetch */
const NewYearMode = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleHoliday = (e: CustomEvent<string | null>) => {
      setActive(e.detail === 'newyear');
    };
    window.addEventListener('holidayChanged', handleHoliday as EventListener);
    return () => window.removeEventListener('holidayChanged', handleHoliday as EventListener);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <style>{`
        @keyframes ny-snowfall {
          0% { transform: translateY(-50px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(calc(100vh + 50px)) rotate(360deg); opacity: 0; }
        }
        .ny-snowflake { animation: ny-snowfall linear infinite; will-change: transform; }
      `}</style>
      {SNOWFLAKES.map((f) => (
        <div
          key={f.id}
          className="ny-snowflake absolute text-white select-none"
          style={{ left: f.left, animationDelay: f.delay, animationDuration: f.duration, fontSize: f.size }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};

export default memo(NewYearMode);
