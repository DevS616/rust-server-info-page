import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const ECONOMY_API = 'https://functions.poehali.dev/520c0947-b56d-41e1-a8bd-1de788b6f722';
const ROTATE_MS = 10000;

interface Legend {
  tab: string;
  title: string;
  icon: string;
  steamid: string;
  username: string;
  avatar: string;
  value: string;
}

const formatNum = (n: number): string => (n || 0).toLocaleString('ru-RU');

const formatPlaytime = (minutes: number): string => {
  const total = Math.floor(minutes || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
};

const CATEGORIES = [
  { tab: 'top', title: 'Богатейший игрок', icon: 'Coins', action: 'top', suffix: ' DC', field: 'balance' },
  { tab: 'dp', title: 'Лидер по DP', icon: 'Gem', action: 'dp', suffix: ' DP', field: 'balance' },
  { tab: 'points', title: 'Лучший по очкам', icon: 'Star', action: 'points', suffix: '', field: 'points' },
  { tab: 'playtime', title: 'Больше всех наиграл', icon: 'Clock', action: 'playtime', suffix: '', field: 'playtime' },
];

const ServerLegends = () => {
  const navigate = useNavigate();
  const [legends, setLegends] = useState<Legend[]>([]);
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results: Legend[] = [];
      for (const cat of CATEGORIES) {
        try {
          const res = await fetch(`${ECONOMY_API}?action=${cat.action}&limit=1`);
          const json = await res.json();
          const p = (json.top || [])[0];
          if (!p) continue;
          let value = '';
          if (cat.field === 'balance') value = formatNum(p.balance) + cat.suffix;
          else if (cat.field === 'points') value = formatNum(p.points);
          else value = formatPlaytime(p.playtime_minutes);
          results.push({
            tab: cat.tab,
            title: cat.title,
            icon: cat.icon,
            steamid: p.steamid,
            username: p.username || 'Игрок',
            avatar: p.avatar || '',
            value,
          });
        } catch { /* ignore */ }
      }
      if (!cancelled) setLegends(results);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (legends.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % legends.length);
        setFade(true);
      }, 300);
    }, ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [legends.length]);

  if (legends.length === 0) return null;

  const l = legends[current];

  return (
    <section className="py-16 bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-2 glow-text">
            <span className="text-primary">Достояние сервера</span>
          </h2>
          <p className="text-muted-foreground">Лучшие игроки DevilRust прямо сейчас</p>
        </div>

        <button
          onClick={() => navigate(`/top?tab=${l.tab}`)}
          className="group block mx-auto max-w-md w-full"
        >
          <div
            className={`relative bg-card/60 backdrop-blur-sm rounded-2xl border border-primary/30 p-8 shadow-xl transition-all duration-300 group-hover:border-primary group-hover:shadow-primary/20 group-hover:-translate-y-1 ${fade ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex items-center gap-2 text-yellow-400">
                <Icon name="Trophy" className="h-7 w-7" />
                <span className="text-sm font-semibold uppercase tracking-wider">{l.title}</span>
              </div>

              <div className="relative mb-4">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-600 opacity-70 blur-sm" />
                {l.avatar ? (
                  <img
                    src={l.avatar}
                    alt=""
                    className="relative h-24 w-24 rounded-full border-2 border-yellow-400 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative h-24 w-24 rounded-full border-2 border-yellow-400 bg-primary/10 flex items-center justify-center">
                    <Icon name="User" className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-background rounded-full h-9 w-9 flex items-center justify-center shadow-lg">
                  <Icon name="Crown" className="h-5 w-5" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-1">{l.username}</h3>
              <div className="flex items-center gap-2 text-primary">
                <Icon name={l.icon} className="h-5 w-5" />
                <span className="text-xl font-bold">{l.value}</span>
              </div>

              <span className="mt-5 text-xs text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                Открыть статистику →
              </span>
            </div>
          </div>
        </button>

        {legends.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {legends.map((leg, i) => (
              <button
                key={leg.tab}
                onClick={() => { setFade(false); setTimeout(() => { setCurrent(i); setFade(true); }, 200); }}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50'}`}
                aria-label={leg.title}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServerLegends;
