interface PublicData {
  promotion: {
    enabled: boolean;
    title: string;
    subtitle: string;
    startDate: string;
    endDate: string;
    button: {
      text: string;
      url: string;
    };
    styling: {
      showGifts: boolean;
      accentColor: string;
      animation: string;
    };
    behavior: {
      showOnce: boolean;
      cookieName: string;
    };
  } | null;
  maintenance: {
    enabled: boolean;
    title: string;
    subtitle: string;
  };
  online_players: number;
  unread_tickets: number;
}

type Listener = (data: PublicData) => void;

class PublicDataService {
  private static instance: PublicDataService;
  private listeners: Set<Listener> = new Set();
  private data: PublicData | null = null;
  private intervalId: number | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_TIME = 300000; // 5 минут
  private readonly FETCH_INTERVAL = 600000; // 10 минут
  private readonly API_URL = 'https://functions.poehali.dev/89653c3a-fd42-474b-b49e-2c8be04ed475/';

  private constructor() {
    this.init();
  }

  static getInstance(): PublicDataService {
    if (!PublicDataService.instance) {
      PublicDataService.instance = new PublicDataService();
    }
    return PublicDataService.instance;
  }

  private init() {
    this.fetchData();
    
    this.intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchData();
      }
    }, this.FETCH_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - this.lastFetch;
        if (timeSinceLastFetch > this.CACHE_TIME) {
          this.fetchData();
        }
      }
    });
  }

  private async fetchData() {
    try {
      const userId = localStorage.getItem('user_id');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (userId) {
        headers['X-User-Id'] = userId;
      }

      const response = await fetch(this.API_URL, { headers });
      
      if (response.ok) {
        const data: PublicData = await response.json();
        this.data = data;
        this.lastFetch = Date.now();
        this.notifyListeners(data);
      }
    } catch (error) {
      console.error('Failed to fetch public data:', error);
    }
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

  private notifyListeners(data: PublicData) {
    this.listeners.forEach(listener => listener(data));
  }

  getData(): PublicData | null {
    return this.data;
  }

  async refresh() {
    await this.fetchData();
  }

  destroy() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.listeners.clear();
  }
}

export const publicDataService = PublicDataService.getInstance();
export type { PublicData };