import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: number;
  date: string;
  event_time?: string;
  title: string;
  description: string;
  color: string;
  servers?: string;
}

interface EventsTabProps {
  token: string | null;
}

const PRESET_COLORS = [
  { name: 'Красный', value: '#DC2626' },
  { name: 'Оранжевый', value: '#EA580C' },
  { name: 'Зеленый', value: '#16A34A' },
  { name: 'Синий', value: '#2563EB' },
  { name: 'Фиолетовый', value: '#9333EA' },
  { name: 'Розовый', value: '#DB2777' },
];

interface Server {
  id: number;
  name: string;
  rate: string;
}

const EventsTab = ({ token }: EventsTabProps) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: '',
    event_time: '12:00',
    title: '',
    description: '',
    color: '#DC2626',
    servers: 'Все сервера'
  });

  useEffect(() => {
    if (token) {
      loadEvents();
      loadServers();
    }
  }, [token]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/', {
        headers: { 'X-Auth-Token': token! }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const serversText = selectedServers.length === 0 || selectedServers.length === servers.length
        ? 'Все сервера'
        : selectedServers.join(', ');

      const url = editingEvent
        ? `https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/?action=update&id=${editingEvent.id}`
        : 'https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/?action=create';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ ...formData, servers: serversText })
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingEvent ? 'Событие обновлено' : 'Событие создано'
        });
        
        setFormData({ date: '', event_time: '12:00', title: '', description: '', color: '#DC2626', servers: 'Все сервера' });
        setSelectedServers([]);
        setEditingEvent(null);
        setShowForm(false);
        loadEvents();
      } else {
        const error = await response.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось сохранить событие',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить это событие?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/?action=delete&id=${id}`,
        {
          method: 'DELETE',
          headers: { 'X-Auth-Token': token! }
        }
      );

      if (response.ok) {
        toast({ title: 'Успешно', description: 'Событие удалено' });
        loadEvents();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось удалить событие',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при удалении',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      event_time: event.event_time || '12:00',
      title: event.title,
      description: event.description,
      color: event.color,
      servers: event.servers || 'Все сервера'
    });
    
    // Разбираем servers строку в массив
    if (event.servers && event.servers !== 'Все сервера') {
      setSelectedServers(event.servers.split(', ').map(s => s.trim()));
    } else {
      setSelectedServers([]);
    }
    
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingEvent(null);
    setFormData({ date: '', event_time: '12:00', title: '', description: '', color: '#DC2626', servers: 'Все сервера' });
    setSelectedServers([]);
    setShowForm(false);
  };

  const toggleServer = (serverName: string) => {
    setSelectedServers(prev => {
      const currentSelection = prev.length === 0 ? servers.map(s => s.name) : prev;
      
      if (currentSelection.includes(serverName)) {
        const newSelection = currentSelection.filter(s => s !== serverName);
        return newSelection.length === 0 ? servers.map(s => s.name) : newSelection;
      } else {
        const newSelection = [...currentSelection, serverName];
        return newSelection.length === servers.length ? [] : newSelection;
      }
    });
  };

  const toggleAllServers = () => {
    setSelectedServers([]);
  };
  
  const isAllSelected = selectedServers.length === 0;
  const isServerSelected = (serverName: string) => {
    return isAllSelected || selectedServers.includes(serverName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Календарь событий</h2>
        <Button onClick={() => setShowForm(!showForm)} disabled={loading}>
          <Icon name={showForm ? 'X' : 'Plus'} className="mr-2 h-4 w-4" />
          {showForm ? 'Отмена' : 'Добавить событие'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="event_time">Время (МСК)</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="title">Название события</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Глобальный вайп"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание события..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label>Сервера</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="all-servers"
                    checked={isAllSelected}
                    onChange={toggleAllServers}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="all-servers" className="font-semibold cursor-pointer">
                    Все сервера
                  </Label>
                </div>
                
                {servers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {servers.map((server) => (
                      <div key={server.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <input
                          type="checkbox"
                          id={`server-${server.id}`}
                          checked={isServerSelected(server.name)}
                          onChange={() => toggleServer(server.name)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        />
                        <Label htmlFor={`server-${server.id}`} className="cursor-pointer text-sm">
                          {server.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Загрузка серверов...</p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Выбрано: {isAllSelected ? 'Все сервера' : selectedServers.join(', ')}
                </p>
              </div>
            </div>

            <div>
              <Label>Цвет события</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: preset.value })}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                      ${formData.color === preset.value ? 'ring-2 ring-primary' : 'hover:opacity-80'}
                    `}
                    style={{ backgroundColor: preset.value }}
                  >
                    <span className="text-white font-medium">{preset.name}</span>
                    {formData.color === preset.value && (
                      <Icon name="Check" className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Label htmlFor="custom-color" className="text-sm">Свой цвет:</Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                <Icon name="Save" className="mr-2 h-4 w-4" />
                {editingEvent ? 'Обновить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelForm}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="Calendar" className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет событий в календаре</p>
          </Card>
        ) : (
          events
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: event.color }}
                  >
                    {new Date(event.date).getDate()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <h3 className="text-lg font-semibold mt-1">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(event)}
                          disabled={loading}
                        >
                          <Icon name="Pencil" className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(event.id)}
                          disabled={loading}
                        >
                          <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default EventsTab;