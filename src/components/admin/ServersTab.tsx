import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface Server {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServersTabProps {
  servers: Server[];
  showServerForm: boolean;
  setShowServerForm: (show: boolean) => void;
  editingServer: Server | null;
  serverForm: { name: string; is_active: boolean };
  setServerForm: (form: { name: string; is_active: boolean }) => void;
  handleCreateServer: (e: React.FormEvent) => void;
  handleUpdateServer: (e: React.FormEvent) => void;
  handleDeleteServer: (serverId: number) => void;
  startEditServer: (server: Server) => void;
  cancelServerForm: () => void;
  loading: boolean;
}

const ServersTab = ({
  servers,
  showServerForm,
  setShowServerForm,
  editingServer,
  serverForm,
  setServerForm,
  handleCreateServer,
  handleUpdateServer,
  handleDeleteServer,
  startEditServer,
  cancelServerForm,
  loading
}: ServersTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Управление серверами</h2>
        {!showServerForm && (
          <Button onClick={() => setShowServerForm(true)}>
            <Icon name="Plus" className="mr-2" />
            Добавить сервер
          </Button>
        )}
      </div>

      {showServerForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingServer ? 'Редактировать сервер' : 'Новый сервер'}
          </h3>
          <form onSubmit={editingServer ? handleUpdateServer : handleCreateServer} className="space-y-4">
            <div>
              <Label htmlFor="serverName">Название сервера</Label>
              <Input
                id="serverName"
                value={serverForm.name}
                onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                placeholder="x2 DevilRust"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="serverActive"
                checked={serverForm.is_active}
                onChange={(e) => setServerForm({ ...serverForm, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="serverActive">Активен</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : editingServer ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelServerForm}>
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
            <p className="text-muted-foreground">Нет серверов</p>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name="Server" className={server.is_active ? 'text-green-500' : 'text-muted-foreground'} />
                  <div>
                    <h3 className="font-semibold">{server.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {server.is_active ? 'Активен' : 'Неактивен'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEditServer(server)}>
                    <Icon name="Edit" className="mr-1" size={16} />
                    Изменить
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteServer(server.id)}>
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
