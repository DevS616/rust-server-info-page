import { useState, useEffect } from 'react';

interface NewYearConfig {
  enabled: boolean;
  snowflakes: boolean;
  lights: boolean;
  santa: boolean;
}

const NewYearMode = () => {
  const [config, setConfig] = useState<NewYearConfig | null>(null);

  useEffect(() => {
    fetch('https://functions.poehali.dev/1ad77753-040f-405c-8e61-7230f64e30e9/')
      .then(res => res.json())
      .then(data => {
        setConfig({
          enabled: true,
          snowflakes: data.newyear_snow_enabled ?? true,
          lights: data.newyear_lights_enabled ?? true,
          santa: false
        });
      })
      .catch(() => setConfig(null));
  }, []);

  if (!config?.enabled) return null;

  return (
    <>
      {config.snowflakes && <Snowflakes />}
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

export default NewYearMode;