import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface MaintenanceSectionProps {
  token: string;
}

const MaintenanceSection = ({ token }: MaintenanceSectionProps) => {
  const { toast } = useToast();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('Сайт временно закрыт на технические работы');
  const [maintenanceSubtitle, setMaintenanceSubtitle] = useState('Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkEnabled, setCheckEnabled] = useState(() => {
    return localStorage.getItem('maintenanceCheckEnabled') !== 'false';
  });

  useEffect(() => {
    loadMaintenanceStatus();
  }, []);

  const loadMaintenanceStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`);
      if (res.ok) {
        const data = await res.json();
        setIsMaintenance(data.is_maintenance);
        setMaintenanceTitle(data.maintenance_title);
        setMaintenanceSubtitle(data.maintenance_subtitle);
      }
    } catch (error) {
      console.error('Failed to load maintenance status:', error);
    }
  };

  const toggleMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ 
          is_maintenance: !isMaintenance,
          maintenance_title: maintenanceTitle,
          maintenance_subtitle: maintenanceSubtitle
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsMaintenance(data.is_maintenance);
        // Очищаем кэш чтобы изменения сразу вступили в силу
        localStorage.removeItem('maintenance_cache');
        toast({
          title: 'Успешно',
          description: data.is_maintenance 
            ? 'Режим технических работ включён' 
            : 'Режим технических работ отключён'
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось изменить статус',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTexts = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ 
          maintenance_title: maintenanceTitle,
          maintenance_subtitle: maintenanceSubtitle
        })
      });

      if (res.ok) {
        // Очищаем кэш чтобы изменения сразу вступили в силу
        localStorage.removeItem('maintenance_cache');
        toast({
          title: 'Успешно',
          description: 'Тексты обновлены'
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось сохранить тексты',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить тексты',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckEnabled = () => {
    const newValue = !checkEnabled;
    setCheckEnabled(newValue);
    localStorage.setItem('maintenanceCheckEnabled', String(newValue));
    toast({
      title: newValue ? 'Мониторинг включен' : 'Мониторинг отключен',
      description: newValue 
        ? 'Сайт будет проверять статус технических работ каждые 10 минут' 
        : 'Проверки технических работ отключены, функция не будет вызываться'
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Режим технических работ</h2>
          <p className="text-muted-foreground">
            При включении все пользователи увидят страницу с информацией о проведении технических работ
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div>
            <Label className="text-base font-medium">Мониторинг технических работ</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {checkEnabled 
                ? 'Сайт проверяет статус каждые 10 минут' 
                : 'Проверки отключены, функция не вызывается'}
            </p>
          </div>
          <Button
            onClick={toggleCheckEnabled}
            variant={checkEnabled ? 'default' : 'outline'}
            size="sm"
          >
            <Icon name={checkEnabled ? 'Eye' : 'EyeOff'} className="mr-2" size={16} />
            {checkEnabled ? 'Включен' : 'Отключен'}
          </Button>
        </div>
        <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${isMaintenance ? 'bg-destructive animate-pulse' : 'bg-green-500'}`}></div>
            <div>
              <Label className="text-lg font-medium">
                {isMaintenance ? 'Режим технических работ АКТИВЕН' : 'Сайт работает в обычном режиме'}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isMaintenance 
                  ? 'Посетители видят страницу технических работ' 
                  : 'Все пользователи имеют полный доступ к сайту'}
              </p>
            </div>
          </div>

          <Button
            onClick={toggleMaintenance}
            disabled={loading}
            variant={isMaintenance ? 'default' : 'destructive'}
            size="lg"
            className="min-w-[200px]"
          >
            <Icon name={isMaintenance ? 'Check' : 'AlertTriangle'} className="mr-2" />
            {loading 
              ? 'Применение...' 
              : isMaintenance 
                ? 'Отключить тех. работы' 
                : 'Включить тех. работы'}
          </Button>
        </div>

        {isMaintenance && (
          <div className="border-l-4 border-destructive bg-destructive/10 p-4 rounded">
            <div className="flex items-start gap-3">
              <Icon name="AlertCircle" className="text-destructive mt-0.5" size={20} />
              <div>
                <p className="font-medium text-destructive">Внимание!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Режим технических работ активен. Обычные пользователи не имеют доступа к сайту.
                  Администраторы могут работать в обычном режиме.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Настройка текстов</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Настройте заголовок и подзаголовок страницы технических работ
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                placeholder="Сайт временно закрыт на технические работы"
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Подзаголовок</Label>
              <Textarea
                id="subtitle"
                value={maintenanceSubtitle}
                onChange={(e) => setMaintenanceSubtitle(e.target.value)}
                placeholder="Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ"
                rows={3}
              />
            </div>

            <Button onClick={saveTexts} disabled={saving}>
              <Icon name="Save" className="mr-2" />
              {saving ? 'Сохранение...' : 'Сохранить тексты'}
            </Button>
          </div>

          <h3 className="text-lg font-semibold mb-3 mt-6">Предпросмотр страницы</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Так будет выглядеть страница для пользователей во время технических работ:
          </p>
          
          <div className="border rounded-lg p-8 bg-gradient-to-b from-background to-muted text-center space-y-4">
            <Icon name="Settings" className="h-16 w-16 text-primary mx-auto" />
            <h4 className="text-2xl font-bold">{maintenanceTitle}</h4>
            <p className="text-muted-foreground">{maintenanceSubtitle}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MaintenanceSection;