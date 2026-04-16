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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewsItem {
  id: number;
  title: string;
  description: string;
  date: string;
  category: 'update' | 'event' | 'wipe' | 'news';
  icon: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface NewsTabProps {
  token: string;
}

const categoryConfig = {
  update: { label: 'Обновление', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'Shield' },
  event: { label: 'Ивент', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: 'Gift' },
  wipe: { label: 'Вайп', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'RefreshCw' },
  news: { label: 'Новость', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: 'Newspaper' }
};

const iconOptions = [
  'Gift', 'RefreshCw', 'Shield', 'Rocket', 'Newspaper', 'Calendar', 
  'Trophy', 'Zap', 'Star', 'Sparkles', 'Bell', 'Megaphone'
];

const NewsTab = ({ token }: NewsTabProps) => {
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    category: 'news' as 'update' | 'event' | 'wipe' | 'news',
    icon: 'Newspaper',
    image_url: '',
    button_text: '',
    button_url: '',
    is_published: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      const res = await fetch('https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/?action=admin-list', {
        headers: { 'X-Auth-Token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleOpenDialog = (newsItem?: NewsItem) => {
    if (newsItem) {
      setEditingNews(newsItem);
      setFormData({
        title: newsItem.title,
        description: newsItem.description,
        date: newsItem.date,
        category: newsItem.category,
        icon: newsItem.icon,
        image_url: newsItem.image_url || '',
        button_text: newsItem.button_text || '',
        button_url: newsItem.button_url || '',
        is_published: newsItem.is_published
      });
      setImagePreview(newsItem.image_url || null);
    } else {
      setEditingNews(null);
      setFormData({
        title: '',
        description: '',
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        category: 'news',
        icon: 'Newspaper',
        image_url: '',
        button_text: '',
        button_url: '',
        is_published: true
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 5 МБ', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.date) {
      toast({ title: 'Ошибка', description: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }

    try {
      const url = editingNews
        ? 'https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/'
        : 'https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/';

      const method = editingNews ? 'PUT' : 'POST';
      let body: Record<string, unknown> = editingNews ? { ...formData, id: editingNews.id } : { ...formData };
      
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(imageFile);
        });
        
        const base64 = await base64Promise;
        const ext = imageFile.name.split('.').pop() || 'jpg';
        body = { ...body, image_base64: base64, image_type: ext };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: 'Успешно', description: editingNews ? 'Новость обновлена' : 'Новость создана' });
        setIsDialogOpen(false);
        fetchNews();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось сохранить новость', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Сбой соединения', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту новость?')) return;

    try {
      const res = await fetch(`https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token }
      });

      if (res.ok) {
        toast({ title: 'Успешно', description: 'Новость удалена' });
        fetchNews();
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить новость', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Сбой соединения', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Управление новостями</h2>
          <p className="text-muted-foreground">Создавайте и редактируйте новости для главной страницы</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Icon name="Plus" className="h-4 w-4 mr-2" />
          Добавить новость
        </Button>
      </div>

      <div className="grid gap-4">
        {news.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                      <Icon name={item.icon} className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge variant="outline" className={categoryConfig[item.category].color}>
                        {categoryConfig[item.category].label}
                      </Badge>
                      {!item.is_published && (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                          Скрыто
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon name="Calendar" className="h-3 w-3" />
                        {item.date}
                      </span>
                      <span>ID: {item.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                    <Icon name="Pencil" className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNews ? 'Редактировать новость' : 'Создать новость'}</DialogTitle>
            <DialogDescription>
              Заполните информацию о новости. Все поля обязательны для заполнения.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Новогодний ивент 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание новости..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="25 декабря 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as 'update' | 'event' | 'wipe' | 'news' })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon name={config.icon} className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Иконка</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger id="icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        <Icon name={icon} className="h-4 w-4" />
                        {icon}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Изображение (опционально)</Label>
              <div className="space-y-4">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full max-w-md h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <Icon name="X" className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Рекомендуемый размер: 800x400px. Макс. размер: 5 МБ
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Кнопка в новости <span className="text-muted-foreground font-normal">(опционально)</span></Label>
                <p className="text-xs text-muted-foreground mb-3">Кнопка отображается внизу полного текста новости в модальном окне</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="button_text">Текст кнопки</Label>
                  <Input
                    id="button_text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    placeholder="Подробнее, Перейти..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="button_url">Ссылка кнопки</Label>
                  <Input
                    id="button_url"
                    value={formData.button_url}
                    onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Опубликовать на сайте</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
              {editingNews ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsTab;