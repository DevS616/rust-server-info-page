import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const COMPLAINTS_API = 'https://functions.poehali.dev/76a02e7f-8572-4035-9cd5-8533e8fb1c6d';
const UPLOAD_API = 'https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5';

interface ComplaintFormProps {
  token: string;
  isBlocked: boolean;
  onCreated: () => void;
  onCancel: () => void;
}

const ComplaintForm = ({ token, isBlocked, onCreated, onCancel }: ComplaintFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    complaint_against: '',
    subject: '',
    reason: '',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','image/bmp','video/mp4','video/webm','video/quicktime'];
  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: 'Ошибка', description: 'Допустимы только фото (JPG, PNG, GIF, WEBP) и видео (MP4, MOV, WEBM)', variant: 'destructive' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 20 МБ', variant: 'destructive' });
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      toast({ title: 'Ошибка', description: 'Ваш аккаунт заблокирован', variant: 'destructive' });
      return;
    }
    if (!formData.complaint_against || !formData.subject.trim() || !formData.reason.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }

    setUploading(true);
    let file_url = '';

    if (formData.file) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(formData.file!);
      });

      try {
        const uploadRes = await fetch(UPLOAD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
          body: JSON.stringify({ file: base64, filename: formData.file.name, content_type: formData.file.type }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          file_url = uploadData.url || '';
        }
      } catch {
        toast({ title: 'Ошибка', description: 'Не удалось загрузить файл', variant: 'destructive' });
        setUploading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({
          complaint_against: formData.complaint_against,
          subject: formData.subject.trim(),
          reason: formData.reason.trim(),
          file_url,
        }),
      });

      if (res.ok) {
        toast({ title: 'Жалоба подана', description: 'Мы рассмотрим её в ближайшее время' });
        onCreated();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось подать жалобу', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось подать жалобу', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
          <Icon name="AlertTriangle" className="text-white" size={20} />
        </div>
        <h2 className="text-xl font-bold text-white">Новая жалоба</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-slate-300 mb-2 block">На кого жалоба *</Label>
          <Select value={formData.complaint_against} onValueChange={(v) => setFormData({ ...formData, complaint_against: v })}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="Выберите..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Администратор</SelectItem>
              <SelectItem value="player">Игрок</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300 mb-2 block">Тема жалобы *</Label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Кратко опишите суть жалобы"
            maxLength={200}
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-300 mb-2 block">Причина / описание *</Label>
          <Textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Подробно опишите нарушение: что произошло, когда, ник нарушителя..."
            rows={5}
            maxLength={2000}
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1">{formData.reason.length}/2000</p>
        </div>

        <div>
          <Label className="text-slate-300 mb-2 block">
            <div className="flex items-center gap-2">
              <Icon name="Paperclip" size={16} />
              Доказательство (фото или видео)
            </div>
          </Label>
          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-red-500 transition-colors">
            <Icon name="Upload" size={20} className="text-slate-400" />
            <span className="text-slate-400 text-sm">
              {formData.file ? formData.file.name : 'Нажмите для выбора файла...'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/avi,video/x-matroska"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Фото: JPG, PNG, GIF, WEBP · Видео: MP4, MOV, WEBM · Макс. 20 МБ
          </p>
          {formData.file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 text-slate-400 hover:text-red-400"
              onClick={() => setFormData({ ...formData, file: null })}
            >
              <Icon name="X" size={14} className="mr-1" /> Убрать файл
            </Button>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={uploading || isBlocked}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            {uploading ? (
              <><Icon name="Loader2" size={16} className="mr-2 animate-spin" /> Отправка...</>
            ) : (
              <><Icon name="Send" size={16} className="mr-2" /> Подать жалобу</>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300">
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ComplaintForm;