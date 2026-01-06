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
import NewsTab from '@/components/admin/NewsTab';

import { useAdminAuth } from '@/components/admin/AdminAuth';
import { useAdminDataLoader, Ticket, Message, Server } from '@/components/admin/AdminDataLoader';
import { useTicketFilters } from '@/components/admin/AdminTicketFilters';
import { useServerManager } from '@/components/admin/AdminServerManager';
import { apiCache } from '@/utils/apiCache';

const API_BASE = 'https://functions.poehali.dev';

const Admin = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterServer, setFilterServer] = useState<string>('all');
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  
  const [servers, setServers] = useState<Server[]>([]);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [serverForm, setServerForm] = useState({ name: '', is_active: true });
  const [showServerForm, setShowServerForm] = useState(false);

  const { loading: authLoading, loginForm, setLoginForm, handleLogin: authHandleLogin, handleLogout: authHandleLogout } = useAdminAuth();
  const { loadTickets: dataLoadTickets, loadServers: dataLoadServers, loadTicketDetails: dataLoadTicketDetails } = useAdminDataLoader();
  const { applyFilters } = useTicketFilters();
  const serverManager = useServerManager(token, () => loadServers(token!, false));

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    console.log('Admin useEffect:', { hasToken: !!storedToken, tokenLength: storedToken?.length });
    if (storedToken) {
      console.log('Admin token found, loading data...');
      setToken(storedToken);
      loadTickets(storedToken, false);
      loadServers(storedToken, false);
    } else {
      console.log('No admin token found in localStorage');
    }
    
    const ticketId = searchParams.get('ticket');
    if (ticketId && storedToken) {
      loadTicketDetails(ticketId, storedToken);
    }
  }, [searchParams]);

  const loadTickets = async (authToken: string, useCache = true) => {
    const ticketsArray = await dataLoadTickets(authToken, useCache);
    setTickets(ticketsArray);
    setFilteredTickets(ticketsArray);
    console.log('State updated with tickets:', ticketsArray.length);
  };

  const loadServers = async (authToken: string, useCache = true) => {
    const serversArray = await dataLoadServers(authToken, useCache);
    setServers(serversArray);
  };

  const loadTicketDetails = async (ticketId: string, authToken: string) => {
    const { ticket, messages: ticketMessages } = await dataLoadTicketDetails(ticketId, authToken);
    setSelectedTicket(ticket);
    setMessages(ticketMessages);
  };

  const handleLogin = async (e: React.FormEvent) => {
    await authHandleLogin(e, (newToken: string, newAdmin: any) => {
      setToken(newToken);
      setAdmin(newAdmin);
      loadTickets(newToken, false);
    });
  };

  const handleLogout = () => {
    authHandleLogout(() => {
      setToken(null);
      setAdmin(null);
      setTickets([]);
      setFilteredTickets([]);
      setSelectedTicket(null);
      setServers([]);
    });
  };

  useEffect(() => {
    const filtered = applyFilters(tickets, filterStatus, filterServer, filterUnread, searchQuery, sortBy);
    setFilteredTickets(filtered);
  }, [filterStatus, filterServer, filterUnread, searchQuery, sortBy, tickets]);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await serverManager.handleCreateServer(serverForm);
    if (success) {
      setServerForm({ name: '', is_active: true });
      setShowServerForm(false);
    }
    setLoading(false);
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;
    setLoading(true);
    const success = await serverManager.handleUpdateServer(editingServer.id, serverForm);
    if (success) {
      setEditingServer(null);
      setServerForm({ name: '', is_active: true });
    }
    setLoading(false);
  };

  const handleDeleteServer = async (serverId: number) => {
    await serverManager.handleDeleteServer(serverId);
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

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    setLoading(true);
    try {
      let fileUrl = '';
      
      if (replyFile) {
        try {
          fileUrl = await uploadFile(replyFile);
        } catch (error) {
          toast({ title: 'Ошибка', description: 'Не удалось загрузить файл', variant: 'destructive' });
          setLoading(false);
          return;
        }
      }
      
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=reply&ticket_id=${selectedTicket.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ message: reply, file_url: fileUrl })
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Ответ отправлен' });
        setReply('');
        setReplyFile(null);
        apiCache.invalidate('admin_tickets');
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
        apiCache.invalidate('admin_tickets');
        loadTickets(token!, false);
        loadTicketDetails(selectedTicket.id.toString(), token!);
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось изменить статус', variant: 'destructive' });
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
      case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'closed': return 'Закрыт';
      case 'in_progress': return 'В работе';
      default: return status;
    }
  };

  if (!token) {
    return (
      <AdminLogin 
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleLogin={handleLogin}
        loading={authLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Админ-панель</h1>
              <p className="text-muted-foreground">Управление сайтом</p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <Icon name="LogOut" className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tickets">
              <Icon name="MessageSquare" className="mr-2 h-4 w-4" />
              Обращения
            </TabsTrigger>
            <TabsTrigger value="servers">
              <Icon name="Database" className="mr-2 h-4 w-4" />
              Серверы
            </TabsTrigger>
            <TabsTrigger value="management">
              <Icon name="Settings" className="mr-2 h-4 w-4" />
              Управление
            </TabsTrigger>
            <TabsTrigger value="promotion">
              <Icon name="Gift" className="mr-2 h-4 w-4" />
              Акция
            </TabsTrigger>
            <TabsTrigger value="news">
              <Icon name="Newspaper" className="mr-2 h-4 w-4" />
              Новости
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <TicketsTab 
              tickets={filteredTickets}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              messages={messages}
              reply={reply}
              setReply={setReply}
              replyFile={replyFile}
              setReplyFile={setReplyFile}
              handleSendReply={handleSendReply}
              handleChangeStatus={handleChangeStatus}
              handleBlockUser={handleBlockUser}
              handleDeleteTicket={handleDeleteTicket}
              loadTicketDetails={loadTicketDetails}
              token={token!}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              loading={loading}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterServer={filterServer}
              setFilterServer={setFilterServer}
              filterUnread={filterUnread}
              setFilterUnread={setFilterUnread}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              servers={servers.map(s => s.name)}
            />
          </TabsContent>

          <TabsContent value="servers">
            <ServersTab 
              servers={servers}
              editingServer={editingServer}
              serverForm={serverForm}
              setServerForm={setServerForm}
              showServerForm={showServerForm}
              loading={loading}
              onCreateServer={handleCreateServer}
              onUpdateServer={handleUpdateServer}
              onDeleteServer={handleDeleteServer}
              onStartEdit={startEditServer}
              onCancel={cancelServerForm}
              onShowForm={() => setShowServerForm(true)}
            />
          </TabsContent>

          <TabsContent value="management">
            <ManagementTab token={token!} />
          </TabsContent>

          <TabsContent value="promotion">
            <PromotionTab token={token!} />
          </TabsContent>

          <TabsContent value="news">
            <NewsTab token={token!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;