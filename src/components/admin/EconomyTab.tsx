import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const ECONOMY_API = 'https://functions.poehali.dev/520c0947-b56d-41e1-a8bd-1de788b6f722';

interface EconomyTabProps {
  token: string;
}

interface PlayerData {
  found: boolean;
  steamid?: string;
  balance?: number;
}

const EconomyTab = ({ token }: EconomyTabProps) => {
  const { toast } = useToast();
  const [steamid, setSteamid] = useState('');
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchPlayer = async () => {
    const id = steamid.trim();
    if (!id) return;
    setLoading(true);
    setPlayer(null);
    try {
      const res = await fetch(`${ECONOMY_API}?action=get&steamid=${encodeURIComponent(id)}`, {
        headers: { 'X-Auth-Token': token },
      });
      const data: PlayerData = await res.json();
      setPlayer(data);
      if (data.found) {
        setNewBalance(String(data.balance ?? 0));
      } else {
        toast({ title: 'Игрок не найден', description: 'Проверьте SteamID', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось получить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveBalance = async () => {
    if (!player?.steamid) return;
    const value = parseInt(newBalance, 10);
    if (isNaN(value)) {
      toast({ title: 'Некорректная сумма', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(ECONOMY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ steamid: player.steamid, balance: value }),
      });
      const data = await res.json();
      if (data.ok) {
        setPlayer({ ...player, balance: value });
        toast({ title: 'Баланс обновлён', description: `Новый баланс: ${value.toLocaleString('ru-RU')} ₽` });
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="Coins" className="h-5 w-5 text-primary" />
          Управление балансом игрока
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-sm text-muted-foreground mb-1 block">SteamID игрока</Label>
            <Input
              value={steamid}
              onChange={(e) => setSteamid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
              placeholder="Например: 76561198995407853"
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={searchPlayer} disabled={loading} className="w-full sm:w-auto">
              <Icon name={loading ? 'Loader2' : 'Search'} className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Найти
            </Button>
          </div>
        </div>
      </Card>

      {player?.found && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="User" className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm text-muted-foreground">{player.steamid}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Label className="text-sm text-muted-foreground mb-1 block">Баланс (₽)</Label>
              <Input
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>
            <Button onClick={saveBalance} disabled={saving} className="w-full sm:w-auto">
              <Icon name={saving ? 'Loader2' : 'Save'} className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              Сохранить
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Текущий баланс в игре: <span className="font-semibold text-foreground">{(player.balance ?? 0).toLocaleString('ru-RU')} ₽</span>. Изменение применится и в игре.
          </p>
        </Card>
      )}
    </div>
  );
};

export default EconomyTab;
