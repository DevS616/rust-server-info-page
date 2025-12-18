import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_BASE = 'https://functions.poehali.dev';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  message_count: number;
}

const Support = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    server: '',
    subject: '',
    message: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem('support_token');
    
    if (urlToken) {
      localStorage.setItem('support_token', urlToken);
      setToken(urlToken);
      navigate('/support', { replace: true });
    } else if (storedToken) {
      setToken(storedToken);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (token) {
      loadTickets();
      loadServers();
    } else {
      setLoading(false);
      loadServers();
    }
  }, [token]);

  const loadServers = async () => {
    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?active=true`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=list`, {
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSteamLogin = () => {
    const baseUrl = window.location.origin;
    window.location.href = `${API_BASE}/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${encodeURIComponent(baseUrl)}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('support_token');
    setToken(null);
    setUser(null);
    setTickets([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 10 МБ', variant: 'destructive' });
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

      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({
          server: formData.server,
          subject: formData.subject,
          message: formData.message,
          file_url: fileUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        try {
          await fetch(`${API_BASE}/d9aaa9bf-3c0a-459b-ae1a-3c8bb981fdc6/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticket_id: data.ticket.id,
              server: formData.server,
              subject: formData.subject,
              url: `https://play.devilrust.ru/admin?ticket=${data.ticket.id}`
            })
          });
        } catch (telegramError) {
          console.error('Telegram notification error:', telegramError);
        }

        toast({ title: 'Успешно', description: 'Обращение создано' });
        setFormData({ server: '', subject: '', message: '', file: null });
        setShowForm(false);
        loadTickets();
      } else {
        const errorText = await res.text();
        console.error('Server error:', res.status, errorText);
        try {
          const error = JSON.parse(errorText);
          toast({ title: 'Ошибка', description: error.error || 'Не удалось создать обращение', variant: 'destructive' });
        } catch {
          toast({ title: 'Ошибка', description: `Ошибка сервера (${res.status})`, variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Ticket creation error:', error);
      toast({ title: 'Ошибка', description: 'Произошла ошибка при создании обращения', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'in_progress': return 'В работе';
      case 'closed': return 'Закрыт';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Техподдержка</h1>
            
            {!token ? (
              <Button onClick={handleSteamLogin} size="lg">
                <Icon name="LogIn" className="mr-2" />
                Войти через Steam
              </Button>
            ) : (
              <Button onClick={handleLogout} variant="outline">
                <Icon name="LogOut" className="mr-2" />
                Выйти
              </Button>
            )}
          </div>

          {!token ? (
            <Card className="p-8 text-center">
              <Icon name="Shield" className="mx-auto mb-4 text-primary" size={48} />
              <h2 className="text-2xl font-semibold mb-2">Требуется авторизация</h2>
              <p className="text-muted-foreground mb-6">
                Войдите через Steam, чтобы создавать обращения в техподдержку
              </p>
              <Button onClick={handleSteamLogin} size="lg">
                <Icon name="LogIn" className="mr-2" />
                Войти через Steam
              </Button>
            </Card>
          ) : (
            <>
              {showForm ? (
                <Card className="p-6 mb-8">
                  <form onSubmit={handleSubmit}>
                    <h2 className="text-2xl font-semibold mb-4">Создать обращение</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="server">Сервер</Label>
                        <Select value={formData.server} onValueChange={(val) => setFormData({ ...formData, server: val })}>
                          <SelectTrigger id="server">
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
                        <Label htmlFor="subject">Тема обращения</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Опишите проблему кратко"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Описание проблемы</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Подробно опишите вашу проблему"
                          rows={6}
                        />
                      </div>

                      <div>
                        <Label htmlFor="file">Прикрепить файл (необязательно)</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*,.txt,.log,.pdf"
                        />
                        {formData.file && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Выбран: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} МБ)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <Button type="submit" disabled={uploading}>
                        {uploading ? 'Отправка...' : 'Отправить обращение'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Отмена
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <div className="mb-8">
                  <Button onClick={() => setShowForm(true)} size="lg">
                    <Icon name="Plus" className="mr-2" />
                    Создать обращение
                  </Button>
                </div>
              )}

              <div>
                <h2 className="text-2xl font-semibold mb-4">Мои обращения</h2>
                
                {tickets.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Icon name="Inbox" className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <p className="text-muted-foreground">У вас пока нет обращений</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <Card key={ticket.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/support/${ticket.id}`)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                              <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-1">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground">Сервер: {ticket.server}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Сообщений: {ticket.message_count}</span>
                              <span>{new Date(ticket.created_at).toLocaleDateString('ru-RU')}</span>
                            </div>
                          </div>
                          <Icon name="ChevronRight" className="text-muted-foreground" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;