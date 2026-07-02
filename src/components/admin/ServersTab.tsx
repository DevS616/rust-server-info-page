import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import ServerDialog, { Server } from './ServerDialog';

const API_URL = 'https://functions.poehali.dev/cd63f370-b8ea-4adc-ace4-a274aa6f6e34';

interface ServersTabProps {
  token: string;
}

const ServersTab = ({ token }: ServersTabProps) => {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);

  const loadServers = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServers(); }, []);

  const openCreate = () => { setEditingServer(null); setDialogOpen(true); };
  const openEdit = (server: Server) => { setEditingServer(server); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingServer(null); };
  const handleSaved = () => { closeDialog(); loadServers(); };

  const handleToggleActive = async (server: Server) => {
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
  };

  const handleDelete = async (server: Server) => {
    if (!confirm(`Удалить сервер "${server.name}"?`)) return;
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
  };

  const modeColor = (mode: string | null) => {
    const m = (mode || '').toUpperCase();
    if (m.includes('PVE')) return 'bg-green-500/20 text-green-400';
    if (m.includes('PVP')) return 'bg-primary/20 text-primary';
    if (m.includes('CREATIVE')) return 'bg-violet-500/20 text-violet-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Управление серверами</h2>
        <Button onClick={openCreate}>
          <Icon name="Plus" className="mr-2" size={16} />
          Добавить сервер
        </Button>
      </div>

      {loading && servers.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="Loader2" className="mx-auto mb-4 text-muted-foreground animate-spin" size={32} />
          <p className="text-muted-foreground">Загрузка серверов...</p>
        </Card>
      ) : servers.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="Server" className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">Нет серверов. Добавьте первый!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {servers.map(server => (
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
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${modeColor(server.mode)}`}>{server.mode}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${server.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {server.is_active ? 'Активен' : 'Скрыт'}
                      </span>
                      {server.detailed_description && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          <Icon name="FileText" size={10} className="inline mr-1" />инфо
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      {server.ip && <p className="text-xs text-muted-foreground">{server.ip}</p>}
                      {server.features && server.features.length > 0 && (
                        <p className="text-xs text-muted-foreground">{server.features.length} особенностей</p>
                      )}
                      {server.detailed_description?.highlights && (
                        <p className="text-xs text-muted-foreground">{server.detailed_description.highlights.length} хайлайтов</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant={server.is_active ? 'outline' : 'destructive'}
                    size="sm"
                    onClick={() => handleToggleActive(server)}
                    title={server.is_active ? 'Скрыть с главной' : 'Показать на главной'}
                  >
                    <Icon name={server.is_active ? 'Eye' : 'EyeOff'} size={16} />
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
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ServerDialog
        open={dialogOpen}
        server={editingServer}
        serversLength={servers.length}
        token={token}
        onClose={closeDialog}
        onSave={handleSaved}
      />
    </div>
  );
};

export default ServersTab;