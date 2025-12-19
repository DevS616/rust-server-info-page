import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import AdminLogin from '@/components/admin/AdminLogin';
import TicketsTab from '@/components/admin/TicketsTab';
import ServersTab from '@/components/admin/ServersTab';
import ManagementTab from '@/components/admin/ManagementTab';
import PromotionTab from '@/components/admin/PromotionTab';

const API_BASE = 'https://functions.poehali.dev';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
  steam_id: string;
  is_blocked: boolean;
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

interface Server {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  
  const [servers, setServers] = useState<Server[]>([]);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [serverForm, setServerForm] = useState({ name: '', is_active: true });
  const [showServerForm, setShowServerForm] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      setToken(storedToken);
      loadTickets(storedToken);
      loadServers(storedToken);
    }
    
    const ticketId = searchParams.get('ticket');
    if (ticketId && storedToken) {
      loadTicketDetails(ticketId, storedToken);
    }
  }, [searchParams]);

  const loadTickets = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=list`, {
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

  const loadServers = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/`, {
        headers: { 'X-Auth-Token': authToken }
      });
      
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadTicketDetails = async (ticketId: string, authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?ticket_id=${ticketId}`, {
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
      const res = await fetch(`${API_BASE}/bf06608b-5623-4eae-8f89-c08bea6a0073/?action=login`, {
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
    setServers([]);
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverForm.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify(serverForm)
      });

      if (res.ok) {
        toast({ title: 'Сервер создан', description: 'Новый сервер успешно добавлен' });
        setServerForm({ name: '', is_active: true });
        setShowServerForm(false);
        loadServers(token!);
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось создать сервер', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать сервер', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer || !serverForm.name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?server_id=${editingServer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify(serverForm)
      });

      if (res.ok) {
        toast({ title: 'Сервер обновлен', description: 'Изменения сохранены' });
        setEditingServer(null);
        setServerForm({ name: '', is_active: true });
        loadServers(token!);
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось обновить сервер', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить сервер', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (serverId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот сервер?')) return;

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?server_id=${serverId}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token! }
      });

      if (res.ok) {
        toast({ title: 'Сервер удален', description: 'Сервер успешно удален' });
        loadServers(token!);
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
    }
  };

  const startEditServer = (server: Server) => {
    setEditingServer(server);
    setServerForm({ name: server.name, is_active: server.is_active });
    setShowServerForm(true);
  };

  const cancelServerForm = () => {
    setEditingServer(null);
    setServerForm({ name: '', is_active: true });
    setShowServerForm(false);
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=reply&ticket_id=${selectedTicket.id}`, {
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
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось отправить ответ', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast({ title: 'Ошибка', description: 'Не удалось отправить ответ', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (status: string) => {
    if (!selectedTicket) return;
    
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=status&ticket_id=${selectedTicket.id}`, {
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
      const res = await fetch(`${API_BASE}/bf06608b-5623-4eae-8f89-c08bea6a0073/?action=${action}&user_id=${userId}`, {
        method: 'PUT',
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: block ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
        if (selectedTicket) {
          loadTicketDetails(selectedTicket.id.toString(), token!);
        }
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить действие', variant: 'destructive' });
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?ticket_id=${ticketId}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Обращение удалено' });
        setSelectedTicket(null);
        loadTickets(token!);
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить обращение', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить обращение', variant: 'destructive' });
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
      <AdminLogin
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleLogin={handleLogin}
        loading={loading}
      />
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
            <TabsTrigger value="servers">Серверы</TabsTrigger>
            <TabsTrigger value="promotions">Акции</TabsTrigger>
            <TabsTrigger value="management">Управление</TabsTrigger>
            <TabsTrigger value="admins">Администраторы</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            <TicketsTab
              tickets={tickets}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              messages={messages}
              reply={reply}
              setReply={setReply}
              handleSendReply={handleSendReply}
              handleChangeStatus={handleChangeStatus}
              handleBlockUser={handleBlockUser}
              handleDeleteTicket={handleDeleteTicket}
              loadTicketDetails={loadTicketDetails}
              token={token}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="servers">
            <ServersTab
              servers={servers}
              showServerForm={showServerForm}
              setShowServerForm={setShowServerForm}
              editingServer={editingServer}
              serverForm={serverForm}
              setServerForm={setServerForm}
              handleCreateServer={handleCreateServer}
              handleUpdateServer={handleUpdateServer}
              handleDeleteServer={handleDeleteServer}
              startEditServer={startEditServer}
              cancelServerForm={cancelServerForm}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionTab token={token!} />
          </TabsContent>

          <TabsContent value="management">
            <ManagementTab token={token!} />
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