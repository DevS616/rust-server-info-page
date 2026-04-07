import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'https://functions.poehali.dev/173145fd-cc6a-4e5a-baee-7e1194624730';

interface ServerFeature {
  icon: string;
  text: string;
}

interface ServerDetailedDescription {
  title: string;
  highlights: ServerFeature[];
  description: string;
}

interface Server {
  id: number;
  name: string;
  mode: string;
  ip: string;
  server_ip: string;
  battlemetrics_id: string;
  description: string;
  features: string[];
  detailed_description: ServerDetailedDescription | null;
  display_order: number;
  is_active: boolean;
}

const emptyForm = (): Omit<Server, 'id'> => ({
  name: '',
  mode: '',
  ip: '',
  server_ip: '',
  battlemetrics_id: '',
  description: '',
  features: [],
  detailed_description: null,
  display_order: 0,
  is_active: true,
});

interface ServersTabProps {
  token: string;
}

const ServersTab = ({ token }: ServersTabProps) => {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [featuresText, setFeaturesText] = useState('');

  const loadServers = async () => {
    try {
      const res = await fetch(`${API_URL}/?all=true`, {
        headers: { 'X-Auth-Token': token },
      });
      if (!res.ok) return;
      const data = await res.json();
      const all: Server[] = data.servers || [];
      setServers(all.sort((a, b) => a.display_order - b.display_order || a.id - b.id));
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить серверы', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFeaturesText('');
    setShowForm(true);
  };

  const openEdit = (server: Server) => {
    setEditingId(server.id);
    setForm({
      name: server.name,
      mode: server.mode,
      ip: server.ip,
      server_ip: server.server_ip,
      battlemetrics_id: server.battlemetrics_id,
      description: server.description,
      features: server.features || [],
      detailed_description: server.detailed_description,
      display_order: server.display_order,
      is_active: server.is_active,
    });
    setFeaturesText((server.features || []).join('\n'));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFeaturesText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажи название сервера', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const body = {
      ...form,
      features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
    };

    try {
      const url = editingId ? `${API_URL}/?server_id=${editingId}` : `${API_URL}/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: editingId ? 'Сервер обновлён' : 'Сервер создан' });
        closeForm();
        await loadServers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Ошибка', description: err.error || 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleDelete = async (server: Server) => {
    if (!confirm(`Удалить сервер "${server.name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/?server_id=${server.id}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token },
      });
      if (res.ok) {
        toast({ title: 'Сервер удалён' });
        await loadServers();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleToggleActive = async (server: Server) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/?server_id=${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ ...server, is_active: !server.is_active }),
      });
      if (res.ok) {
        await loadServers();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сетевая ошибка', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Управление серверами</h2>
        {!showForm && (
          <Button onClick={openCreate}>
            <Icon name="Plus" className="mr-2" size={16} />
            Добавить сервер
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Редактировать сервер' : 'Новый сервер'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="#1 [PVE] DevilRust X3"
                  required
                />
              </div>
              <div>
                <Label>Режим</Label>
                <Input
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                  placeholder="PVE x3"
                />
              </div>
              <div>
                <Label>IP для подключения</Label>
                <Input
                  value={form.ip}
                  onChange={e => setForm({ ...form, ip: e.target.value })}
                  placeholder="1.devilrust.ru"
                />
              </div>
              <div>
                <Label>IP:порт (мониторинг)</Label>
                <Input
                  value={form.server_ip}
                  onChange={e => setForm({ ...form, server_ip: e.target.value })}
                  placeholder="62.122.214.220:10000"
                />
              </div>
              <div>
                <Label>BattleMetrics ID</Label>
                <Input
                  value={form.battlemetrics_id}
                  onChange={e => setForm({ ...form, battlemetrics_id: e.target.value })}
                  placeholder="30367639"
                />
              </div>
              <div>
                <Label>Порядок отображения</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Описание</Label>
              <Input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Краткое описание сервера"
              />
            </div>

            <div>
              <Label>Особенности (каждая с новой строки)</Label>
              <Textarea
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder={'Рейты x3\nВайп 1 раз в месяц\nКастомные NPC'}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Активен (показывать на сайте)</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {servers.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="Server" className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">Нет серверов. Добавьте первый!</p>
          </Card>
        ) : (
          servers.map(server => (
            <Card key={server.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    name="Server"
                    size={20}
                    className={server.is_active ? 'text-green-500 flex-shrink-0' : 'text-muted-foreground flex-shrink-0'}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{server.name}</h3>
                      {server.mode && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{server.mode}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${server.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {server.is_active ? 'Активен' : 'Скрыт'}
                      </span>
                    </div>
                    {server.ip && (
                      <p className="text-sm text-muted-foreground truncate">{server.ip}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(server)}
                    disabled={loading}
                    title={server.is_active ? 'Скрыть с сайта' : 'Показать на сайте'}
                  >
                    <Icon name={server.is_active ? 'EyeOff' : 'Eye'} size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(server)}
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(server)}
                    disabled={loading}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServersTab;
