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

export interface Server {
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

export interface ServerFormData {
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

interface ServerDialogProps {
  open: boolean;
  server: Server | null;
  serversLength: number;
  token: string;
  onClose: () => void;
  onSave: () => void;
}

const ServerDialog = ({ open, server, serversLength, token, onClose, onSave }: ServerDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
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
    if (server) {
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
      setServerForm({
        name: '',
        mode: '',
        ip: '',
        server_ip: '',
        battlemetrics_id: '',
        description: '',
        features: '',
        display_order: serversLength,
        is_active: true
      });
    }
  }, [server, serversLength, open]);

  const handleSave = async () => {
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

      const url = server
        ? `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/?server_id=${server.id}`
        : `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/`;

      const res = await fetch(url, {
        method: server ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({
          title: 'Успешно',
          description: server ? 'Сервер обновлён' : 'Сервер создан'
        });
        onSave();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {server ? 'Редактировать сервер' : 'Добавить сервер'}
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
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Icon name="Save" className="mr-2" />
              {saving ? 'Сохранение...' : server ? 'Обновить' : 'Создать'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerDialog;
