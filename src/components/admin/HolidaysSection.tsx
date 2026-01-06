import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface HolidaysSectionProps {
  token: string;
}

const HolidaysSection = ({ token }: HolidaysSectionProps) => {
  const { toast } = useToast();
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [lightsEnabled, setLightsEnabled] = useState(true);
  const [loading, setLoading] = useState<'snow' | 'lights' | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`);
      if (res.ok) {
        const data = await res.json();
        setSnowEnabled(data.newyear_snow_enabled ?? true);
        setLightsEnabled(data.newyear_lights_enabled ?? true);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const toggleSetting = async (setting: 'snow' | 'lights', currentValue: boolean) => {
    setLoading(setting);
    try {
      const field = setting === 'snow' ? 'newyear_snow_enabled' : 'newyear_lights_enabled';
      const res = await fetch(`${API_BASE}/1ad77753-040f-405c-8e61-7230f64e30e9/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ [field]: !currentValue })
      });

      if (res.ok) {
        const data = await res.json();
        if (setting === 'snow') {
          setSnowEnabled(data.newyear_snow_enabled);
        } else {
          setLightsEnabled(data.newyear_lights_enabled);
        }
        toast({
          title: 'Успешно',
          description: !currentValue 
            ? (setting === 'snow' ? 'Снег включен' : 'Гирлянды включены')
            : (setting === 'snow' ? 'Снег отключен' : 'Гирлянды отключены')
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
      setLoading(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Праздничное оформление</h2>
        <p className="text-muted-foreground">
          Управление новогодними эффектами на сайте
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${snowEnabled ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
              <Icon name="CloudSnow" className={`h-6 w-6 ${snowEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="text-lg font-medium">Снежинки</div>
              <p className="text-sm text-muted-foreground mt-1">
                {snowEnabled ? 'Падающий снег на всех страницах сайта' : 'Снег отключен'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => toggleSetting('snow', snowEnabled)}
            disabled={loading === 'snow'}
            variant={snowEnabled ? 'default' : 'outline'}
            size="lg"
            className="min-w-[160px]"
          >
            <Icon name={snowEnabled ? 'Check' : 'X'} className="mr-2" />
            {loading === 'snow' ? 'Применение...' : snowEnabled ? 'Отключить' : 'Включить'}
          </Button>
        </div>

        <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lightsEnabled ? 'bg-primary/20' : 'bg-muted-foreground/20'}`}>
              <Icon name="Lightbulb" className={`h-6 w-6 ${lightsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="text-lg font-medium">Гирлянды</div>
              <p className="text-sm text-muted-foreground mt-1">
                {lightsEnabled ? 'Анимированные гирлянды в шапке сайта' : 'Гирлянды отключены'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => toggleSetting('lights', lightsEnabled)}
            disabled={loading === 'lights'}
            variant={lightsEnabled ? 'default' : 'outline'}
            size="lg"
            className="min-w-[160px]"
          >
            <Icon name={lightsEnabled ? 'Check' : 'X'} className="mr-2" />
            {loading === 'lights' ? 'Применение...' : lightsEnabled ? 'Отключить' : 'Включить'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default HolidaysSection;
