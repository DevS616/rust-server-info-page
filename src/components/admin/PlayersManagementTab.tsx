import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';
const RCON_API = 'https://functions.poehali.dev/97a24c9d-b176-42d4-818e-b7b0d1603f44';

interface Player {
  server: string;
  player_id: string;
  name: string;
  ping: string;
  connected_time: string;
}

interface PunishmentDialogData {
  type: 'kick' | 'ban' | 'mute';
  player: Player;
}

interface PlayersManagementTabProps {
  token: string;
}

const PlayersManagementTab = ({ token }: PlayersManagementTabProps) => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState<string>('all');
  
  const [punishmentDialog, setPunishmentDialog] = useState<PunishmentDialogData | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 30000); // Обновляем каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${RCON_API}/?action=list_players`, {
        headers: { 'X-Auth-Token': token }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить список игроков',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to load players:', error);
      toast({
        title: 'Ошибка',
        description: 'Ошибка подключения к серверу',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openPunishmentDialog = (type: 'kick' | 'ban' | 'mute', player: Player) => {
    setPunishmentDialog({ type, player });
    setReason('');
    setDuration(type === 'ban' ? 0 : type === 'mute' ? 60 : 0);
  };

  const closePunishmentDialog = () => {
    setPunishmentDialog(null);
    setReason('');
    setDuration(0);
  };

  const executePunishment = async () => {
    if (!punishmentDialog) return;
    
    if (!reason.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите причину',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    
    try {
      const payload = {
        action: punishmentDialog.type,
        player_id: punishmentDialog.player.player_id,
        server: punishmentDialog.player.server,
        reason: reason.trim(),
        ...(punishmentDialog.type !== 'kick' && { duration })
      };

      const res = await fetch(RCON_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        
        let actionText = '';
        switch (punishmentDialog.type) {
          case 'kick':
            actionText = 'кикнут';
            break;
          case 'ban':
            actionText = duration === 0 ? 'забанен навсегда' : `забанен на ${duration} мин`;
            break;
          case 'mute':
            actionText = `заглушен на ${duration} мин`;
            break;
        }
        
        toast({
          title: 'Успешно',
          description: `Игрок ${punishmentDialog.player.name} ${actionText}`
        });
        
        closePunishmentDialog();
        loadPlayers();
      } else {
        const error = await res.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось выполнить действие',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to execute punishment:', error);
      toast({
        title: 'Ошибка',
        description: 'Ошибка выполнения команды',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.player_id.includes(searchQuery);
    
    const matchesServer = serverFilter === 'all' || player.server === serverFilter;
    
    return matchesSearch && matchesServer;
  });

  const uniqueServers = Array.from(new Set(players.map(p => p.server)));

  const getPunishmentDialogTitle = () => {
    if (!punishmentDialog) return '';
    
    switch (punishmentDialog.type) {
      case 'kick':
        return 'Кикнуть игрока';
      case 'ban':
        return 'Забанить игрока';
      case 'mute':
        return 'Заблокировать чат';
      default:
        return '';
    }
  };

  const getPunishmentDialogDescription = () => {
    if (!punishmentDialog) return '';
    return `Игрок: ${punishmentDialog.player.name} (${punishmentDialog.player.server})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление игроками</h2>
          <p className="text-muted-foreground">
            Онлайн: {filteredPlayers.length} {filteredPlayers.length !== players.length && `из ${players.length}`}
          </p>
        </div>
        <Button onClick={loadPlayers} disabled={loading} variant="outline">
          <Icon name="RefreshCw" className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Поиск</Label>
            <div className="relative">
              <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Имя игрока или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label>Сервер</Label>
            <Select value={serverFilter} onValueChange={setServerFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все серверы</SelectItem>
                {uniqueServers.map(server => (
                  <SelectItem key={server} value={server}>
                    {server}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {loading && players.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Загрузка списка игроков...</p>
          </div>
        </Card>
      ) : filteredPlayers.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Icon name="Users" className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {players.length === 0 ? 'Нет игроков онлайн' : 'Игроки не найдены'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPlayers.map((player, idx) => (
            <Card key={`${player.server}-${player.player_id}-${idx}`} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Игрок</p>
                    <p className="font-semibold">{player.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Сервер</p>
                    <p className="text-sm">{player.server}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Пинг</p>
                    <p className="text-sm">{player.ping} ms</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">В игре</p>
                    <p className="text-sm">{player.connected_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPunishmentDialog('kick', player)}
                  >
                    <Icon name="LogOut" className="mr-2 h-4 w-4" />
                    Кикнуть
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPunishmentDialog('mute', player)}
                  >
                    <Icon name="MessageSquareOff" className="mr-2 h-4 w-4" />
                    Мут
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openPunishmentDialog('ban', player)}
                  >
                    <Icon name="Ban" className="mr-2 h-4 w-4" />
                    Бан
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!punishmentDialog} onOpenChange={(open) => !open && closePunishmentDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getPunishmentDialogTitle()}</DialogTitle>
            <DialogDescription>{getPunishmentDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {punishmentDialog?.type !== 'kick' && (
              <div>
                <Label>Длительность</Label>
                {punishmentDialog?.type === 'ban' ? (
                  <Select 
                    value={duration.toString()} 
                    onValueChange={(val) => setDuration(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Навсегда</SelectItem>
                      <SelectItem value="60">1 час</SelectItem>
                      <SelectItem value="180">3 часа</SelectItem>
                      <SelectItem value="360">6 часов</SelectItem>
                      <SelectItem value="720">12 часов</SelectItem>
                      <SelectItem value="1440">1 день</SelectItem>
                      <SelectItem value="4320">3 дня</SelectItem>
                      <SelectItem value="10080">7 дней</SelectItem>
                      <SelectItem value="43200">30 дней</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select 
                    value={duration.toString()} 
                    onValueChange={(val) => setDuration(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 минут</SelectItem>
                      <SelectItem value="15">15 минут</SelectItem>
                      <SelectItem value="30">30 минут</SelectItem>
                      <SelectItem value="60">1 час</SelectItem>
                      <SelectItem value="180">3 часа</SelectItem>
                      <SelectItem value="360">6 часов</SelectItem>
                      <SelectItem value="1440">1 день</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label>Причина *</Label>
              <Textarea
                placeholder="Укажите причину наказания..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closePunishmentDialog}
                disabled={processing}
              >
                Отмена
              </Button>
              <Button
                variant={punishmentDialog?.type === 'ban' ? 'destructive' : 'default'}
                className="flex-1"
                onClick={executePunishment}
                disabled={processing || !reason.trim()}
              >
                {processing ? (
                  <>
                    <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                    Выполняется...
                  </>
                ) : (
                  <>Подтвердить</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayersManagementTab;
