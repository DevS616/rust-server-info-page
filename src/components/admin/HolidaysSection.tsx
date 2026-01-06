import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface HolidaysSectionProps {
  token: string;
}

type HolidayType = 'newyear' | 'halloween' | 'autumn' | null;

const HolidaysSection = ({ token }: HolidaysSectionProps) => {
  const { toast } = useToast();
  const [activeHoliday, setActiveHoliday] = useState<HolidayType>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`);
      if (res.ok) {
        const data = await res.json();
        setActiveHoliday(data.active_holiday || null);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const toggleHoliday = async (holiday: HolidayType) => {
    setLoading(true);
    try {
      const newValue = activeHoliday === holiday ? null : holiday;
      console.log('Toggling holiday:', { holiday, activeHoliday, newValue, token: token ? 'present' : 'missing' });
      
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ active_holiday: newValue })
      });

      console.log('Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Response data:', data);
        const finalValue = data.active_holiday || null;
        setActiveHoliday(finalValue);
        
        window.dispatchEvent(new CustomEvent('holidayChanged', { detail: finalValue }));
        console.log('Dispatched holidayChanged event with:', finalValue);
        
        const holidayNames: Record<string, string> = {
          newyear: 'Новый год',
          halloween: 'Хэллоуин',
          autumn: 'Осень'
        };
        
        toast({
          title: 'Успешно',
          description: newValue 
            ? `Тема "${holidayNames[newValue]}" активирована` 
            : 'Праздничная тема отключена'
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось изменить настройку',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить настройку',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const holidays = [
    {
      id: 'newyear' as HolidayType,
      name: 'Новый год',
      icon: 'Snowflake',
      description: 'Падающий снег и праздничные гирлянды',
      color: 'text-blue-500'
    },
    {
      id: 'halloween' as HolidayType,
      name: 'Хэллоуин',
      icon: 'Ghost',
      description: 'Летающие привидения и паутина',
      color: 'text-orange-500'
    },
    {
      id: 'autumn' as HolidayType,
      name: 'Осень',
      icon: 'Leaf',
      description: 'Падающие осенние листья',
      color: 'text-amber-600'
    }
  ];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Праздничное оформление</h2>
        <p className="text-muted-foreground">
          Выберите активную праздничную тему для сайта. Может быть активна только одна тема одновременно.
        </p>
      </div>

      <div className="space-y-4">
        {holidays.map((holiday) => {
          const isActive = activeHoliday === holiday.id;
          
          return (
            <div
              key={holiday.id}
              className={`flex items-center justify-between p-6 rounded-lg border-2 transition-all ${
                isActive 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-muted border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-primary/20' : 'bg-muted-foreground/20'
                }`}>
                  <Icon 
                    name={holiday.icon as any} 
                    className={`h-6 w-6 ${isActive ? holiday.color : 'text-muted-foreground'}`} 
                  />
                </div>
                <div>
                  <div className="text-lg font-medium">{holiday.name}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {holiday.description}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => toggleHoliday(holiday.id)}
                disabled={loading}
                variant={isActive ? 'default' : 'outline'}
                size="lg"
                className="min-w-[160px]"
              >
                <Icon name={isActive ? 'Check' : 'Sparkles'} className="mr-2" />
                {loading ? 'Применение...' : isActive ? 'Отключить' : 'Включить'}
              </Button>
            </div>
          );
        })}
      </div>

      {activeHoliday && (
        <div className="mt-6 p-4 bg-primary/10 border border-primary rounded-lg">
          <div className="flex items-start gap-3">
            <Icon name="Info" className="text-primary mt-0.5" size={20} />
            <div>
              <p className="font-medium text-primary">Активная тема</p>
              <p className="text-sm text-muted-foreground mt-1">
                Праздничные эффекты отображаются на всех страницах сайта. 
                Только одна тема может быть активна одновременно.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default HolidaysSection;