import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
  message_count: number;
  user_id: number;
}

interface Message {
  id: number;
  message: string;
  file_url: string;
  is_admin_reply: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  admin_name?: string;
}

const Admin = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      setToken(storedToken);
      loadTickets(storedToken);
    }
    
    const ticketId = searchParams.get('ticket');
    if (ticketId && storedToken) {
      loadTicketDetails(ticketId, storedToken);
    }
  }, [searchParams]);

  const loadTickets = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/list`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const loadTicketDetails = async (ticketId: string, authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/${ticketId}`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/bf06608b-5623-4eae-8f89-c08bea6a0073/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setAdmin(data.admin);
        loadTickets(data.token);
        toast({ title: 'Успешно', description: 'Вы вошли в систему' });
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Неверные данные', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setAdmin(null);
    setTickets([]);
    setSelectedTicket(null);
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ message: reply })
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Ответ отправлен' });
        setReply('');
        loadTicketDetails(selectedTicket.id.toString(), token!);
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить ответ', variant: 'destructive' });
    }
  };

  const handleChangeStatus = async (status: string) => {
    if (!selectedTicket) return;
    
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Статус изменён' });
        loadTickets(token!);
        loadTicketDetails(selectedTicket.id.toString(), token!);
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить статус', variant: 'destructive' });
    }
  };

  const handleBlockUser = async (userId: number, block: boolean) => {
    try {
      const action = block ? 'block' : 'unblock';
      const res = await fetch(`${API_BASE}/bf06608b-5623-4eae-8f89-c08bea6a0073/users/${userId}/${action}`, {
        method: 'PUT',
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: block ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить действие', variant: 'destructive' });
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

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <Icon name="Shield" className="mx-auto mb-4 text-primary" size={48} />
            <h1 className="text-2xl font-bold">Админ-панель</h1>
            <p className="text-muted-foreground mt-2">Войдите для доступа к системе</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Админ-панель техподдержки</h1>
          <Button onClick={handleLogout} variant="outline">
            <Icon name="LogOut" className="mr-2" />
            Выйти
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="tickets">Обращения</TabsTrigger>
            <TabsTrigger value="admins">Администраторы</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            {selectedTicket ? (
              <div>
                <Button onClick={() => setSelectedTicket(null)} variant="outline" className="mb-4">
                  <Icon name="ArrowLeft" className="mr-2" />
                  Назад к списку
                </Button>

                <Card className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <img src={selectedTicket.steam_avatar} alt="" className="w-12 h-12 rounded-full" />
                      <div>
                        <h2 className="text-2xl font-semibold">{selectedTicket.subject}</h2>
                        <p className="text-muted-foreground">от {selectedTicket.steam_username}</p>
                        <p className="text-sm text-muted-foreground mt-1">Сервер: {selectedTicket.server}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={selectedTicket.status} onValueChange={handleChangeStatus}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Открыт</SelectItem>
                          <SelectItem value="in_progress">В работе</SelectItem>
                          <SelectItem value="closed">Закрыт</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleBlockUser(selectedTicket.user_id, true)}
                      >
                        <Icon name="Ban" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                          <div className={`inline-block max-w-[80%] p-4 rounded-lg ${
                            msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <p className="text-sm font-medium mb-1">
                              {msg.is_admin_reply ? msg.admin_name : msg.user_name}
                            </p>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            {msg.file_url && (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                                className="text-sm underline mt-2 block">
                                📎 Прикреплённый файл
                              </a>
                            )}
                            <p className="text-xs opacity-70 mt-2">
                              {new Date(msg.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <Label htmlFor="reply">Ответ</Label>
                    <Textarea
                      id="reply"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Введите ответ..."
                      rows={4}
                      className="mb-2"
                    />
                    <Button onClick={handleSendReply} disabled={!reply.trim()}>
                      <Icon name="Send" className="mr-2" />
                      Отправить ответ
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4">
                {tickets.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Icon name="Inbox" className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <p className="text-muted-foreground">Нет обращений</p>
                  </Card>
                ) : (
                  tickets.map((ticket) => (
                    <Card key={ticket.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        loadTicketDetails(ticket.id.toString(), token!);
                      }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <img src={ticket.steam_avatar} alt="" className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                              <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                            </div>
                            <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground">от {ticket.steam_username}</p>
                            <p className="text-sm text-muted-foreground">Сервер: {ticket.server}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Сообщений: {ticket.message_count}</span>
                              <span>{new Date(ticket.created_at).toLocaleDateString('ru-RU')}</span>
                            </div>
                          </div>
                        </div>
                        <Icon name="ChevronRight" className="text-muted-foreground" />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="admins">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Управление администраторами</h2>
              <p className="text-muted-foreground">Функция в разработке</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
