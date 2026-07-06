import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Server } from './ServerDialog';

const API_BASE = 'https://functions.poehali.dev';
const SERVERS_URL = 'https://functions.poehali.dev/cd63f370-b8ea-4adc-ace4-a274aa6f6e34';

interface ServersManagementProps {
  token: string;
  onEditServer: (server: Server) => void;
  onAddServer: () => void;
  onServersLoaded?: (count: number) => void;
}

const ServersManagement = ({ token, onEditServer, onAddServer, onServersLoaded }: ServersManagementProps) => {
  const { toast } = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoadingServers(true);
    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/`);
      if (res.ok) {
        const data = await res.json();
        const list = data.servers || [];
        setServers(list);
        onServersLoaded?.(list.length);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoadingServers(false);
    }
  };

  const handleToggleActive = async (server: Server, checked: boolean) => {
    try {
      const res = await fetch(`${SERVERS_URL}/?server_id=${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({
          name: server.name,
          mode: server.mode || '',
          ip: server.ip || '',
          server_ip: server.server_ip || '',
          battlemetrics_id: server.battlemetrics_id || '',
          description: server.description || '',
          features: server.features || [],
          detailed_description: server.detailed_description,
          display_order: server.display_order,
          is_active: checked
        })
      });
      
      if (res.ok) {
        toast({ 
          title: 'Успешно', 
          description: checked ? 'Сервер активирован' : 'Сервер скрыт'
        });
        loadServers();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
    }
  };

  const handleDeleteServer = async (serverId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот сервер?')) return;

    try {
      const res = await fetch(`${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/?server_id=${serverId}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token }
      });

      if (res.ok) {
        toast({ title: 'Успешно', description: 'Сервер удалён' });
        loadServers();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">Управление карточками серверов</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Редактирование информации о серверах на главной странице
          </p>
        </div>
        <Button onClick={onAddServer} className="w-full sm:w-auto flex-shrink-0">
          <Icon name="Plus" className="mr-2" />
          Добавить сервер
        </Button>
      </div>

      {loadingServers ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка серверов...</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Server" className="mx-auto mb-4" size={48} />
          <p>Серверов пока нет</p>
          <p className="text-sm mt-2">Нажмите "Добавить сервер" чтобы создать первый</p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <Card key={server.id} className="p-3 md:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2">
                    <h3 className="text-base md:text-lg font-semibold break-words">{server.name}</h3>
                    {server.mode && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded flex-shrink-0">
                        {server.mode}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={server.is_active}
                        onCheckedChange={(checked) => handleToggleActive(server, checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {server.is_active ? 'Активен' : 'Скрыт'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {server.ip && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="Globe" size={14} className="flex-shrink-0" />
                        <span className="truncate">{server.ip}</span>
                      </div>
                    )}
                    {server.server_ip && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="Network" size={14} className="flex-shrink-0" />
                        <span className="truncate">{server.server_ip}</span>
                      </div>
                    )}
                    {server.battlemetrics_id && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name="BarChart" size={14} className="flex-shrink-0" />
                        <span className="truncate">BM: {server.battlemetrics_id}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon name="Hash" size={14} className="flex-shrink-0" />
                      <span className="truncate">Порядок: {server.display_order}</span>
                    </div>
                  </div>

                  {server.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {server.description}
                    </p>
                  )}

                  {server.features && server.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {server.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {server.features.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{server.features.length - 3} ещё
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-2 md:ml-4 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditServer(server)}
                  >
                    <Icon name="Edit" size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteServer(server.id)}
                  >
                    <Icon name="Trash" size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ServersManagement;