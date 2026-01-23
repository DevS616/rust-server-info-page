import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface BonusRecord {
  id: number;
  steam_id: string;
  steam_username: string;
  steam_avatar: string;
  last_spin_time: string;
  last_weekly_bonus: string | null;
  total_spins: number;
  total_winnings: number;
}

interface BonusInfoTabProps {
  token: string;
}

const API_BASE = 'https://functions.poehali.dev';

const BonusInfoTab = ({ token }: BonusInfoTabProps) => {
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingDaily, setResettingDaily] = useState<string | null>(null);
  const [resettingWeekly, setResettingWeekly] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBonusRecords();
  }, []);

  const loadBonusRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/f39e2f41-ff45-4800-8907-0ee09e17d8c6/`, {
        headers: { 'X-Auth-Token': token }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      } else {
        toast({ 
          title: 'Ошибка', 
          description: 'Не удалось загрузить данные', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Failed to load bonus records:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось загрузить данные', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetLimit = async (steamId: string, bonusType: 'daily' | 'weekly') => {
    if (bonusType === 'daily') {
      setResettingDaily(steamId);
    } else {
      setResettingWeekly(steamId);
    }

    try {
      const res = await fetch(`${API_BASE}/f39e2f41-ff45-4800-8907-0ee09e17d8c6/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ steam_id: steamId, bonus_type: bonusType })
      });
      
      if (res.ok) {
        toast({ 
          title: 'Успешно', 
          description: `${bonusType === 'daily' ? 'Ежедневный' : 'Еженедельный'} лимит сброшен` 
        });
        loadBonusRecords();
      } else {
        const error = await res.json();
        toast({ 
          title: 'Ошибка', 
          description: error.error || 'Не удалось сбросить лимит', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Failed to reset limit:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось сбросить лимит', 
        variant: 'destructive' 
      });
    } finally {
      if (bonusType === 'daily') {
        setResettingDaily(null);
      } else {
        setResettingWeekly(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilNext = (lastSpinTime: string) => {
    const last = new Date(lastSpinTime);
    const next = new Date(last.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return 'Доступно';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}м`;
  };

  const getTimeUntilWeekly = (lastWeeklyTime: string | null) => {
    if (!lastWeeklyTime) return 'Доступно';
    
    const last = new Date(lastWeeklyTime);
    const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return 'Доступно';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}д ${hours}ч`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Icon name="Users" className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Пока никто не крутил колесо</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Статистика рулетки</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Всего игроков: {records.length}
          </p>
        </div>
        <Button onClick={loadBonusRecords} variant="outline">
          <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </div>

      <div className="grid gap-4">
        {records.map((record) => (
          <Card key={record.id} className="p-4">
            <div className="flex items-start gap-4">
              <img
                src={record.steam_avatar || 'https://via.placeholder.com/64?text=No+Avatar'}
                alt={record.steam_username || 'Unknown'}
                className="w-16 h-16 rounded-full bg-muted"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {record.steam_username || 'Без никнейма'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Steam ID: {record.steam_id}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResetLimit(record.steam_id, 'daily')}
                      disabled={resettingDaily === record.steam_id}
                      size="sm"
                      variant="outline"
                      title="Сбросить ежедневный бонус"
                    >
                      {resettingDaily === record.steam_id ? (
                        <>
                          <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                          Сброс...
                        </>
                      ) : (
                        <>
                          <Icon name="RotateCcw" className="mr-2 h-4 w-4" />
                          Ежедневный
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => handleResetLimit(record.steam_id, 'weekly')}
                      disabled={resettingWeekly === record.steam_id}
                      size="sm"
                      variant="outline"
                      title="Сбросить еженедельный бонус"
                    >
                      {resettingWeekly === record.steam_id ? (
                        <>
                          <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                          Сброс...
                        </>
                      ) : (
                        <>
                          <Icon name="RotateCcw" className="mr-2 h-4 w-4" />
                          Еженедельный
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Всего прокруток</p>
                    <p className="text-lg font-semibold">{record.total_spins}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Всего выиграно</p>
                    <p className="text-lg font-semibold text-green-500">
                      {record.total_winnings}₽
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Последняя прокрутка</p>
                    <p className="text-sm font-medium">
                      {formatDate(record.last_spin_time)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">След. ежедневный</p>
                    <p className="text-sm font-medium">
                      {getTimeUntilNext(record.last_spin_time)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">След. еженедельный</p>
                    <p className="text-sm font-medium">
                      {getTimeUntilWeekly(record.last_weekly_bonus)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BonusInfoTab;