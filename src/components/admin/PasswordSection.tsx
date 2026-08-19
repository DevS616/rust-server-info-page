import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const ADMIN_API = 'https://functions.poehali.dev/bf06608b-5623-4eae-8f89-c08bea6a0073';

interface PasswordSectionProps {
  token: string;
}

const PasswordSection = ({ token }: PasswordSectionProps) => {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (next.length < 8) {
      toast({ title: 'Слишком короткий пароль', description: 'Минимум 8 символов', variant: 'destructive' });
      return;
    }
    if (next !== repeat) {
      toast({ title: 'Пароли не совпадают', description: 'Проверьте повтор пароля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/?action=change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Пароль изменён', description: 'Используйте новый пароль при следующем входе' });
        setCurrent('');
        setNext('');
        setRepeat('');
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Не удалось сменить пароль', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сменить пароль', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="KeyRound" className="text-primary" size={22} />
        <h3 className="text-lg font-bold">Смена пароля</h3>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="cur-pass">Текущий пароль</Label>
          <Input
            id="cur-pass"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <div>
          <Label htmlFor="new-pass">Новый пароль</Label>
          <Input
            id="new-pass"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
          />
        </div>

        <div>
          <Label htmlFor="rep-pass">Повторите новый пароль</Label>
          <Input
            id="rep-pass"
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сменить пароль'}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-4">
        После 5 неверных попыток входа доступ блокируется на 15 минут.
      </p>
    </Card>
  );
};

export default PasswordSection;
