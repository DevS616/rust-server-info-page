import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const API_URL = 'https://functions.poehali.dev/887805c0-0d3a-4f32-8436-1ba1adda4a4f';
const CACHE_KEY = 'support_stats_cache';
const CACHE_TTL = 10 * 60 * 1000;

interface Stats {
  total: number;
  open_count: number;
  in_progress_count: number;
  closed_count: number;
  rated_count: number;
  avg_rating: number;
  distribution: Record<string, number>;
}

interface SupportStatsProps {
  token: string;
}

const SupportStats = ({ token }: SupportStatsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<'top' | 'bottom'>('top');
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setStats(data);
          return;
        }
      } catch (_e) { /* ignore */ }
    }

    fetch(`${API_URL}/?action=stats`, { headers: { 'X-Auth-Token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        }
      })
      .catch(() => {});
  }, [token]);

  if (!stats) return null;

  const rating = stats.avg_rating;
  const fullStars = Math.floor(rating);
  const partial = rating - fullStars;

  const handleMouseEnter = () => {
    if (starsRef.current) {
      const rect = starsRef.current.getBoundingClientRect();
      setTooltipPos(rect.top < 200 ? 'bottom' : 'top');
    }
    setHovered(true);
  };

  return (
    <Card className="mt-6 p-5 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Рейтинг со звёздами */}
        <div className="flex flex-col items-start gap-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Качество поддержки</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-white">{rating > 0 ? rating.toFixed(1) : '—'}</span>

            {/* Звёзды с тултипом */}
            <div
              ref={starsRef}
              className="relative flex items-center gap-0.5 cursor-default"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={() => setHovered(false)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                let fill = 0;
                if (star <= fullStars) fill = 100;
                else if (star === fullStars + 1 && partial > 0) fill = Math.round(partial * 100);

                return (
                  <span key={star} className="relative inline-block w-6 h-6">
                    <Icon name="Star" size={24} className="text-slate-600 absolute inset-0" />
                    {fill > 0 && (
                      <span
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${fill}%` }}
                      >
                        <Icon name="Star" size={24} className="text-yellow-400 fill-yellow-400 absolute inset-0" />
                      </span>
                    )}
                  </span>
                );
              })}

              {/* Тултип */}
              {hovered && (
                <div
                  className={`absolute ${tooltipPos === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} left-1/2 -translate-x-1/2 z-50 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4`}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 border-slate-700 rotate-45
                    ${tooltipPos === 'top' ? 'bottom-[-6px] border-r border-b' : 'top-[-6px] border-l border-t'}"
                    style={tooltipPos === 'top'
                      ? { bottom: '-6px', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }
                      : { top: '-6px', borderLeft: '1px solid #334155', borderTop: '1px solid #334155' }
                    }
                  />

                  <p className="text-xs text-slate-400 mb-3 font-medium">Статистика обращений</p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        Всего
                      </span>
                      <span className="text-xs font-bold text-white">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                        Открыто
                      </span>
                      <span className="text-xs font-bold text-green-400">{stats.open_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                        В обработке
                      </span>
                      <span className="text-xs font-bold text-yellow-400">{stats.in_progress_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                        Закрыто
                      </span>
                      <span className="text-xs font-bold text-slate-400">{stats.closed_count}</span>
                    </div>
                  </div>

                  {stats.rated_count > 0 && (
                    <>
                      <div className="border-t border-slate-700 my-3" />
                      <p className="text-xs text-slate-400 mb-2">Оценок: {stats.rated_count}</p>
                      <div className="space-y-1">
                        {[5, 4, 3, 2, 1].map(n => {
                          const count = stats.distribution[String(n)] || 0;
                          const pct = stats.rated_count > 0 ? Math.round(count / stats.rated_count * 100) : 0;
                          return (
                            <div key={n} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-4">{n}★</span>
                              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {stats.rated_count > 0 && (
              <span className="text-xs text-slate-500">{stats.rated_count} {stats.rated_count === 1 ? 'оценка' : stats.rated_count < 5 ? 'оценки' : 'оценок'}</span>
            )}
          </div>
        </div>

        {/* Счётчики — только на мобильных ниже рейтинга, на десктопе справа */}
        <div className="flex gap-4 sm:gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-green-400">{stats.open_count}</p>
            <p className="text-xs text-slate-500">Открыто</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-yellow-400">{stats.in_progress_count}</p>
            <p className="text-xs text-slate-500">В обработке</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-400">{stats.closed_count}</p>
            <p className="text-xs text-slate-500">Закрыто</p>
          </div>
        </div>
      </div>

      {/* На мобильных — подсказка вместо тултипа */}
      <p className="sm:hidden text-xs text-slate-600 mt-3 text-center">
        Наведите на звёзды для подробной статистики
      </p>
    </Card>
  );
};

export default SupportStats;