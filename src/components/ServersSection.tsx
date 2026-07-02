import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { monitoringService } from '@/services/monitoringService';

const SERVERS_API = 'https://functions.poehali.dev/cd63f370-b8ea-4adc-ace4-a274aa6f6e34';

type ServerData = {
  id: string;
  name: string;
  mode: string;
  ip: string;
  serverIp: string;
  battlemetricsId: string;
  description: string;
  features: string[];
  detailedDescription?: {
    title: string;
    highlights: Array<{ icon: string; text: string }>;
    description: string;
  };
};

type SortType = 'number' | 'rate-asc' | 'rate-desc';
type FilterType = 'all' | 'pve' | 'pvp' | 'creative';

const extractRate = (mode: string): number => {
  const match = mode.match(/x(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

/* ─── ServerCard ─── */
interface ServerCardProps {
  server: ServerData;
  stats?: { players: number; maxPlayers: number };
  onConnect: (server: ServerData) => void;
  onDetails: (server: ServerData) => void;
  onCopyIP: (ip: string) => void;
  sliderMode?: boolean;
}

const ServerCard = memo(({ server, stats, onConnect, onDetails, onCopyIP, sliderMode = false }: ServerCardProps) => {
  const isPVE = server.mode.includes('PVE');
  const isCreative = server.mode.includes('CREATIVE');
  const online = stats?.players ?? '—';
  const slots = stats?.maxPlayers ?? '—';
  const isOnline = stats !== undefined && stats.maxPlayers > 0;
  const fillPct = stats ? Math.round((stats.players / Math.max(stats.maxPlayers, 1)) * 100) : 0;

  const bg = isPVE
    ? 'linear-gradient(135deg, rgb(18,15,25), rgba(74,222,128,0.25))'
    : isCreative
      ? 'linear-gradient(135deg, rgb(18,15,25), rgba(139,92,246,0.25))'
      : 'linear-gradient(135deg, rgb(18,15,25), rgba(255,87,36,0.25))';

  const iconColor = isPVE ? 'text-green-400' : isCreative ? 'text-violet-400' : 'text-primary';
  const badgeBg = isPVE ? 'bg-green-500/15 text-green-400' : isCreative ? 'bg-violet-500/15 text-violet-400' : 'bg-primary/15 text-primary';
  const barColor = isPVE ? 'bg-green-400' : isCreative ? 'bg-violet-400' : 'bg-primary';
  const borderColor = isPVE ? 'rgba(74,222,128,0.2)' : isCreative ? 'rgba(139,92,246,0.2)' : 'rgba(255,87,36,0.2)';

  const sliderStyles = sliderMode
    ? { width: 'calc((100% - 32px) / 3)', aspectRatio: '1 / 1', scrollSnapAlign: 'start' as const }
    : {};

  return (
    <div
      className="relative flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
      style={{ background: bg, border: `1px solid ${borderColor}`, ...sliderStyles }}
    >
      {!isOnline && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
          <div className="text-center px-4">
            <Icon name="PowerOff" className="h-7 w-7 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-semibold text-foreground">Сервер выключен</p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-4 md:p-5">

        {/* Шапка: онлайн-индикатор + название + бейдж */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? barColor : 'bg-muted-foreground/40'}`} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight font-nunito">{server.name}</h3>
            <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badgeBg}`}>
              {server.mode}
            </span>
          </div>
          {/* Онлайн счётчик */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold">
              <span className={iconColor}>{online}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/40 text-xs">{slots}</span>
            </div>
          </div>
        </div>

        {/* Полоска онлайна */}
        <div className="h-1 w-full rounded-full bg-white/10 mb-3">
          <div className={`h-1 rounded-full ${barColor} transition-all`} style={{ width: `${fillPct}%` }} />
        </div>

        {/* Описание + фичи */}
        <div className="flex-1 overflow-hidden mb-3">
          {server.description && (
            <p className="text-xs text-white/55 leading-relaxed mb-2 line-clamp-2">{server.description}</p>
          )}
          {server.features.length > 0 && (
            <div className="space-y-1">
              {server.features.slice(0, 5).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-white/70">
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 ${barColor}`} />
                  <span className="truncate">{feature}</span>
                </div>
              ))}
              {server.features.length > 5 && (
                <div className="text-xs text-white/40 pl-3">+{server.features.length - 5} ещё...</div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onCopyIP(server.ip)}
            className="text-xs px-3 py-2 rounded-lg text-white/70 hover:text-white transition-colors flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Icon name="Copy" size={12} className="inline mr-1 -mt-0.5" />
            IP
          </button>
          <Button size="sm" className="flex-1 text-xs font-semibold uppercase tracking-wider" onClick={() => onConnect(server)}>
            <Icon name="Rocket" size={12} className="mr-1" />
            Играть
          </Button>
          <Button size="sm" variant="outline" className="px-2 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }} onClick={() => onDetails(server)}>
            <Icon name="Info" size={13} />
          </Button>
        </div>

      </div>
    </div>
  );
});
ServerCard.displayName = 'ServerCard';

/* ─── ServerSlider ─── */
interface ServerSliderProps {
  servers: ServerData[];
  serverStats: Record<string, { players: number; maxPlayers: number }>;
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
              stats={serverStats[server.battlemetricsId]}
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

/* ─── MobileSlider ─── */
interface MobileSliderProps {
  servers: ServerData[];
  serverStats: Record<string, { players: number; maxPlayers: number }>;
  onConnect: (s: ServerData) => void;
  onDetails: (s: ServerData) => void;
  onCopyIP: (ip: string) => void;
  label: string;
  labelColor: string;
}

const MobileSlider = ({ servers, serverStats, onConnect, onDetails, onCopyIP, label, labelColor }: MobileSliderProps) => {
  if (servers.length === 0) return null;
  return (
    <div className="mb-8">
      <h3 className={`text-lg font-bold mb-4 uppercase tracking-widest ${labelColor}`}>{label}</h3>
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {servers.map(s => (
          <div key={s.id} style={{ width: '80vw', maxWidth: 300, flexShrink: 0, scrollSnapAlign: 'start' }}>
            <ServerCard
              server={s}
              stats={serverStats[s.battlemetricsId]}
              onConnect={onConnect}
              onDetails={onDetails}
              onCopyIP={onCopyIP}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── ServersSection ─── */
const ServersSection = () => {
  const { toast } = useToast();
  const [allServersFlat, setAllServersFlat] = useState<ServerData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerData | null>(null);
  const [connectServer, setConnectServer] = useState<ServerData | null>(null);
  const [sortBy, setSortBy] = useState<SortType>('number');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [serverStats, setServerStats] = useState<Record<string, { players: number; maxPlayers: number }>>({});

  useEffect(() => {
    fetch(`${SERVERS_API}/`)
      .then(r => r.json())
      .then(data => {
        const servers: ServerData[] = (data.servers || []).map((s: {
          id: number; name: string; mode: string; ip: string; server_ip: string;
          battlemetrics_id: string; description: string; features: unknown;
          detailed_description: unknown;
        }) => ({
          id: String(s.id),
          name: s.name,
          mode: s.mode || '',
          ip: s.ip || '',
          serverIp: s.server_ip || '',
          battlemetricsId: s.battlemetrics_id || '',
          description: s.description || '',
          features: Array.isArray(s.features)
            ? s.features
            : typeof s.features === 'string'
              ? JSON.parse(s.features)
              : [],
          detailedDescription: s.detailed_description
            ? (typeof s.detailed_description === 'string'
                ? JSON.parse(s.detailed_description)
                : s.detailed_description)
            : undefined,
        }));
        setAllServersFlat(servers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((data) => {
      if (data?.result === 'success' && data.data?.servers) {
        const newStats: Record<string, { players: number; maxPlayers: number }> = {};
        data.data.servers.forEach((server: { ip: string; port: number; players: number; playersMax: number }) => {
          const serverIp = `${server.ip}:${server.port}`;
          const matched = allServersFlat.find(s => s.serverIp === serverIp);
          if (matched) {
            newStats[matched.battlemetricsId] = { players: server.players, maxPlayers: server.playersMax };
          }
        });
        setServerStats(newStats);
      }
    });
    return unsubscribe;
  }, [allServersFlat]);

  const handleConnect = useCallback((server: ServerData) => {
    setConnectServer(server);
    setIsConnectDialogOpen(true);
  }, []);

  const handleCopyConnectCommand = useCallback(() => {
    if (!connectServer) return;
    const cmd = `connect ${connectServer.ip}`;
    navigator.clipboard.writeText(cmd);
    toast({ title: 'Команда скопирована!', description: `${cmd} — вставьте в консоль F1` });
  }, [connectServer, toast]);

  const handleCopyIP = useCallback((ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({ title: 'IP скопирован!', description: ip });
  }, [toast]);

  const handleShowDetails = useCallback((server: ServerData) => {
    setSelectedServer(server);
    setIsDialogOpen(true);
  }, []);

  const getDetailedDescription = useCallback((serverId: string) => {
    const s = allServersFlat.find(s => s.id === serverId);
    return s?.detailedDescription || null;
  }, [allServersFlat]);

  const filteredServers = allServersFlat.filter(server => {
    if (filterBy === 'pve') return server.mode.includes('PVE');
    if (filterBy === 'pvp') return server.mode.includes('PVP');
    if (filterBy === 'creative') return server.mode.includes('CREATIVE');
    return true;
  });

  const sortedServers = [...filteredServers].sort((a, b) => {
    if (sortBy === 'number') return parseInt(a.id) - parseInt(b.id);
    if (sortBy === 'rate-asc') return extractRate(a.mode) - extractRate(b.mode);
    if (sortBy === 'rate-desc') return extractRate(b.mode) - extractRate(a.mode);
    return 0;
  });

  const pveServers = sortedServers.filter(s => s.mode.includes('PVE'));
  const pvpServers = sortedServers.filter(s => s.mode.includes('PVP'));
  const creativeServers = sortedServers.filter(s => s.mode.includes('CREATIVE'));

  const sliderProps = { serverStats, onConnect: handleConnect, onDetails: handleShowDetails, onCopyIP: handleCopyIP };

  return (
    <section id="servers" className="py-20 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-wide font-nunito-italic">Наши серверы</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите сервер, который подходит именно вам. От классического геймплея до экстремальных модификаций.
          </p>
        </div>

        {/* Фильтры */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Фильтр:</span>
            <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterType)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Все серверы" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все серверы</SelectItem>
                <SelectItem value="pve">PVE</SelectItem>
                <SelectItem value="pvp">PVP</SelectItem>
                <SelectItem value="creative">CREATIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Сортировка:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="По номеру" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="number">По номеру</SelectItem>
                <SelectItem value="rate-asc">По рейту (возр.)</SelectItem>
                <SelectItem value="rate-desc">По рейту (убыв.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Десктоп: слайдеры */}
        <div className="hidden md:block">
          {filterBy === 'all' ? (
            <>
              {pveServers.length > 0 && <ServerSlider servers={pveServers} label="PVE серверы" labelColor="text-green-400" {...sliderProps} />}
              {pvpServers.length > 0 && <ServerSlider servers={pvpServers} label="PVP серверы" labelColor="text-primary" {...sliderProps} />}
              {creativeServers.length > 0 && <ServerSlider servers={creativeServers} label="Creative серверы" labelColor="text-violet-400" {...sliderProps} />}
            </>
          ) : (
            <ServerSlider
              servers={sortedServers}
              label={filterBy === 'pve' ? 'PVE серверы' : filterBy === 'creative' ? 'Creative серверы' : 'PVP серверы'}
              labelColor={filterBy === 'pve' ? 'text-green-400' : filterBy === 'creative' ? 'text-violet-400' : 'text-primary'}
              {...sliderProps}
            />
          )}
        </div>

        {/* Мобайл: горизонтальный свайп-слайдер */}
        <div className="md:hidden">
          {filterBy === 'all' ? (
            <>
              {pveServers.length > 0 && <MobileSlider servers={pveServers} serverStats={serverStats} onConnect={handleConnect} onDetails={handleShowDetails} onCopyIP={handleCopyIP} label="PVE серверы" labelColor="text-green-400" />}
              {pvpServers.length > 0 && <MobileSlider servers={pvpServers} serverStats={serverStats} onConnect={handleConnect} onDetails={handleShowDetails} onCopyIP={handleCopyIP} label="PVP серверы" labelColor="text-primary" />}
              {creativeServers.length > 0 && <MobileSlider servers={creativeServers} serverStats={serverStats} onConnect={handleConnect} onDetails={handleShowDetails} onCopyIP={handleCopyIP} label="Creative серверы" labelColor="text-violet-400" />}
            </>
          ) : (
            <MobileSlider
              servers={sortedServers}
              serverStats={serverStats}
              onConnect={handleConnect}
              onDetails={handleShowDetails}
              onCopyIP={handleCopyIP}
              label={filterBy === 'pve' ? 'PVE серверы' : filterBy === 'creative' ? 'Creative серверы' : 'PVP серверы'}
              labelColor={filterBy === 'pve' ? 'text-green-400' : filterBy === 'creative' ? 'text-violet-400' : 'text-primary'}
            />
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedServer?.name}</DialogTitle>
            <DialogDescription className="text-base">{selectedServer?.description}</DialogDescription>
          </DialogHeader>
          {selectedServer && getDetailedDescription(selectedServer.id) && (
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">{getDetailedDescription(selectedServer.id)!.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDetailedDescription(selectedServer.id)!.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <Icon name={h.icon as Parameters<typeof Icon>[0]['name']} className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{h.text}</span>
                    </div>
                  ))}
                </div>
                {getDetailedDescription(selectedServer.id)!.description && (
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {getDetailedDescription(selectedServer.id)!.description}
                  </p>
                )}
              </div>
            </div>
          )}
          {selectedServer && selectedServer.features.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-base font-semibold mb-3">Особенности сервера</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedServer.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Icon name="Check" className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4 mt-6 pt-6 border-t">
            <Button className="w-full font-semibold uppercase tracking-wider" size="lg"
              onClick={() => { if (selectedServer) { handleConnect(selectedServer); setIsDialogOpen(false); } }}>
              <Icon name="Rocket" className="mr-2 h-5 w-5" />
              Подключиться к серверу
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Icon name="Rocket" className="h-6 w-6 text-primary" />
              Как подключиться к серверу
            </DialogTitle>
            <DialogDescription>
              Следуйте инструкции ниже, чтобы зайти на {connectServer?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              {[
                { step: 1, title: 'Запустите Rust', text: 'Откройте игру и дождитесь полной загрузки главного меню' },
                { step: 2, title: 'Откройте консоль', text: <>Нажмите клавишу <kbd className="px-2 py-1 bg-background border rounded">F1</kbd> — откроется консоль разработчика</> },
              ].map(({ step, title, text }) => (
                <div key={step} className="flex gap-4 items-start p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{step}</div>
                  <div><h4 className="font-semibold mb-2">{title}</h4><p className="text-sm text-muted-foreground">{text}</p></div>
                </div>
              ))}
              <div className="flex gap-4 items-start p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-3">Скопируйте команду подключения</h4>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                    <code className="flex-1 text-sm font-mono text-primary">connect {connectServer?.ip}</code>
                    <Button variant="outline" size="sm" onClick={handleCopyConnectCommand} className="flex-shrink-0">
                      <Icon name="Copy" className="h-4 w-4 mr-2" />Копировать
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-start p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">4</div>
                <div>
                  <h4 className="font-semibold mb-2">Вставьте и выполните</h4>
                  <p className="text-sm text-muted-foreground">Вставьте в консоль (Ctrl+V) и нажмите <kbd className="px-2 py-1 bg-background border rounded">Enter</kbd></p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-3">
                <Icon name="Info" className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-500 mb-1">Совет</p>
                  <p className="text-muted-foreground">Если возникли проблемы с подключением, попробуйте перезапустить игру или проверьте интернет</p>
                </div>
              </div>
            </div>
            <Button className="w-full font-semibold" size="lg" onClick={() => setIsConnectDialogOpen(false)}>
              Понятно, спасибо!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ServersSection;