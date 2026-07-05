import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const POLLS_API = 'https://functions.poehali.dev/b11aeefa-8364-460f-a54e-6338ddb77cf3';

interface PollOption {
  id?: number;
  text: string;
  image_url?: string | null;
  votes?: number;
  image_base64?: string;
  image_type?: string;
  _preview?: string | null;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  multiple_choice: boolean;
  is_map_vote: boolean;
  is_active: boolean;
  ends_at: string | null;
  total_votes: number;
  options: PollOption[];
}

interface PollsTabProps {
  token: string;
}

const emptyForm = {
  id: null as number | null,
  title: '',
  description: '',
  multiple_choice: false,
  is_map_vote: false,
  is_active: true,
  ends_at: '',
  options: [{ text: '' }, { text: '' }] as PollOption[],
};

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PollsTab = ({ token }: PollsTabProps) => {
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const res = await fetch(`${POLLS_API}/?action=admin-list`, { headers: { 'X-Auth-Token': token } });
      if (res.ok) {
        const data = await res.json();
        setPolls(data.polls || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...emptyForm, options: [{ text: '' }, { text: '' }] });
    setDialogOpen(true);
  };

  const openEdit = (poll: Poll) => {
    setForm({
      id: poll.id,
      title: poll.title,
      description: poll.description || '',
      multiple_choice: poll.multiple_choice,
      is_map_vote: poll.is_map_vote,
      is_active: poll.is_active,
      ends_at: toDatetimeLocal(poll.ends_at),
      options: poll.options.map(o => ({ id: o.id, text: o.text, image_url: o.image_url, _preview: o.image_url })),
    });
    setDialogOpen(true);
  };

  const addOption = () => setForm(f => ({ ...f, options: [...f.options, { text: '' }] }));
  const removeOption = (idx: number) =>
    setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  const updateOption = (idx: number, patch: Partial<PollOption>) =>
    setForm(f => ({ ...f, options: f.options.map((o, i) => i === idx ? { ...o, ...patch } : o) }));

  const handleOptionImage = (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ошибка', description: 'Картинка не больше 5 МБ', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      updateOption(idx, {
        image_base64: result.split(',')[1],
        image_type: (file.name.split('.').pop() || 'jpg').toLowerCase(),
        _preview: result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Ошибка', description: 'Введите вопрос', variant: 'destructive' });
      return;
    }
    const validOptions = form.options.filter(o => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: 'Ошибка', description: 'Нужно минимум 2 варианта ответа', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        multiple_choice: form.multiple_choice,
        is_map_vote: form.is_map_vote,
        is_active: form.is_active,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        options: validOptions.map(o => ({
          id: o.id,
          text: o.text,
          image_url: o.image_url,
          image_base64: o.image_base64,
          image_type: o.image_type,
        })),
      };
      if (form.id) payload.id = form.id;

      const res = await fetch(`${POLLS_API}/`, {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: 'Успешно', description: form.id ? 'Опрос обновлён' : 'Опрос создан' });
        setDialogOpen(false);
        load();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сбой соединения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить опрос вместе со всеми голосами?')) return;
    try {
      const res = await fetch(`${POLLS_API}/?id=${id}`, { method: 'DELETE', headers: { 'X-Auth-Token': token } });
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Опрос удалён' });
        load();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Сбой соединения', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Опросы и голосования</h2>
          <p className="text-muted-foreground">Создавайте голосования как в Telegram. Доступны по ссылке /vote</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Icon name="Plus" className="h-4 w-4 mr-2" />
          Создать опрос
        </Button>
      </div>

      {polls.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Icon name="BarChart3" className="mx-auto mb-3" size={40} />
          <p>Опросов пока нет</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {polls.map(poll => (
            <Card key={poll.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-lg">{poll.title}</CardTitle>
                      {poll.is_map_vote && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <Icon name="Map" size={12} className="mr-1" />Голосование за карту
                        </Badge>
                      )}
                      {poll.multiple_choice && <Badge variant="outline">Мультивыбор</Badge>}
                      <Badge variant="outline" className={poll.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}>
                        {poll.is_active ? 'Активен' : 'Скрыт'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Icon name="Users" size={12} />{poll.total_votes} голосов</span>
                      <span className="flex items-center gap-1"><Icon name="List" size={12} />{poll.options.length} вариантов</span>
                      {poll.ends_at && (
                        <span className="flex items-center gap-1"><Icon name="Clock" size={12} />до {new Date(poll.ends_at).toLocaleString('ru-RU')}</span>
                      )}
                      <span>ID: {poll.id}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(poll)}><Icon name="Edit" size={16} /></Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(poll.id)}><Icon name="Trash" size={16} /></Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Редактировать опрос' : 'Создать опрос'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Вопрос</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="За какую карту голосуем?" />
            </div>

            <div className="space-y-2">
              <Label>Описание (необязательно)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Подробности голосования" />
            </div>

            <div className="space-y-3">
              <Label>Варианты ответа</Label>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20">
                  <div className="flex-1 space-y-2">
                    <Input value={opt.text} onChange={e => updateOption(idx, { text: e.target.value })} placeholder={`Вариант ${idx + 1}`} />
                    <div className="flex items-center gap-2">
                      {opt._preview ? (
                        <div className="relative">
                          <img src={opt._preview} alt="" className="w-16 h-16 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => updateOption(idx, { _preview: null, image_url: null, image_base64: undefined })}
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-xs text-primary flex items-center gap-1 hover:underline">
                          <Icon name="ImagePlus" size={14} />
                          Добавить картинку
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && handleOptionImage(idx, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                  {form.options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => removeOption(idx)}>
                      <Icon name="Trash2" size={16} />
                    </Button>
                  )}
                </div>
              ))}
              {form.options.length < 10 && (
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Icon name="Plus" size={14} className="mr-1" />Добавить вариант
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Дата завершения (необязательно)</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
              <p className="text-xs text-muted-foreground">После завершения покажется вариант-победитель</p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Мультивыбор</Label>
                  <p className="text-xs text-muted-foreground">Можно выбрать несколько вариантов</p>
                </div>
                <Switch checked={form.multiple_choice} onCheckedChange={v => setForm({ ...form, multiple_choice: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Голосование за карту</Label>
                  <p className="text-xs text-muted-foreground">Кнопка появится в календаре</p>
                </div>
                <Switch checked={form.is_map_vote} onCheckedChange={v => setForm({ ...form, is_map_vote: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Активен</Label>
                  <p className="text-xs text-muted-foreground">Показывать на странице /vote</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Icon name="Loader2" className="animate-spin mr-2 h-4 w-4" /> : null}
              {form.id ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollsTab;
