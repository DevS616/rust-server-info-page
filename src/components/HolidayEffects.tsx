import { useState, useEffect } from 'react';
import ChristmasGarland from './ChristmasGarland';

type HolidayType = 'newyear' | 'halloween' | 'autumn' | null;

/* Pre-computed particle data — no Math.random() during render */
const SNOWFLAKES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: `${(i * 2.5) % 100}%`,
  delay: `${(i * 0.17) % 7}s`,
  duration: `${3 + (i % 5) * 0.8}s`,
  size: `${9 + (i % 4) * 3}px`,
}));

const LEAVES_EMOJI = ['🍂', '🍁', '🍃'];
const LEAVES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  emoji: LEAVES_EMOJI[i % 3],
  left: `${(i * 4) % 100}%`,
  delay: `${(i * 0.32) % 8}s`,
  duration: `${5 + (i % 5) * 1}s`,
  size: `${16 + (i % 4) * 6}px`,
}));

const GHOSTS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  left: `${(i * 16.6) % 100}%`,
  top: `${(i * 15 + 10) % 80}%`,
  delay: `${(i * 0.9) % 5}s`,
  duration: `${8 + (i % 3) * 2}s`,
}));

const HolidayEffects = () => {
  const [activeHoliday, setActiveHoliday] = useState<HolidayType>(null);

  useEffect(() => {
    const handleHolidayChange = (e: CustomEvent<HolidayType>) => {
      setActiveHoliday(e.detail);
    };
    window.addEventListener('holidayChanged', handleHolidayChange as EventListener);
    return () => window.removeEventListener('holidayChanged', handleHolidayChange as EventListener);
  }, []);

  if (!activeHoliday) return null;

  return (
    <>
      {activeHoliday === 'newyear' && (
        <>
          <Snowflakes />
          <ChristmasGarland />
        </>
      )}
      {activeHoliday === 'halloween' && (
        <>
          <Ghosts />
          <Spiderweb />
        </>
      )}
      {activeHoliday === 'autumn' && <FallingLeaves />}
    </>
  );
};

const Snowflakes = () => (
  <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
    <style>{`
      @keyframes snowfall {
        0% { transform: translateY(-50px) rotate(0deg); opacity: 0; }
        10% { opacity: 0.8; }
        90% { opacity: 0.8; }
        100% { transform: translateY(calc(100vh + 50px)) rotate(360deg); opacity: 0; }
      }
      .snowflake { animation: snowfall linear infinite; will-change: transform; }
    `}</style>
    {SNOWFLAKES.map((f) => (
      <div
        key={f.id}
        className="snowflake absolute text-white select-none"
        style={{
          left: f.left,
          animationDelay: f.delay,
          animationDuration: f.duration,
          fontSize: f.size,
        }}
      >
        ❄
      </div>
    ))}
  </div>
);

const Ghosts = () => (
  <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
    <style>{`
      @keyframes ghostFloat {
        0% { transform: translate(0,0) scale(1); opacity: 0; }
        15% { opacity: 0.7; }
        50% { transform: translate(60px,-80px) scale(1.05); opacity: 0.85; }
        85% { opacity: 0.7; }
        100% { transform: translate(-40px,120px) scale(0.9); opacity: 0; }
      }
      .ghost { animation: ghostFloat ease-in-out infinite; will-change: transform, opacity; }
    `}</style>
    {GHOSTS.map((g) => (
      <div
        key={g.id}
        className="ghost absolute text-5xl select-none"
        style={{
          left: g.left,
          top: g.top,
          animationDelay: g.delay,
          animationDuration: g.duration,
        }}
      >
        👻
      </div>
    ))}
  </div>
);

const Spiderweb = () => (
  <div className="fixed top-0 left-0 right-0 pointer-events-none z-[9999]">
    <svg
      width="100%"
      height="150"
      viewBox="0 0 1200 150"
      preserveAspectRatio="xMidYMin slice"
      className="absolute top-0 left-0"
    >
      <path d="M 0,30 Q 150,10 300,30 T 600,30 T 900,30 T 1200,30" stroke="rgba(200,200,200,0.3)" strokeWidth="2" fill="none" />
      <path d="M 0,50 Q 150,35 300,50 T 600,50 T 900,50 T 1200,50" stroke="rgba(200,200,200,0.25)" strokeWidth="1.5" fill="none" />
      <path d="M 100,0 L 100,60" stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
      <path d="M 300,0 L 280,70" stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
      <path d="M 600,0 L 600,80" stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
      <path d="M 900,0 L 920,70" stroke="rgba(200,200,200,0.3)" strokeWidth="1" />
      <circle cx="100" cy="0" r="3" fill="rgba(100,100,100,0.6)" />
      <circle cx="300" cy="0" r="3" fill="rgba(100,100,100,0.6)" />
      <circle cx="600" cy="0" r="3" fill="rgba(100,100,100,0.6)" />
      <circle cx="900" cy="0" r="3" fill="rgba(100,100,100,0.6)" />
    </svg>
    <div className="absolute top-2 right-8 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>
      🕷️
    </div>
  </div>
);

const FallingLeaves = () => (
  <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
    <style>{`
      @keyframes leafFall {
        0% { transform: translateY(-50px) rotate(0deg); opacity: 0; }
        10% { opacity: 0.9; }
        90% { opacity: 0.9; }
        100% { transform: translateY(calc(100vh + 50px)) rotate(540deg) translateX(60px); opacity: 0; }
      }
      .leaf { animation: leafFall ease-in-out infinite; will-change: transform; }
    `}</style>
    {LEAVES.map((l) => (
      <div
        key={l.id}
        className="leaf absolute select-none"
        style={{
          left: l.left,
          animationDelay: l.delay,
          animationDuration: l.duration,
          fontSize: l.size,
        }}
      >
        {l.emoji}
      </div>
    ))}
  </div>
);

export default HolidayEffects;
