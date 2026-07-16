export type ServerData = {
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

export type SortType = 'number' | 'rate-asc' | 'rate-desc';
export type FilterType = 'all' | 'pve' | 'pvp' | 'creative';

export type ServerStats = Record<string, { players: number; maxPlayers: number }>;

export const extractRate = (mode: string): number => {
  const match = mode.match(/x(\d+)/);
  return match ? parseInt(match[1]) : 0;
};
