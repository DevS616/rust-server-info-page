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

export default ServerCard;
