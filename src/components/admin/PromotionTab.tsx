import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import promotionData from '@/data/promotion.json';

interface PromotionData {
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
}

interface PromotionTabProps {
  token: string;
}

const PromotionTab = ({ token }: PromotionTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PromotionData>(promotionData);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('https://functions.poehali.dev/6bf5dace-312e-443f-8666-9af4a8112d1c/');
        if (response.ok) {
          const data = await response.json();
          setForm(data);
        }
      } catch (error) {
        console.error('Failed to load promotion settings:', error);
      } finally {
        setInitialLoad(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/6bf5dace-312e-443f-8666-9af4a8112d1c/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        toast({ 
          title: 'Сохранено', 
          description: 'Настройки акции обновлены. Обновите страницу, чтобы увидеть изменения.' 
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }
    } catch (error) {
      toast({ 
        title: 'Ошибка', 
        description: error instanceof Error ? error.message : 'Не удалось сохранить изменения', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Сбросить все изменения?')) {
      setLoading(true);
      try {
        const response = await fetch('https://functions.poehali.dev/6bf5dace-312e-443f-8666-9af4a8112d1c/');
        if (response.ok) {
          const data = await response.json();
          setForm(data);
          toast({ title: 'Сброшено', description: 'Настройки восстановлены из базы данных' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось загрузить настройки', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDateForInput = (dateStr: string) => {
    return dateStr.slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Управление акциями</h2>
          <p className="text-muted-foreground">Настройка всплывающего окна с активной акцией</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPreviewOpen(!previewOpen)}
          >
            <Icon name="Eye" className="mr-2 h-4 w-4" />
            {previewOpen ? 'Скрыть превью' : 'Показать превью'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
          >
            <Icon name="RotateCcw" className="mr-2 h-4 w-4" />
            Сбросить
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading}
          >
            <Icon name="Save" className="mr-2 h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>

      {(() => {
        const now = new Date();
        const start = new Date(form.startDate);
        const end = new Date(form.endDate);
        if (!form.enabled) {
          return (
            <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-start gap-3">
              <Icon name="EyeOff" className="text-yellow-500 mt-0.5" size={20} />
              <div className="text-sm">
                <b>Акция выключена.</b> Посетители её не видят. Включите переключатель ниже.
              </div>
            </div>
          );
        }
        if (now > end) {
          return (
            <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
              <Icon name="CalendarX" className="text-destructive mt-0.5" size={20} />
              <div className="text-sm">
                <b>Срок акции истёк {end.toLocaleDateString('ru-RU')}.</b> Поэтому она не показывается
                на сайте. Укажите дату окончания в будущем и сохраните.
              </div>
            </div>
          );
        }
        if (now < start) {
          return (
            <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 flex items-start gap-3">
              <Icon name="Clock" className="text-blue-500 mt-0.5" size={20} />
              <div className="text-sm">
                <b>Акция ещё не началась.</b> Показ стартует {start.toLocaleDateString('ru-RU')}.
              </div>
            </div>
          );
        }
        return (
          <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 p-4 flex items-start gap-3">
            <Icon name="CheckCircle2" className="text-green-500 mt-0.5" size={20} />
            <div className="text-sm">
              <b>Акция активна</b> и показывается на сайте до {end.toLocaleDateString('ru-RU')}.
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Icon name="Settings" className="mr-2 h-5 w-5" />
              Основные настройки
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Включить акцию</Label>
                <Switch
                  id="enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Временная x2 АКЦИЯ!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Описание</Label>
                <Textarea
                  id="subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="При пополнении баланса..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Дата начала</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formatDateForInput(form.startDate)}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value + ':00' })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Дата окончания</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formatDateForInput(form.endDate)}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value + ':59' })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Icon name="MousePointerClick" className="mr-2 h-5 w-5" />
              Кнопка действия
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buttonText">Текст кнопки</Label>
                <Input
                  id="buttonText"
                  value={form.button.text}
                  onChange={(e) => setForm({ 
                    ...form, 
                    button: { ...form.button, text: e.target.value }
                  })}
                  placeholder="Перейти в магазин"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonUrl">Ссылка</Label>
                <Input
                  id="buttonUrl"
                  type="url"
                  value={form.button.url}
                  onChange={(e) => setForm({ 
                    ...form, 
                    button: { ...form.button, url: e.target.value }
                  })}
                  placeholder="https://devilrust.ru/"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Icon name="Palette" className="mr-2 h-5 w-5" />
              Оформление
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showGifts">Показывать эмодзи подарков 🎁</Label>
                <Switch
                  id="showGifts"
                  checked={form.styling.showGifts}
                  onCheckedChange={(checked) => setForm({ 
                    ...form, 
                    styling: { ...form.styling, showGifts: checked }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Акцентный цвет</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={form.styling.accentColor}
                    onChange={(e) => setForm({ 
                      ...form, 
                      styling: { ...form.styling, accentColor: e.target.value }
                    })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={form.styling.accentColor}
                    onChange={(e) => setForm({ 
                      ...form, 
                      styling: { ...form.styling, accentColor: e.target.value }
                    })}
                    placeholder="#FF4400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="animation">Анимация</Label>
                <select
                  id="animation"
                  value={form.styling.animation}
                  onChange={(e) => setForm({ 
                    ...form, 
                    styling: { ...form.styling, animation: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="pulse">Пульсация</option>
                  <option value="bounce">Подпрыгивание</option>
                  <option value="none">Без анимации</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Icon name="Settings2" className="mr-2 h-5 w-5" />
              Поведение
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showOnce">Показывать один раз</Label>
                  <p className="text-sm text-muted-foreground">
                    Окно появится только при первом визите
                  </p>
                </div>
                <Switch
                  id="showOnce"
                  checked={form.behavior.showOnce}
                  onCheckedChange={(checked) => setForm({ 
                    ...form, 
                    behavior: { ...form.behavior, showOnce: checked }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookieName">Имя cookie</Label>
                <Input
                  id="cookieName"
                  value={form.behavior.cookieName}
                  onChange={(e) => setForm({ 
                    ...form, 
                    behavior: { ...form.behavior, cookieName: e.target.value }
                  })}
                  placeholder="devilrust_promotion_seen"
                />
                <p className="text-xs text-muted-foreground">
                  Используется для отслеживания показов
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted/50">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Icon name="Info" className="mr-2 h-5 w-5" />
              Информация
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Окно появляется через 1 секунду после загрузки страницы</p>
              <p>• Таймер обновляется каждые 5 секунд</p>
              <p>• Кнопка "Напомнить позже" скрывает окно на 1 час</p>
              <p>• После сохранения требуется перезагрузка страницы</p>
            </div>
          </Card>
        </div>
      </div>

      {previewOpen && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icon name="Eye" className="mr-2 h-5 w-5" />
            Предварительный просмотр
          </h3>
          
          <div className="relative bg-gradient-to-br from-card via-card to-primary/5 border-2 rounded-2xl p-8 overflow-hidden max-w-lg mx-auto" style={{ borderColor: form.styling.accentColor }}>
            {form.styling.showGifts && (
              <>
                <div className="absolute -top-4 -left-4 text-4xl">🎁</div>
                <div className="absolute -top-3 -right-3 text-3xl">🎉</div>
                <div className="absolute -bottom-3 -left-3 text-3xl">✨</div>
                <div className="absolute -bottom-4 -right-4 text-4xl">🎊</div>
              </>
            )}

            <div className="relative text-center space-y-4">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ 
                backgroundColor: `${form.styling.accentColor}20`,
                borderColor: `${form.styling.accentColor}40`,
                color: form.styling.accentColor,
                border: '1px solid'
              }}>
                🔥 Горячее предложение
              </div>
              
              <h2 className="text-2xl font-bold" style={{ color: form.styling.accentColor }}>
                {form.title}
              </h2>
              
              <p className="text-sm text-muted-foreground">
                {form.subtitle}
              </p>

              <div className="bg-background/80 border rounded-lg p-4 space-y-2" style={{ borderColor: `${form.styling.accentColor}20` }}>
                <div className="text-xs text-muted-foreground font-semibold uppercase">
                  ⏰ Акция заканчивается через:
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {['5', '12', '34', '56'].map((num, i) => (
                    <div key={i} className="rounded-lg p-2" style={{ 
                      background: `linear-gradient(to bottom, ${form.styling.accentColor}20, ${form.styling.accentColor}05)`,
                      borderColor: `${form.styling.accentColor}30`,
                      border: '1px solid'
                    }}>
                      <div className="text-xl font-bold" style={{ color: form.styling.accentColor }}>
                        {num}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {['дней', 'часов', 'минут', 'секунд'][i]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold shadow-lg"
                style={{ 
                  backgroundColor: form.styling.accentColor,
                  color: 'white'
                }}
              >
                <Icon name="ShoppingBag" className="mr-2 h-4 w-4" />
                {form.button.text}
                <Icon name="ArrowRight" className="ml-2 h-4 w-4" />
              </Button>

              <button className="text-xs text-muted-foreground hover:text-foreground underline">
                Напомнить позже
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PromotionTab;