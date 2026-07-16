import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const ECONOMY_API = 'https://functions.poehali.dev/520c0947-b56d-41e1-a8bd-1de788b6f722';
const CACHE_DURATION = 5 * 60 * 1000;

type TabKey = 'top' | 'dp' | 'points' | 'playtime';

interface Player {
  rank: number;
  steamid: string;
  username: string;
  avatar: string;
  balance?: number;
  points?: number;
  playtime_minutes?: number;
}

const TABS: { key: TabKey; label: string; icon: string; valueHeader: string; group: 'balance' | 'stats' }[] = [
  { key: 'top', label: 'DC', icon: 'Coins', valueHeader: 'Баланс DC', group: 'balance' },
  { key: 'dp', label: 'DP', icon: 'Gem', valueHeader: 'Баланс DP', group: 'balance' },
  { key: 'points', label: 'Очки', icon: 'Star', valueHeader: 'Очки', group: 'stats' },
  { key: 'playtime', label: 'Время игры', icon: 'Clock', valueHeader: 'Время', group: 'stats' },
];

const formatNum = (n: number): string => n.toLocaleString('ru-RU');

const formatPlaytime = (minutes: number): string => {
  const total = Math.floor(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
};

const rankStyle = (rank: number): string => {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-300';
  if (rank === 3) return 'text-amber-600';
  return 'text-muted-foreground';
};

const renderValue = (tab: TabKey, p: Player): string => {
  if (tab === 'top') return `${formatNum(p.balance || 0)} DC`;
  if (tab === 'dp') return `${formatNum(p.balance || 0)} DP`;
  if (tab === 'points') return formatNum(p.points || 0);
  return formatPlaytime(p.playtime_minutes || 0);
};

const PlayerRow = memo(({ p, tab }: { p: Player; tab: TabKey }) => (
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
        <span
          className="text-sm font-medium text-foreground cursor-help border-b border-dotted border-muted-foreground/40"
          title={`Steam ID: ${p.steamid}`}
        >
          {p.username}
        </span>
      </div>
    </td>
    <td className="px-6 py-4 text-right">
      <span className="text-sm font-bold text-primary">{renderValue(tab, p)}</span>
    </td>
  </tr>
));
PlayerRow.displayName = 'PlayerRow';

type MainKey = 'balance' | 'points' | 'playtime';

const MAIN_TABS: { key: MainKey; label: string; icon: string }[] = [
  { key: 'balance', label: 'Баланс', icon: 'Wallet' },
  { key: 'points', label: 'Очки', icon: 'Star' },
  { key: 'playtime', label: 'Время игры', icon: 'Clock' },
];

const readInitialTab = (): { main: MainKey; sub: TabKey } => {
  try {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'dp') return { main: 'balance', sub: 'dp' };
    if (t === 'top') return { main: 'balance', sub: 'top' };
    if (t === 'points') return { main: 'points', sub: 'top' };
    if (t === 'playtime') return { main: 'playtime', sub: 'top' };
  } catch { /* ignore */ }
  return { main: 'balance', sub: 'top' };
};

type Period = 'today' | 'yesterday' | 'legends';

const PERIODS: { key: Period; label: string; icon: string }[] = [
  { key: 'today', label: 'Сегодня', icon: 'Sun' },
  { key: 'yesterday', label: 'Вчера', icon: 'History' },
  { key: 'legends', label: 'Легенды вайпа', icon: 'Award' },
];

const PAGE_SIZE = 10;

const TopRichSection = () => {
  const initial = readInitialTab();
  const [mainTab, setMainTab] = useState<MainKey>(initial.main);
  const [balanceSub, setBalanceSub] = useState<TabKey>(initial.sub);
  const activeTab: TabKey = mainTab === 'balance' ? balanceSub : mainTab;
  const [period, setPeriod] = useState<Period>('today');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (tab: TabKey, per: Period, skipCache = false) => {
    const cacheKey = `stats_cache_${tab}_${per}`;
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(cacheKey);
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
      const res = await fetch(`${ECONOMY_API}?action=stats&category=${tab}&period=${per}`);
      const json = await res.json();
      const top = json.top || [];
      setPlayers(top);
      localStorage.setItem(cacheKey, JSON.stringify({ data: top, ts: Date.now() }));
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); fetchData(activeTab, period); }, [activeTab, period, fetchData]);
  useEffect(() => { setPage(1); }, [searchQuery]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) => p.username.toLowerCase().includes(q) || p.steamid.includes(q)
    );
  }, [players, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <section className="py-20 min-h-screen bg-background relative">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] will-change-transform" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px] will-change-transform" />
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl mb-4 glow-text">
            <span className="text-primary">Статистика</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-[700px] mx-auto">
            Статистика игроков серверов DevilRust
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setMainTab(tab.key); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all ${
                mainTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card/50 text-muted-foreground hover:text-foreground border border-primary/20'
              }`}
            >
              <Icon name={tab.icon} className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {mainTab === 'balance' && (
          <div className="flex justify-center gap-2 mb-8">
            {TABS.filter((t) => t.group === 'balance').map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setBalanceSub(tab.key); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  balanceSub === tab.key
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-card/30 text-muted-foreground hover:text-foreground border border-primary/10'
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

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
              onClick={() => fetchData(activeTab, period, true)}
              disabled={loading}
              variant="outline"
              className="h-12 px-4"
            >
              <Icon name="RefreshCw" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PERIODS.map((per) => (
            <button
              key={per.key}
              onClick={() => setPeriod(per.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                period === per.key
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-card/40 text-muted-foreground hover:text-foreground border border-primary/20'
              }`}
            >
              <Icon name={per.icon} className="h-4 w-4" />
              {per.label}
            </button>
          ))}
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
                    <th className="px-6 py-4 text-sm font-semibold text-foreground uppercase tracking-wider text-left">#</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground uppercase tracking-wider text-left">Игрок</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground uppercase tracking-wider text-right">{currentTab.valueHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        {searchQuery
                          ? 'Ничего не найдено'
                          : period === 'yesterday'
                          ? 'За вчера данных пока нет — появятся завтра'
                          : 'Данных пока нет'}
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((p, i) => <PlayerRow key={`${p.steamid}-${i}`} p={p} tab={activeTab} />)
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-primary/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="ChevronLeft" className="h-4 w-4 mr-1" />
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  Страница {page} из {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Вперёд
                  <Icon name="ChevronRight" className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TopRichSection;