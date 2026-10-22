type MonitoringData = {
  result: string;
  data: {
    total: { players: number };
    servers: Array<{
      ip: string;
      port: number | string;
      players: number;
      playersMax: number;
    }>;
  };
};

const REFRESH_MS = 5 * 60 * 1000;

type Listener = (data: MonitoringData | null) => void;

class MonitoringService {
  private data: MonitoringData | null = null;
  private listeners: Set<Listener> = new Set();
  private fetchInterval: number | null = null;
  private isFetching = false;
  private useFallback = false;
  private lastFetch = 0;

  constructor() {
    this.startAutoFetch();
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
    this.lastFetch = Date.now();
    try {
      const response = await fetch(
        'https://functions.poehali.dev/00e6cb95-28f5-49b7-b342-db4f9ae8ffd1?type=monitoring'
      );

      if (!response.ok) throw new Error('API недоступен');

      const data = await response.json();

      if (data.result === 'success' && data.data) {
        this.data = data;
        this.useFallback = false;
        try {
          localStorage.setItem('monitoring_cache', JSON.stringify({ ts: Date.now(), data }));
        } catch {}
        this.notify();
      }
    } catch {
      this.useFallback = true;
    } finally {
      this.isFetching = false;
    }
  }

  private startAutoFetch(): void {
    const CACHE_TTL = REFRESH_MS;
    let fresh = false;
    try {
      const raw = localStorage.getItem('monitoring_cache');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Date.now() - cached.ts < CACHE_TTL && cached.data?.data) {
          this.data = cached.data;
          this.lastFetch = cached.ts;
          this.useFallback = false;
          this.notify();
          fresh = true;
        }
      }
    } catch {}

    if (!fresh) this.fetchData();
    this.fetchInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchData();
      }
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - this.lastFetch > REFRESH_MS) {
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