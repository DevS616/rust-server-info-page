import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface ManagementTabProps {
  token: string;
}

interface Server {
  id: number;
  name: string;
  mode: string | null;
  ip: string | null;
  server_ip: string | null;
  battlemetrics_id: string | null;
  description: string | null;
  features: string[];
  detailed_description: any;
  display_order: number;
  is_active: boolean;
}

interface ServerFormData {
  name: string;
  mode: string;
  ip: string;
  server_ip: string;
  battlemetrics_id: string;
  description: string;
  features: string;
  display_order: number;
  is_active: boolean;
}

const ManagementTab = ({ token }: ManagementTabProps) => {
  const { toast } = useToast();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('Сайт временно закрыт на технические работы');
  const [maintenanceSubtitle, setMaintenanceSubtitle] = useState('Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'servers'>('maintenance');
  
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [showServerDialog, setShowServerDialog] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormData>({
    name: '',
    mode: '',
    ip: '',
    server_ip: '',
    battlemetrics_id: '',
    description: '',
    features: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadMaintenanceStatus();
    loadServers();
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

  const loadServers = async () => {
    setLoadingServers(true);
    try {
      const res = await fetch(`${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoadingServers(false);
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
          is_maintenance: isMaintenance,
          maintenance_title: maintenanceTitle,
          maintenance_subtitle: maintenanceSubtitle
        })
      });

      if (res.ok) {
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

  const openServerDialog = (server?: Server) => {
    if (server) {
      setEditingServer(server);
      setServerForm({
        name: server.name,
        mode: server.mode || '',
        ip: server.ip || '',
        server_ip: server.server_ip || '',
        battlemetrics_id: server.battlemetrics_id || '',
        description: server.description || '',
        features: server.features?.join('\n') || '',
        display_order: server.display_order,
        is_active: server.is_active
      });
    } else {
      setEditingServer(null);
      setServerForm({
        name: '',
        mode: '',
        ip: '',
        server_ip: '',
        battlemetrics_id: '',
        description: '',
        features: '',
        display_order: servers.length,
        is_active: true
      });
    }
    setShowServerDialog(true);
  };

  const closeServerDialog = () => {
    setShowServerDialog(false);
    setEditingServer(null);
  };

  const handleSaveServer = async () => {
    if (!serverForm.name.trim()) {
      toast({ title: 'Ошибка', description: 'Название сервера обязательно', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const featuresArray = serverForm.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const body = {
        name: serverForm.name.trim(),
        mode: serverForm.mode.trim(),
        ip: serverForm.ip.trim(),
        server_ip: serverForm.server_ip.trim(),
        battlemetrics_id: serverForm.battlemetrics_id.trim(),
        description: serverForm.description.trim(),
        features: featuresArray,
        display_order: serverForm.display_order,
        is_active: serverForm.is_active
      };

      const url = editingServer
        ? `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/?server_id=${editingServer.id}`
        : `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/`;

      const res = await fetch(url, {
        method: editingServer ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({
          title: 'Успешно',
          description: editingServer ? 'Сервер обновлён' : 'Сервер создан'
        });
        closeServerDialog();
        loadServers();
      } else {
        const error = await res.json();
        toast({
          title: 'Ошибка',
          description: error.error || 'Не удалось сохранить сервер',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сервер',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setActiveTab('maintenance')}
          variant={activeTab === 'maintenance' ? 'default' : 'outline'}
        >
          <Icon name="Settings" className="mr-2" />
          Тех. работы
        </Button>
        <Button
          onClick={() => setActiveTab('servers')}
          variant={activeTab === 'servers' ? 'default' : 'outline'}
        >
          <Icon name="Server" className="mr-2" />
          Карточки серверов
        </Button>
      </div>

      {activeTab === 'maintenance' && (
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
      )}

      {activeTab === 'servers' && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Управление карточками серверов</h2>
              <p className="text-muted-foreground">
                Редактирование информации о серверах на главной странице
              </p>
            </div>
            <Button onClick={() => openServerDialog()}>
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
                <Card key={server.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{server.name}</h3>
                        {server.mode && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {server.mode}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={server.is_active}
                            onCheckedChange={async (checked) => {
                              try {
                                await fetch(`${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/?server_id=${server.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-Auth-Token': token
                                  },
                                  body: JSON.stringify({ ...server, is_active: checked })
                                });
                                loadServers();
                              } catch (error) {
                                console.error('Failed to toggle server:', error);
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {server.is_active ? 'Активен' : 'Скрыт'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {server.ip && (
                          <div className="flex items-center gap-2">
                            <Icon name="Globe" size={14} />
                            <span>{server.ip}</span>
                          </div>
                        )}
                        {server.server_ip && (
                          <div className="flex items-center gap-2">
                            <Icon name="Network" size={14} />
                            <span>{server.server_ip}</span>
                          </div>
                        )}
                        {server.battlemetrics_id && (
                          <div className="flex items-center gap-2">
                            <Icon name="BarChart" size={14} />
                            <span>BM: {server.battlemetrics_id}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Icon name="Hash" size={14} />
                          <span>Порядок: {server.display_order}</span>
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

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openServerDialog(server)}
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
      )}

      <Dialog open={showServerDialog} onOpenChange={closeServerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? 'Редактировать сервер' : 'Добавить сервер'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="server-name">Название сервера *</Label>
              <Input
                id="server-name"
                value={serverForm.name}
                onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                placeholder="#1 [PVE] DevilRust X3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-mode">Режим</Label>
                <Input
                  id="server-mode"
                  value={serverForm.mode}
                  onChange={(e) => setServerForm({ ...serverForm, mode: e.target.value })}
                  placeholder="PVE x3"
                />
              </div>
              <div>
                <Label htmlFor="server-ip">IP для подключения</Label>
                <Input
                  id="server-ip"
                  value={serverForm.ip}
                  onChange={(e) => setServerForm({ ...serverForm, ip: e.target.value })}
                  placeholder="1.devilrust.ru"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-server-ip">Server IP:Port</Label>
                <Input
                  id="server-server-ip"
                  value={serverForm.server_ip}
                  onChange={(e) => setServerForm({ ...serverForm, server_ip: e.target.value })}
                  placeholder="62.122.214.220:10000"
                />
              </div>
              <div>
                <Label htmlFor="server-bm">Battlemetrics ID</Label>
                <Input
                  id="server-bm"
                  value={serverForm.battlemetrics_id}
                  onChange={(e) => setServerForm({ ...serverForm, battlemetrics_id: e.target.value })}
                  placeholder="30367639"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="server-desc">Описание</Label>
              <Textarea
                id="server-desc"
                value={serverForm.description}
                onChange={(e) => setServerForm({ ...serverForm, description: e.target.value })}
                placeholder="Краткое описание сервера..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="server-features">Особенности (каждая с новой строки)</Label>
              <Textarea
                id="server-features"
                value={serverForm.features}
                onChange={(e) => setServerForm({ ...serverForm, features: e.target.value })}
                placeholder="Рейты x3&#10;Вайп 1 раз в месяц&#10;Кастомные руды"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-order">Порядок отображения</Label>
                <Input
                  id="server-order"
                  type="number"
                  value={serverForm.display_order}
                  onChange={(e) => setServerForm({ ...serverForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  checked={serverForm.is_active}
                  onCheckedChange={(checked) => setServerForm({ ...serverForm, is_active: checked })}
                />
                <Label>Активен (показывать на сайте)</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeServerDialog}>
                Отмена
              </Button>
              <Button onClick={handleSaveServer} disabled={saving}>
                <Icon name="Save" className="mr-2" />
                {saving ? 'Сохранение...' : editingServer ? 'Обновить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementTab;
