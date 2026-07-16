import { useState, useEffect, useRef, useCallback } from 'react';
import ServerCard from './ServerCard';
import type { ServerData, ServerStats } from './types';

interface ServerSliderProps {
  servers: ServerData[];
  serverStats: ServerStats;
  onConnect: (s: ServerData) => void;
  onDetails: (s: ServerData) => void;
  onCopyIP: (ip: string) => void;
  label: string;
  labelColor: string;
}

const ServerSlider = ({ servers, serverStats, onConnect, onDetails, onCopyIP, label, labelColor }: ServerSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [servers, checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? el.clientWidth : -el.clientWidth, behavior: 'smooth' });
  };

  if (servers.length === 0) return null;

  return (
    <div className="mb-10">
      <h3 className={`text-xl font-bold mb-5 uppercase tracking-widest ${labelColor}`}>{label}</h3>
      <div className="relative flex items-stretch gap-2">
        {/* Стрелка влево */}
        <button
          onClick={() => scroll('left')}
          disabled={!canLeft}
          aria-label="Листать влево"
          style={{
            width: 44, minWidth: 44,
            border: 'none',
            borderRadius: 10,
            background: 'rgb(22, 20, 30)',
            color: '#fff',
            fontSize: 22,
            cursor: canLeft ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canLeft ? 1 : 0.25,
            transition: 'opacity 0.2s',
          }}
        >
          ‹
        </button>

        {/* Трек */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}
        >
          {servers.map(server => (
            <ServerCard
              key={server.id}
              server={server}
              stats={serverStats[server.id]}
              onConnect={onConnect}
              onDetails={onDetails}
              onCopyIP={onCopyIP}
              sliderMode
            />
          ))}
        </div>

        {/* Стрелка вправо */}
        <button
          onClick={() => scroll('right')}
          disabled={!canRight}
          aria-label="Листать вправо"
          style={{
            width: 44, minWidth: 44,
            border: 'none',
            borderRadius: 10,
            background: 'rgb(22, 20, 30)',
            color: '#fff',
            fontSize: 22,
            cursor: canRight ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: canRight ? 1 : 0.25,
            transition: 'opacity 0.2s',
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default ServerSlider;
