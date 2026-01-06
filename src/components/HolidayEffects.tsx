import { useState, useEffect } from 'react';
import ChristmasGarland from './ChristmasGarland';

type HolidayType = 'newyear' | 'halloween' | 'autumn' | null;

const HolidayEffects = () => {
  const [activeHoliday, setActiveHoliday] = useState<HolidayType>(null);

  useEffect(() => {
    const loadHoliday = () => {
      fetch('https://functions.poehali.dev/1ad77753-040f-405c-8e61-7230f64e30e9/')
        .then(res => res.json())
        .then(data => {
          console.log('HolidayEffects: loaded from API:', data.active_holiday);
          setActiveHoliday(data.active_holiday || null);
        })
        .catch(() => setActiveHoliday(null));
    };

    const handleHolidayChange = (e: CustomEvent<HolidayType>) => {
      console.log('HolidayEffects: received event:', e.detail);
      setActiveHoliday(e.detail);
    };

    loadHoliday();
    window.addEventListener('holidayChanged', handleHolidayChange as EventListener);
    const interval = setInterval(loadHoliday, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('holidayChanged', handleHolidayChange as EventListener);
    };
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

const Snowflakes = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="snowflake absolute text-white"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 7}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${8 + Math.random() * 12}px`,
          }}
        >
          ❄
        </div>
      ))}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(calc(100vh + 50px)) rotate(360deg);
            opacity: 0;
          }
        }
        .snowflake {
          animation: snowfall linear infinite;
        }
      `}</style>
    </div>
  );
};

const Ghosts = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="ghost absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${8 + Math.random() * 4}s`,
            fontSize: '48px',
          }}
        >
          👻
        </div>
      ))}
      <style>{`
        @keyframes ghostFloat {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          50% {
            transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg);
            opacity: 0.9;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px) rotate(${Math.random() * 720}deg);
            opacity: 0;
          }
        }
        .ghost {
          animation: ghostFloat ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const Spiderweb = () => {
  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-50">
      <svg 
        width="100%" 
        height="150" 
        viewBox="0 0 1200 150" 
        preserveAspectRatio="xMidYMin slice"
        className="absolute top-0 left-0"
      >
        <path
          d="M 0,30 Q 150,10 300,30 T 600,30 T 900,30 T 1200,30"
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0,50 Q 150,35 300,50 T 600,50 T 900,50 T 1200,50"
          stroke="rgba(200, 200, 200, 0.25)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 100,0 L 100,60"
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="1"
        />
        <path
          d="M 300,0 L 280,70"
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="1"
        />
        <path
          d="M 600,0 L 600,80"
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="1"
        />
        <path
          d="M 900,0 L 920,70"
          stroke="rgba(200, 200, 200, 0.3)"
          strokeWidth="1"
        />
        <circle cx="100" cy="0" r="3" fill="rgba(100, 100, 100, 0.6)" />
        <circle cx="300" cy="0" r="3" fill="rgba(100, 100, 100, 0.6)" />
        <circle cx="600" cy="0" r="3" fill="rgba(100, 100, 100, 0.6)" />
        <circle cx="900" cy="0" r="3" fill="rgba(100, 100, 100, 0.6)" />
      </svg>
      <div className="absolute top-2 right-8 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>
        🕷️
      </div>
    </div>
  );
};

const FallingLeaves = () => {
  const leaves = ['🍂', '🍁', '🍃'];
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="leaf absolute"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
            fontSize: `${16 + Math.random() * 20}px`,
          }}
        >
          {leaves[i % leaves.length]}
        </div>
      ))}
      <style>{`
        @keyframes leafFall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(calc(100vh + 50px)) rotate(720deg) translateX(${Math.random() * 200 - 100}px);
            opacity: 0;
          }
        }
        .leaf {
          animation: leafFall ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default HolidayEffects;