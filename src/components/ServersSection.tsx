import { useState, useEffect, useRef } from 'react';
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
import serversData from '@/data/servers.json';
import { monitoringService } from '@/services/monitoringService';

const pveServers = serversData.pveServers as Array<{
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
}>;

const pvpServers = serversData.pvpServers as Array<{
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
}>;

type SortType = 'number' | 'rate-asc' | 'rate-desc';
type FilterType = 'all' | 'pve' | 'pvp';

const ServersSection = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<typeof pveServers[0] | null>(null);
  const [sortBy, setSortBy] = useState<SortType>('number');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [serverStats, setServerStats] = useState<Record<string, { players: number; maxPlayers: number }>>({});
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastSoundTime = useRef(0);

  const playHoverSound = () => {
    const now = Date.now();
    if (now - lastSoundTime.current < 300) return;
    
    lastSoundTime.current = now;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  };

  useEffect(() => {
    const unsubscribe = monitoringService.subscribe((data) => {
      if (data?.result === 'success' && data.data?.servers) {
        const newStats: Record<string, { players: number; maxPlayers: number }> = {};
        
        data.data.servers.forEach((server: any) => {
          const serverIp = `${server.ip}:${server.port}`;
          const matchedServer = [...pveServers, ...pvpServers].find(s => s.serverIp === serverIp);
          
          if (matchedServer) {
            newStats[matchedServer.battlemetricsId] = {
              players: server.players,
              maxPlayers: server.playersMax
            };
          }
        });
        
        setServerStats(newStats);
      }
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newCards: string[] = [];
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId) {
              newCards.push(cardId);
            }
          }
        });
        
        if (newCards.length > 0) {
          setVisibleCards((prev) => {
            const newSet = new Set(prev);
            newCards.forEach(id => newSet.add(id));
            return newSet;
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    const timer = setTimeout(() => {
      cardRefs.current.forEach((card) => {
        if (card) observer.observe(card);
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [sortBy, filterBy]);

  const handleConnect = (ip: string) => {
    const connectCommand = `connect ${ip}`;
    navigator.clipboard.writeText(connectCommand);
    toast({
      title: "Команда скопирована!",
      description: `${connectCommand} — вставьте в консоль F1`,
    });
  };

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({
      title: "IP скопирован!",
      description: ip,
    });
  };

  const handleShowDetails = (server: typeof pveServers[0]) => {
    setSelectedServer(server);
    setIsDialogOpen(true);
  };



  const getDetailedDescription = (serverId: string) => {
    const server = [...pveServers, ...pvpServers].find(s => s.id === serverId);
    return server?.detailedDescription || serversData.defaultDetailedDescription;
  };

  const extractRate = (mode: string): number => {
    const match = mode.match(/x(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const allServers = [...pveServers, ...pvpServers];
  
  const filteredServers = allServers.filter(server => {
    if (filterBy === 'all') return true;
    if (filterBy === 'pve') return server.mode.includes('PVE');
    if (filterBy === 'pvp') return server.mode.includes('PVP');
    return true;
  });

  const sortedServers = [...filteredServers].sort((a, b) => {
    if (sortBy === 'number') return parseInt(a.id) - parseInt(b.id);
    if (sortBy === 'rate-asc') return extractRate(a.mode) - extractRate(b.mode);
    if (sortBy === 'rate-desc') return extractRate(b.mode) - extractRate(a.mode);
    return 0;
  });

  const ServerCard = ({ server, index }: { server: typeof pveServers[0]; index: number }) => {
    const isPVE = server.mode.includes('PVE');
    const cardColor = isPVE ? 'from-green-500/10 to-green-500/5' : 'from-red-500/10 to-red-500/5';
    const borderColor = isPVE ? 'border-green-500/30' : 'border-red-500/30';
    const badgeColor = isPVE ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500';
    const iconColor = isPVE ? 'text-green-500' : 'text-red-500';
    
    const stats = serverStats[server.battlemetricsId];
    const online = stats?.players ?? '—';
    const slots = stats?.maxPlayers ?? '—';
    const isServerOnline = stats !== undefined && stats.maxPlayers > 0;
    const isVisible = visibleCards.has(server.id);

    return (
      <div 
        ref={(el) => {
          if (el) cardRefs.current.set(server.id, el);
        }}
        data-card-id={server.id}
        className={`group relative overflow-hidden rounded-xl border ${borderColor} bg-gradient-to-br ${cardColor} p-6 transition-all hover:shadow-xl hover:shadow-primary/10 flex flex-col h-full ${
          isVisible ? 'server-card-visible' : 'server-card-animate'
        } ${!isServerOnline ? 'opacity-40' : ''}`}
        style={isVisible ? { animationDelay: `${index * 0.1}s` } : undefined}
      >
        {!isServerOnline && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="text-center px-4">
              <Icon name="PowerOff" className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Сервер выключен или на перезагрузке</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-background/50 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="mb-1 text-xl font-bold tracking-wide" style={{fontFamily: 'Nunito, sans-serif'}}>
                {server.name}
              </h3>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
                {server.mode}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="text-right cursor-help">
                    <div className="text-2xl font-bold mb-2" style={{fontFamily: 'Nunito, sans-serif'}}>
                      <span className={iconColor}>{online}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{slots}</span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${isServerOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{isServerOnline ? 'Сервер включен' : 'Сервер выключен'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            {server.description}
          </p>

          <div className="mb-4 space-y-2">
            {server.features.slice(0, 2).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Icon name="Check" className={`h-4 w-4 ${iconColor}`} />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-background/50 p-3 backdrop-blur-sm">
              <Icon name="Globe" className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 text-sm font-mono">{server.ip}</code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleCopyIP(server.ip)}
                className="h-8 w-8 p-0"
              >
                <Icon name="Copy" className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1 font-semibold uppercase tracking-wider" 
                onClick={() => handleConnect(server.ip)}
                onMouseEnter={playHoverSound}
              >
                <Icon name="Rocket" className="mr-2 h-4 w-4" />
                Играть
              </Button>
              <Button 
                variant="outline" 
                className={`${borderColor} hover:bg-primary/10 ${isServerOnline ? 'relative z-30' : ''}`}
                onClick={() => handleShowDetails(server)}
              >
                <Icon name="Info" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="servers" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,68,0,0.1),transparent_50%)]" />
      <div className="container relative z-10">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-wide" style={{fontFamily: 'Nunito, sans-serif', fontStyle: 'italic'}}>
            Наши серверы
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите сервер, который подходит именно вам. От классического геймплея до экстремальных модификаций.
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Фильтр:</span>
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все серверы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все серверы</SelectItem>
                <SelectItem value="pve">PVE</SelectItem>
                <SelectItem value="pvp">PVP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Сортировка:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="По номеру" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">По номеру</SelectItem>
                <SelectItem value="rate-asc">По рейту (возр.)</SelectItem>
                <SelectItem value="rate-desc">По рейту (убыв.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedServers.map((server, index) => (
            <ServerCard key={server.id} server={server} index={index} />
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedServer?.name}</DialogTitle>
            <DialogDescription className="text-base">
              {selectedServer?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedServer && getDetailedDescription(selectedServer.id) && (
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">{getDetailedDescription(selectedServer.id)!.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDetailedDescription(selectedServer.id)!.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <Icon name={highlight.icon as any} className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{highlight.text}</span>
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

          <div className="space-y-4 mt-6 pt-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Check" className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Ванильный опыт</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Check" className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Вайп 1 раз в месяц</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Check" className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Базы для рейдов</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Icon name="Check" className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Статистика</span>
              </div>
            </div>

            <Button 
              className="w-full font-semibold uppercase tracking-wider" 
              size="lg"
              onClick={() => {
                if (selectedServer) {
                  handleConnect(selectedServer.ip);
                  setIsDialogOpen(false);
                }
              }}
              onMouseEnter={playHoverSound}
            >
              <Icon name="Rocket" className="mr-2 h-5 w-5" />
              Подключиться к серверу
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ServersSection;