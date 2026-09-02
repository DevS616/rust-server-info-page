import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { type CalendarEvent, mergeEvents } from '@/utils/autoEvents';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const API = 'https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1';

const PRESET_COLORS = [
  { name: 'Красный', value: '#DC2626' },
  { name: 'Оранжевый', value: '#EA580C' },
  { name: 'Зелёный', value: '#16A34A' },
  { name: 'Синий', value: '#2563EB' },
  { name: 'Фиолетовый', value: '#9333EA' },
  { name: 'Розовый', value: '#DB2777' },
];

const emptyForm = () => ({
  date: '',
  event_time: '12:00',
  title: '',
  description: '',
  color: '#DC2626',
  servers: 'Все сервера',
});

interface EventsTabProps {
  token: string | null;
}

const EventsTab = ({ token }: EventsTabProps) => {
  const { toast } = useToast();
  const now = new Date();
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth());

  useEffect(() => {
    if (token) loadEvents();
  }, [token]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/`, { headers: { 'X-Auth-Token': token! } });
      if (res.ok) {
        const data = await res.json();
        const db: CalendarEvent[] = data.events || [];
        setDbEvents(db);
        setAllEvents(mergeEvents(db));
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить события', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = (prefill?: Partial<typeof formData>) => {
    setEditingEvent(null);
    setFormData({ ...emptyForm(), ...prefill });
    setShowForm(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      event_time: event.event_time || '12:00',
      title: event.title,
      description: event.description,
      color: event.color,
      servers: event.servers || 'Все сервера',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingEvent
        ? `${API}/?action=update&id=${editingEvent.id}`
        : `${API}/?action=create`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast({ title: editingEvent ? 'Событие обновлено' : 'Событие создано' });
        closeForm();
        await loadEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Ошибка', description: err.error || 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Удалить событие "${event.title}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/?action=delete&id=${event.id}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token! },
      });
      if (res.ok) {
        toast({ title: 'Событие удалено' });
        await loadEvents();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAuto = async (event: CalendarEvent) => {
    if (!confirm(`Удалить событие "${event.title}" за эту дату из календаря?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/?action=hide_auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
        body: JSON.stringify({ date: event.date, title: event.title }),
      });
      if (res.ok) {
        toast({ title: 'Событие удалено' });
        await loadEvents();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  };

  const sorted = [...allEvents]
    .filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Календарь событий</h2>
        {!showForm && (
          <Button onClick={() => openCreate()}>
            <Icon name="Plus" size={16} className="mr-2" />
            Добавить событие
          </Button>
        )}
      </div>

      {/* Навигация по месяцам */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <Icon name="ChevronLeft" size={16} />
        </Button>
        <span className="font-semibold min-w-[160px] text-center">
          {MONTHS[filterMonth]} {filterYear}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <Icon name="ChevronRight" size={16} />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {sorted.length} событий
        </span>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingEvent ? 'Редактировать событие' : 'Новое событие'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Время (МСК)</Label>
                <Input
                  type="time"
                  value={formData.event_time}
                  onChange={e => setFormData({ ...formData, event_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Глобальный вайп"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Серверы</Label>
              <Input
                value={formData.servers}
                onChange={e => setFormData({ ...formData, servers: e.target.value })}
                placeholder="Все сервера"
              />
            </div>

            <div>
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: p.value })}
                    className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all ${formData.color === p.value ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: p.value }}
                  >
                    {p.name}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-9 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : editingEvent ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="Calendar" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Нет событий</p>
          </Card>
        ) : (
          sorted.map(event => {
            const isAuto = event.isAuto;
            const isOverridden = !isAuto && dbEvents.some(
              d => d.id === event.id
            );
            return (
              <Card key={event.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: event.color }}
                  >
                    {new Date(event.date + 'T12:00:00').getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{event.title}</span>
                      {isAuto && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          авто
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {event.event_time && ` в ${event.event_time} МСК`}
                      {event.servers && ` · ${event.servers}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isAuto ? (
                      // Авто-событие: только кнопка "переопределить"
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreate({
                          date: event.date,
                          event_time: event.event_time,
                          title: event.title,
                          description: event.description,
                          color: event.color,
                          servers: event.servers,
                        })}
                        title="Изменить дату/время для этого месяца"
                      >
                        <Icon name="Edit" size={16} className="mr-1" />
                        Изменить
                      </Button>
                    ) : null}
                    {isAuto ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDeleteAuto(event)}
                        disabled={loading}
                        title="Удалить это событие из календаря"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    ) : (
                      <>
                        <Button size="icon" variant="outline" onClick={() => openEdit(event)}>
                          <Icon name="Edit" size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(event)}
                          disabled={loading}
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventsTab;