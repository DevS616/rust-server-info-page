import fallbackStats from '@/data/fallbackStats.json';
import serversData from '@/data/servers.json';

type MonitoringData = {
  result: string;
  data: {
    total: { players: number };
    servers: Array<{
      ip: string;
      port: number;
      players: number;
      playersMax: number;
    }>;
  };
};

type Listener = (data: MonitoringData | null) => void;

class MonitoringService {
  private data: MonitoringData | null = null;
  private listeners: Set<Listener> = new Set();
  private fetchInterval: number | null = null;
  private isFetching = false;
  private useFallback = false;

  constructor() {
    this.loadFallbackData();
    this.startAutoFetch();
  }

  private loadFallbackData(): void {
    const allServers = [...serversData.pveServers, ...serversData.pvpServers];
    const servers = allServers.map(server => {
      const stats = fallbackStats.servers[server.battlemetricsId] || { players: 0, maxPlayers: 150 };
      const [ip, port] = server.serverIp.split(':');
      return {
        ip,
        port: parseInt(port),
        players: stats.players,
        playersMax: stats.maxPlayers
      };
    });

    this.data = {
      result: 'success',
      data: {
        total: { players: fallbackStats.totalPlayers },
        servers
      }
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    
    if (this.data) {
      listener(this.data);
    }
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.data));
  }

  private async fetchData(): Promise<void> {
    if (this.isFetching) return;

    this.isFetching = true;
    try {
      const response = await fetch(
        'https://functions.poehali.dev/00e6cb95-28f5-49b7-b342-db4f9ae8ffd1?type=monitoring'
      );

      if (!response.ok) {
        throw new Error('API недоступен');
      }

      const data = await response.json();

      if (data.result === 'success' && data.data) {
        this.data = data;
        this.useFallback = false;
        this.notify();
      }
    } catch (error) {
      if (!this.useFallback) {
        console.warn('Используются резервные данные');
        this.useFallback = true;
      }
    } finally {
      this.isFetching = false;
    }
  }

  private startAutoFetch(): void {
    this.fetchData();
    this.fetchInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchData();
      }
    }, 300000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isFetching) {
        this.fetchData();
      }
    });
  }

  destroy(): void {
    if (this.fetchInterval !== null) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    this.listeners.clear();
  }
}

export const monitoringService = new MonitoringService();