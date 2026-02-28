import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface Server {
  id: number;
  name: string;
  map?: string;
}

interface TicketFormProps {
  token: string;
  servers: Server[];
  isBlocked: boolean;
  onTicketCreated: () => void;
  onCancel: () => void;
}

const TicketForm = ({ token, servers, isBlocked, onTicketCreated, onCancel }: TicketFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    server: '',
    subject: '',
    message: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','image/bmp','video/mp4','video/webm','video/mov','video/avi','video/mkv','video/quicktime'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: 'Ошибка', description: 'Допустимы только фото (JPG, PNG, GIF, WEBP) и видео (MP4, MOV, AVI, MKV)', variant: 'destructive' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 100 МБ', variant: 'destructive' });
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const res = await fetch(`${API_BASE}/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: base64,
              filename: file.name,
              content_type: file.type
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            resolve(data.url);
          } else {
            reject(new Error('Upload failed'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.server || !formData.subject || !formData.message) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    if (!token) {
      toast({ title: 'Ошибка', description: 'Необходимо авторизоваться через Steam', variant: 'destructive' });
      return;
    }

    setUploading(true);
    
    try {
      let fileUrl = '';
      if (formData.file) {
        try {
          fileUrl = await uploadFile(formData.file);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          toast({ title: 'Ошибка', description: 'Не удалось загрузить файл', variant: 'destructive' });
          setUploading(false);
          return;
        }
      }

      console.log('Creating ticket:', { server: formData.server, subject: formData.subject });
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({
          server: formData.server,
          subject: formData.subject,
          message: formData.message,
          file_url: fileUrl
        })
      });

      console.log('Create ticket response:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Ticket created:', data);
        toast({ title: 'Успешно', description: 'Обращение создано' });
        setFormData({ server: '', subject: '', message: '', file: null });
        onTicketCreated();
      } else {
        const error = await res.json();
        console.error('Create ticket error:', error);
        toast({ title: 'Ошибка', description: error.error || 'Не удалось создать обращение', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать обращение', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (isBlocked) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Ban" className="text-red-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Аккаунт заблокирован</h3>
          <p className="text-slate-400">Вам запрещено создавать новые обращения в техподдержку</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Новое обращение</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="server" className="text-white">Сервер</Label>
          <Select value={formData.server} onValueChange={(value) => setFormData({ ...formData, server: value })}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Выберите сервер" />
            </SelectTrigger>
            <SelectContent>
              {servers.map((server) => (
                <SelectItem key={server.id} value={server.name}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subject" className="text-white">Тема обращения</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Кратко опишите проблему"
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label htmlFor="message" className="text-white">Сообщение</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Подробно опишите вашу проблему"
            rows={6}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label htmlFor="file" className="text-white mb-3 block">Прикрепить файл (необязательно)</Label>
          <input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/avi,video/x-matroska"
            className="hidden"
          />
          <label 
            htmlFor="file"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white rounded-md cursor-pointer transition-all"
          >
            <Icon name="Paperclip" size={18} />
            <span>{formData.file ? 'Изменить файл' : 'Выбрать файл'}</span>
          </label>
          <p className="text-xs text-slate-500 mt-2">
            Фото: JPG, PNG, GIF, WEBP · Видео: MP4, MOV, AVI, MKV · Макс. 100 МБ
          </p>
          {formData.file && (
            <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="File" size={16} className="text-slate-400" />
                <span className="text-sm text-slate-300">{formData.file.name}</span>
                <span className="text-xs text-slate-500">({(formData.file.size / 1024).toFixed(0)} КБ)</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, file: null })}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {uploading ? (
              <>
                <Icon name="Loader2" className="animate-spin mr-2" size={16} />
                Отправка...
              </>
            ) : (
              <>
                <Icon name="Send" size={16} className="mr-2" />
                Отправить
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TicketForm;