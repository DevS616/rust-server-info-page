import { memo } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import type { ServerData } from './types';

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
    ? { width: 'calc((100% - 24px) / 2)', minHeight: 380, scrollSnapAlign: 'start' as const }
    : {};

  return (
    <div
      className="relative flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
      style={{ background: bg, border: `1px solid ${borderColor}`, ...sliderStyles }}
    >
      {!isOnline && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
          <div className="text-center px-4">
            <Icon name="PowerOff" className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
            <p className="text-base font-semibold text-foreground">Сервер выключен</p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-5 md:p-7">

        {/* Шапка: онлайн-индикатор + название + бейдж */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`mt-2 w-3 h-3 rounded-full flex-shrink-0 ${isOnline ? barColor : 'bg-muted-foreground/40'}`} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl md:text-2xl leading-tight font-nunito">{server.name}</h3>
            <span className={`inline-block mt-2 rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wider ${badgeBg}`}>
              {server.mode}
            </span>
          </div>
          {/* Онлайн счётчик */}
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold">
              <span className={iconColor}>{online}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50 text-lg">{slots}</span>
            </div>
          </div>
        </div>

        {/* Полоска онлайна */}
        <div className="h-1.5 w-full rounded-full bg-white/10 mb-5">
          <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${fillPct}%` }} />
        </div>

        {/* Описание + фичи */}
        <div className="flex-1 overflow-hidden mb-5">
          {server.description && (
            <p className="text-base text-white/75 leading-relaxed mb-4 line-clamp-3">{server.description}</p>
          )}
          {server.features.length > 0 && (
            <div className="space-y-2">
              {server.features.slice(0, 5).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-base text-white/85">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${barColor}`} />
                  <span className="truncate">{feature}</span>
                </div>
              ))}
              {server.features.length > 5 && (
                <div className="text-sm text-white/50 pl-4">+{server.features.length - 5} ещё...</div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={() => onCopyIP(server.ip)}
            className="text-sm px-4 py-2.5 rounded-lg text-white/80 hover:text-white transition-colors flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Icon name="Copy" size={16} className="inline mr-1.5 -mt-0.5" />
            IP
          </button>
          <Button className="flex-1 h-11 text-base font-semibold uppercase tracking-wider" onClick={() => onConnect(server)}>
            <Icon name="Rocket" size={18} className="mr-2" />
            Играть
          </Button>
          <Button variant="outline" className="h-11 w-11 px-0 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }} onClick={() => onDetails(server)}>
            <Icon name="Info" size={18} />
          </Button>
        </div>

      </div>
    </div>
  );
});
ServerCard.displayName = 'ServerCard';

export default ServerCard;
