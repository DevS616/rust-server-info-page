import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Ban {
  id: number;
  steamid: string;
  ipAdress: string;
  permanent: string;
  timeUnbanned: string;
  reason: string;
  serverName: string;
  serverAdress: string;
  owner: string;
  nameHistory: string;
  ipHistory: string;
  steamIdHistory: string;
}

const BanListSection = () => {
  const [bans, setBans] = useState<Ban[]>([]);
  const [filteredBans, setFilteredBans] = useState<Ban[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBan, setSelectedBan] = useState<Ban | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchBans();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBans(bans);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bans.filter(ban => {
        const nickname = getLatestNickname(ban.nameHistory).toLowerCase();
        const steamid = ban.steamid.toLowerCase();
        return nickname.includes(query) || steamid.includes(query);
      });
      setFilteredBans(filtered);
    }
  }, [searchQuery, bans]);

  const fetchBans = async (skipCache = false) => {
    const CACHE_KEY = 'banlist_cache';
    const CACHE_DURATION = 12 * 60 * 60 * 1000;
    
    if (!skipCache) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setBans(data.bans || []);
            setFilteredBans(data.bans || []);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse banlist cache:', e);
        }
      }
    }
    
    try {
      setLoading(true);
      const response = await fetch('https://functions.poehali.dev/00e6cb95-28f5-49b7-b342-db4f9ae8ffd1');
      const data = await response.json();
      setBans(data.bans || []);
      setFilteredBans(data.bans || []);
      
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to fetch bans:', error);
      setBans([]);
      setFilteredBans([]);
    } finally {
      setLoading(false);
    }
  };

  const getLatestNickname = (nameHistory: string): string => {
    try {
      const history = JSON.parse(nameHistory);
      if (Array.isArray(history) && history.length > 0) {
        return history[history.length - 1].value || 'Неизвестно';
      }
    } catch {
      return 'Неизвестно';
    }
    return 'Неизвестно';
  };

  const formatDate = (timestamp: string): string => {
    try {
      const date = new Date(parseFloat(timestamp) * 1000);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Навсегда';
    }
  };

  const handleShowDetails = (ban: Ban) => {
    setSelectedBan(ban);
    setIsDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="py-20 min-h-screen bg-background relative">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-[128px]" />
      </div>

      <div className="container relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl mb-4 glow-text">
            <span className="text-primary">Банлист</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-[700px] mx-auto">
            Список заблокированных игроков на серверах DevilRust
          </p>
        </div>

        <div className="mb-8 max-w-2xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Поиск по никнейму или Steam ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm"
              />
            </div>
            <Button
              onClick={() => fetchBans(true)}
              disabled={loading}
              variant="outline"
              className="h-12 px-4"
            >
              <Icon name="RefreshCw" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/10 border-b border-primary/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider">
                      Никнейм
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider">
                      Steam ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider">
                      Срок истечения
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground uppercase tracking-wider">
                      Причина
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filteredBans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        {searchQuery ? 'Ничего не найдено' : 'Список банов пуст'}
                      </td>
                    </tr>
                  ) : (
                    filteredBans.map((ban) => (
                      <tr key={ban.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-foreground font-medium">
                          {getLatestNickname(ban.nameHistory)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                          {ban.steamid}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {ban.permanent === '1' ? (
                            <span className="text-destructive font-semibold">Навсегда</span>
                          ) : (
                            formatDate(ban.timeUnbanned)
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {ban.reason || 'Не указана'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowDetails(ban)}
                            className="border-primary/30 hover:border-primary hover:bg-primary/10"
                          >
                            <Icon name="Info" className="h-4 w-4 mr-1" />
                            Подробнее
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Всего банов: <span className="text-primary font-semibold">{filteredBans.length}</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Детали бана</DialogTitle>
          </DialogHeader>
          {selectedBan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Никнейм</p>
                  <p className="font-semibold">{getLatestNickname(selectedBan.nameHistory)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Steam ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{selectedBan.steamid}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedBan.steamid)}
                    >
                      <Icon name="Copy" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">IP адрес</p>
                  <p className="font-mono text-sm">{selectedBan.ipAdress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Сервер</p>
                  <p className="text-sm">{selectedBan.serverName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Забанил</p>
                  <p className="text-sm">{selectedBan.owner}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Срок истечения</p>
                  <p className="text-sm">
                    {selectedBan.permanent === '1' ? (
                      <span className="text-destructive font-semibold">Навсегда</span>
                    ) : (
                      formatDate(selectedBan.timeUnbanned)
                    )}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Причина</p>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedBan.reason || 'Не указана'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default BanListSection;