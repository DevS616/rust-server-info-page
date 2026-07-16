import ServerCard from './ServerCard';
import type { ServerData, ServerStats } from './types';

interface MobileSliderProps {
  servers: ServerData[];
  serverStats: ServerStats;
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
              stats={serverStats[s.id]}
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

export default MobileSlider;
