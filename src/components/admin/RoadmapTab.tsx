import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ROADMAP_URL = 'https://functions.poehali.dev/bccc018e-abaf-434e-a899-688b45fcb58b';

interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'done';
  icon: string;
  sort_order: number;
  updated_at: string;
  is_published: boolean;
  created_at: string;
}

interface RoadmapTabProps {
  token: string;
}

const statusConfig = {
  planned: { label: 'Запланировано', color: 'bg-muted/60 text-muted-foreground border-border' },
  in_progress: { label: 'В разработке', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  done: { label: 'Готово', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
};

const iconOptions = [
  'Map', 'Rocket', 'Sword', 'Shield', 'Zap', 'Star', 'Trophy',
  'Package', 'Settings', 'Cpu', 'Globe', 'Users', 'Wrench',
  'Sparkles', 'Bell', 'Calendar', 'Clock', 'Flag', 'Target', 'Layers',
];

const defaultForm = {
  title: '',
  description: '',
  status: 'planned' as 'planned' | 'in_progress' | 'done',
  icon: 'Map',
  sort_order: 0,
  updated_at: new Date().toISOString().split('T')[0],
  is_published: true,
};

const RoadmapTab = ({ token }: RoadmapTabProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch(`${ROADMAP_URL}?action=admin-list`, {
      headers: { 'X-Auth-Token': token },
    });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleOpen = (item?: RoadmapItem) => {
    if (item) {
      setEditingItem(item);
      const [day, month, year] = item.updated_at.split('.');
      setFormData({
        title: item.title,
        description: item.description,
        status: item.status,
        icon: item.icon,
        sort_order: item.sort_order,
        updated_at: `${year}-${month}-${day}`,
        is_published: item.is_published,
      });
    } else {
      setEditingItem(null);
      setFormData(defaultForm);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({ title: 'Заполните обязательные поля', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `${ROADMAP_URL}?id=${editingItem.id}` : ROADMAP_URL;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify(formData),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: editingItem ? 'Пункт обновлён' : 'Пункт добавлен' });
      setIsDialogOpen(false);
      fetchItems();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот пункт?')) return;
    await fetch(`${ROADMAP_URL}?id=${id}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': token },
    });
    toast({ title: 'Пункт удалён' });
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Дорожная карта</h2>
        <Button onClick={() => handleOpen()}>
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить пункт
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center">Пунктов нет. Добавьте первый!</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="p-0">
              <CardContent className="p-4 flex items-start gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Icon name={item.icon} size={18} fallback="Map" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <Badge variant="outline" className={`text-xs ${statusConfig[item.status].color}`}>
                      {statusConfig[item.status].label}
                    </Badge>
                    {!item.is_published && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Скрыто</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                    <Icon name="Clock" size={10} />
                    {item.updated_at} · порядок: {item.sort_order}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(item)}>
                    <Icon name="Pencil" size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                    <Icon name="Trash2" size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Редактировать пункт' : 'Новый пункт'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Название *</Label>
              <Input
                placeholder="Например: Новая карта"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Описание *</Label>
              <Textarea
                placeholder="Что планируется сделать..."
                rows={3}
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Статус</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as typeof p.status }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Запланировано</SelectItem>
                    <SelectItem value="in_progress">В разработке</SelectItem>
                    <SelectItem value="done">Готово</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Порядок (сортировка)</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Иконка</Label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, icon: name }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                      formData.icon === name
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    <Icon name={name} size={16} fallback="Map" />
                    <span className="truncate w-full text-center text-[9px]">{name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Дата обновления</Label>
              <Input
                type="date"
                value={formData.updated_at}
                onChange={e => setFormData(p => ({ ...p, updated_at: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="rm-published"
                checked={formData.is_published}
                onCheckedChange={v => setFormData(p => ({ ...p, is_published: v }))}
              />
              <Label htmlFor="rm-published">Опубликовать</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoadmapTab;
