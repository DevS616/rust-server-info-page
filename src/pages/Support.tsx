import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TelegramSection from '@/components/support/TelegramSection';
import TicketForm from '@/components/support/TicketForm';
import TicketsList from '@/components/support/TicketsList';
import { apiCache } from '@/utils/apiCache';

const API_BASE = 'https://functions.poehali.dev';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  message_count: number;
  unread_count?: number;
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem('support_token');
    const redirectTicket = localStorage.getItem('redirect_to_ticket');
    
    if (urlToken) {
      localStorage.setItem('support_token', urlToken);
      setToken(urlToken);
      
      try {
        const payload = JSON.parse(atob(urlToken.split('.')[1]));
        localStorage.setItem('steam_user', JSON.stringify({
          steamId: payload.steam_id,
          username: payload.username,
          userId: payload.user_id,
          avatar: payload.avatar || ''
        }));
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
      
      if (redirectTicket) {
        localStorage.removeItem('redirect_to_ticket');
        navigate(`/support/ticket/${redirectTicket}`, { replace: true });
      } else {
        navigate('/support', { replace: true });
      }
    } else if (storedToken) {
      setToken(storedToken);
      
      if (!localStorage.getItem('steam_user')) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          localStorage.setItem('steam_user', JSON.stringify({
            steamId: payload.steam_id,
            username: payload.username,
            userId: payload.user_id,
            avatar: payload.avatar || ''
          }));
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
      
      if (redirectTicket) {
        localStorage.removeItem('redirect_to_ticket');
        navigate(`/support/ticket/${redirectTicket}`, { replace: true });
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    loadServers();
    if (token) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadServers = async () => {
    // Проверяем кэш
    const cached = apiCache.get<any[]>('servers');
    if (cached) {
      setServers(cached);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?active=true`);
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
        // Кэшируем на 10 минут (сервера меняются редко)
        apiCache.set('servers', data.servers || [], 600000);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadDashboard = async (useCache = true) => {
    // Проверяем кэш только если разрешено
    if (useCache) {
      const cached = apiCache.get<any>('dashboard');
      if (cached) {
        setTickets(cached.tickets || []);
        setIsBlocked(cached.is_blocked);
        setTelegramLinked(cached.telegram_linked || false);
        setTelegramUsername(cached.telegram_username || null);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=dashboard`, {
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Dashboard loaded, tickets:', data.tickets?.length || 0);
        setTickets(data.tickets || []);
        setIsBlocked(data.is_blocked);
        setTelegramLinked(data.telegram_linked || false);
        setTelegramUsername(data.telegram_username || null);
        
        // Кэшируем на 2 минуты
        apiCache.set('dashboard', data, 120000);
        
        if (data.is_blocked) {
          toast({ 
            title: 'Аккаунт заблокирован', 
            description: 'Вам запрещено создавать тикеты в техподдержке', 
            variant: 'destructive',
            duration: 10000
          });
        }
      } else {
        console.error('Dashboard failed:', res.status);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    await loadDashboard();
  };

  const handleSteamLogin = () => {
    const baseUrl = window.location.origin;
    window.location.href = `${API_BASE}/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${encodeURIComponent(baseUrl)}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('support_token');
    localStorage.removeItem('steam_user');
    setToken(null);
    setUser(null);
    setTickets([]);
  };

  const handleTicketCreated = async () => {
    setShowForm(false);
    // Не загружаем сразу, пользователь увидит новый тикет при обновлении страницы
    toast({ 
      title: 'Успешно!', 
      description: 'Обращение создано. Обновите страницу чтобы увидеть его в списке.' 
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="Headphones" className="text-white" size={40} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Техподдержка</h1>
              <p className="text-slate-400 mb-8">
                Авторизуйтесь через Steam, чтобы создать обращение
              </p>
              <Button 
                onClick={handleSteamLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg"
              >
                <Icon name="LogIn" size={20} className="mr-2" />
                Войти через Steam
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Техподдержка</h1>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
          </div>

          <TelegramSection 
            token={token} 
            initialLinked={telegramLinked}
            initialUsername={telegramUsername}
            onStatusChange={() => {
              apiCache.invalidate('dashboard');
              loadDashboard(false);
            }}
          />

          {showForm ? (
            <TicketForm 
              token={token}
              servers={servers}
              isBlocked={isBlocked}
              onTicketCreated={handleTicketCreated}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <TicketsList 
              tickets={tickets}
              loading={loading}
              onNewTicket={() => setShowForm(true)}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;