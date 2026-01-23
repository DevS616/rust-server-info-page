import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Icon from '@/components/ui/icon';

interface ServerCardProps {
  server: {
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
  index: number;
  serverStats: Record<string, { players: number; maxPlayers: number }>;
  visibleCards: Set<string>;
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onConnect: (server: any) => void;
  onShowDetails: (server: any) => void;
  onCopyIP: (ip: string) => void;
}

const ServerCard = ({
  server,
  index,
  serverStats,
  visibleCards,
  cardRefs,
  onConnect,
  onShowDetails,
  onCopyIP,
}: ServerCardProps) => {
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
              onClick={() => onCopyIP(server.ip)}
              className="h-8 w-8 p-0"
            >
              <Icon name="Copy" className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 font-semibold uppercase tracking-wider" 
              onClick={() => onConnect(server)}
            >
              <Icon name="Rocket" className="mr-2 h-4 w-4" />
              Играть
            </Button>
            <Button 
              variant="outline" 
              className={`${borderColor} hover:bg-primary/10 ${isServerOnline ? 'relative z-30' : ''}`}
              onClick={() => onShowDetails(server)}
            >
              <Icon name="Info" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerCard;
