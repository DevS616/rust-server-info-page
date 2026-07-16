import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const ECONOMY_API = 'https://functions.poehali.dev/520c0947-b56d-41e1-a8bd-1de788b6f722';
const CACHE_KEY = 'top_rich_cache';
const CACHE_DURATION = 5 * 60 * 1000;

interface RichPlayer {
  rank: number;
  steamid: string;
  balance: number;
  username: string;
  avatar: string;
}

const formatMoney = (n: number): string => n.toLocaleString('ru-RU');

const rankStyle = (rank: number): string => {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-300';
  if (rank === 3) return 'text-amber-600';
  return 'text-muted-foreground';
};

const PlayerRow = memo(({ p }: { p: RichPlayer }) => (
  <tr className="hover:bg-primary/5 transition-colors">
    <td className="px-6 py-4">
      <span className={`text-lg font-bold ${rankStyle(p.rank)}`}>
        {p.rank <= 3 ? <Icon name="Crown" className="inline h-5 w-5 mr-1" /> : null}
        {p.rank}
      </span>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        {p.avatar ? (
          <img src={p.avatar} alt="" className="h-8 w-8 rounded-full border border-primary/30" loading="lazy" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="User" className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm font-medium text-foreground">{p.username}</span>
      </div>
    </td>
    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.steamid}</td>
    <td className="px-6 py-4 text-right">
      <span className="text-sm font-bold text-primary">{formatMoney(p.balance)} DC</span>
    </td>
  </tr>
));
PlayerRow.displayName = 'PlayerRow';

const TopRichSection = () => {
  const [players, setPlayers] = useState<RichPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTop = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_DURATION) {
            setPlayers(data);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }
    }
    setLoading(true);
    try {
      const res = await fetch(`${ECONOMY_API}?action=top&limit=100`);
      const json = await res.json();
      const top = json.top || [];
      setPlayers(top);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: top, ts: Date.now() }));
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTop(); }, [fetchTop]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) => p.username.toLowerCase().includes(q) || p.steamid.includes(q)
    );
  }, [players, searchQuery]);

  return (
    <section className="py-20 min-h-screen bg-background relative">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] will-change-transform" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px] will-change-transform" />
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl mb-4 glow-text">
            <span className="text-primary">Топ богачей</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-[700px] mx-auto">
            Самые состоятельные игроки серверов DevilRust
          </p>
        </div>

        <div className="mb-8 max-w-2xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Поиск по никнейму или Steam ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm"
              />
            </div>
            <Button
              onClick={() => fetchTop(true)}
              disabled={loading}
              variant="outline"
              className="h-12 px-4"
            >
              <Icon name="RefreshCw" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20 overflow-hidden shadow-lg max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/10 border-b border-primary/20">
                  <tr>
                    {['#', 'Игрок', 'Steam ID', 'Баланс'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-sm font-semibold text-foreground uppercase tracking-wider ${i === 3 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        {searchQuery ? 'Ничего не найдено' : 'Данных пока нет'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => <PlayerRow key={p.steamid} p={p} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopRichSection;