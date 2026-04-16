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
  detailed_description: { title?: string; description?: string; highlights?: HighlightItem[] } | null;
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
  features: FeatureItem[];
  detailed_title: string;
  detailed_description: string;
  highlights: HighlightItem[];
  display_order: number;
  is_active: boolean;
}

interface FeatureItem { text: string; }
interface HighlightItem { icon: string; text: string; }

interface ServerDialogProps {
  open: boolean;
  server: Server | null;
  serversLength: number;
  token: string;
  onClose: () => void;
  onSave: () => void;
}

// Популярные иконки для серверов
const ICON_OPTIONS = [
  'Star', 'Shield', 'Sword', 'Zap', 'Users', 'Clock', 'Map', 'Flame',
  'Trophy', 'Gem', 'Package', 'Wrench', 'Globe', 'Lock', 'Unlock',
  'Heart', 'Target', 'Rocket', 'Check', 'Ban', 'AlertTriangle',
  'RefreshCw', 'Calendar', 'Coins', 'Skull', 'Crosshair', 'Pickaxe',
  'Trees', 'Mountain', 'Building', 'Home', 'Flag', 'Tag',
];

const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm"
        title="Выбрать иконку"
      >
        <Icon name={value as Parameters<typeof Icon>[0]['name']} size={16} />
        <span className="text-xs text-muted-foreground">{value}</span>
        <Icon name="ChevronDown" size={12} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1">
          {ICON_OPTIONS.map(ic => (
            <button
              key={ic}
              type="button"
              title={ic}
              onClick={() => { onChange(ic); setOpen(false); }}
              className={`flex items-center justify-center w-7 h-7 rounded hover:bg-primary/20 transition-colors ${value === ic ? 'bg-primary/30 ring-1 ring-primary' : ''}`}
            >
              <Icon name={ic as Parameters<typeof Icon>[0]['name']} size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ServerDialog = ({ open, server, serversLength, token, onClose, onSave }: ServerDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [serverForm, setServerForm] = useState<ServerFormData>({
    name: '', mode: '', ip: '', server_ip: '', battlemetrics_id: '',
    description: '', features: [], detailed_title: '', detailed_description: '',
    highlights: [], display_order: 0, is_active: true,
  });

  useEffect(() => {
    if (server) {
      const det = server.detailed_description || {};
      setServerForm({
        name: server.name,
        mode: server.mode || '',
        ip: server.ip || '',
        server_ip: server.server_ip || '',
        battlemetrics_id: server.battlemetrics_id || '',
        description: server.description || '',
        features: (server.features || []).map(f => ({ text: f })),
        detailed_title: det.title || '',
        detailed_description: det.description || '',
        highlights: (det.highlights || []).map((h: HighlightItem) => ({ icon: h.icon || 'Star', text: h.text || '' })),
        display_order: server.display_order,
        is_active: server.is_active,
      });
    } else {
      setServerForm({
        name: '', mode: '', ip: '', server_ip: '', battlemetrics_id: '',
        description: '', features: [], detailed_title: '', detailed_description: '',
        highlights: [], display_order: serversLength, is_active: true,
      });
    }
  }, [server, serversLength, open]);

  // --- Фичи ---
  const addFeature = () => setServerForm(f => ({ ...f, features: [...f.features, { text: '' }] }));
  const removeFeature = (i: number) => setServerForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, text: string) => setServerForm(f => ({
    ...f, features: f.features.map((item, idx) => idx === i ? { text } : item),
  }));

  // --- Хайлайты ---
  const addHighlight = () => setServerForm(f => ({ ...f, highlights: [...f.highlights, { icon: 'Star', text: '' }] }));
  const removeHighlight = (i: number) => setServerForm(f => ({ ...f, highlights: f.highlights.filter((_, idx) => idx !== i) }));
  const updateHighlight = (i: number, field: 'icon' | 'text', val: string) => setServerForm(f => ({
    ...f, highlights: f.highlights.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  const handleSave = async () => {
    if (!serverForm.name.trim()) {
      toast({ title: 'Ошибка', description: 'Название сервера обязательно', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const featuresArray = serverForm.features.map(f => f.text.trim()).filter(Boolean);
      const highlightsArray = serverForm.highlights.filter(h => h.text.trim()).map(h => ({ icon: h.icon, text: h.text.trim() }));
      const detailedDescription = (serverForm.detailed_title || serverForm.detailed_description || highlightsArray.length > 0)
        ? { title: serverForm.detailed_title.trim(), description: serverForm.detailed_description.trim(), highlights: highlightsArray }
        : null;

      const body = {
        name: serverForm.name.trim(), mode: serverForm.mode.trim(),
        ip: serverForm.ip.trim(), server_ip: serverForm.server_ip.trim(),
        battlemetrics_id: serverForm.battlemetrics_id.trim(),
        description: serverForm.description.trim(),
        features: featuresArray, detailed_description: detailedDescription,
        display_order: serverForm.display_order, is_active: serverForm.is_active,
      };

      const url = server
        ? `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/?server_id=${server.id}`
        : `${API_BASE}/173145fd-cc6a-4e5a-baee-7e1194624730/`;

      const res = await fetch(url, {
        method: server ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: 'Успешно', description: server ? 'Сервер обновлён' : 'Сервер создан' });
        onSave();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить сервер', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{server ? 'Редактировать сервер' : 'Добавить сервер'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Основные поля ── */}
          <div>
            <Label>Название сервера *</Label>
            <Input value={serverForm.name} onChange={e => setServerForm(f => ({ ...f, name: e.target.value }))} placeholder="#1 PVE DevilRust X3" className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Режим <span className="text-xs text-muted-foreground">(PVE / PVP / CREATIVE)</span></Label>
              <Input value={serverForm.mode} onChange={e => setServerForm(f => ({ ...f, mode: e.target.value }))} placeholder="PVE" className="mt-1" />
            </div>
            <div>
              <Label>IP для подключения</Label>
              <Input value={serverForm.ip} onChange={e => setServerForm(f => ({ ...f, ip: e.target.value }))} placeholder="1.devilrust.ru" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Server IP:Port <span className="text-xs text-muted-foreground">(для мониторинга)</span></Label>
              <Input value={serverForm.server_ip} onChange={e => setServerForm(f => ({ ...f, server_ip: e.target.value }))} placeholder="62.122.214.220:10000" className="mt-1" />
            </div>
            <div>
              <Label>Battlemetrics ID</Label>
              <Input value={serverForm.battlemetrics_id} onChange={e => setServerForm(f => ({ ...f, battlemetrics_id: e.target.value }))} placeholder="25502145" className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Краткое описание <span className="text-xs text-muted-foreground">(показывается в карточке)</span></Label>
            <Textarea value={serverForm.description} onChange={e => setServerForm(f => ({ ...f, description: e.target.value }))} placeholder="Описание сервера, которое видит игрок в карточке..." rows={2} className="mt-1" />
          </div>

          {/* ── Особенности карточки ── */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm">Особенности карточки</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Отображаются на главной странице в карточке сервера</p>
              </div>
              <Button size="sm" variant="outline" onClick={addFeature}>
                <Icon name="Plus" size={14} className="mr-1" /> Добавить
              </Button>
            </div>
            {serverForm.features.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">Нет особенностей — нажмите «Добавить»</p>
            )}
            <div className="space-y-2">
              {serverForm.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center text-muted-foreground flex-shrink-0 text-xs">{i + 1}</div>
                  <Input
                    value={feat.text}
                    onChange={e => updateFeature(i, e.target.value)}
                    placeholder="Например: Рейты x3, PVE без рейдов..."
                    className="flex-1 h-8 text-sm"
                  />
                  <button type="button" onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/70 transition-colors flex-shrink-0">
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Полное описание для модального окна ── */}
          <div className="border-t pt-4">
            <div className="mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Icon name="FileText" size={15} /> Полное описание <span className="text-xs font-normal text-muted-foreground">(для кнопки «Инфо»)</span>
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Заголовок</Label>
                <Input value={serverForm.detailed_title} onChange={e => setServerForm(f => ({ ...f, detailed_title: e.target.value }))} placeholder="Добро пожаловать на сервер!" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Подробное описание</Label>
                <Textarea value={serverForm.detailed_description} onChange={e => setServerForm(f => ({ ...f, detailed_description: e.target.value }))} placeholder="Полное описание..." rows={3} className="mt-1" />
              </div>

              {/* Хайлайты с иконками */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Основные преимущества <span className="text-muted-foreground font-normal">(с иконками)</span></Label>
                  <Button size="sm" variant="outline" onClick={addHighlight}>
                    <Icon name="Plus" size={14} className="mr-1" /> Добавить
                  </Button>
                </div>
                {serverForm.highlights.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">Нет преимуществ — нажмите «Добавить»</p>
                )}
                <div className="space-y-2">
                  {serverForm.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <IconPicker value={h.icon} onChange={v => updateHighlight(i, 'icon', v)} />
                      <Input
                        value={h.text}
                        onChange={e => updateHighlight(i, 'text', e.target.value)}
                        placeholder="Описание преимущества..."
                        className="flex-1 h-8 text-sm"
                      />
                      <button type="button" onClick={() => removeHighlight(i)} className="text-destructive hover:text-destructive/70 transition-colors flex-shrink-0">
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Порядок и статус ── */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label>Порядок отображения</Label>
              <Input type="number" value={serverForm.display_order} onChange={e => setServerForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={serverForm.is_active} onCheckedChange={v => setServerForm(f => ({ ...f, is_active: v }))} />
              <Label>Активен (показывать на сайте)</Label>
            </div>
          </div>

          {/* ── Кнопки ── */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
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