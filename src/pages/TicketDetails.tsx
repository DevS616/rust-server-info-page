import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_BASE = 'https://functions.poehali.dev';

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

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
}

const TicketDetails = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('support_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      navigate('/support');
    }
    
    audioRef.current = {
      play: () => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          
          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      }
    } as any;
  }, [navigate]);

  useEffect(() => {
    if (token && ticketId) {
      loadTicketDetails();
      
      const interval = setInterval(() => {
        loadTicketDetails();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [token, ticketId]);

  const loadTicketDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?ticket_id=${ticketId}`, {
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        const newMessages = data.messages || [];
        
        if (newMessages.length > prevMessageCount && prevMessageCount > 0) {
          const newCount = newMessages.length - prevMessageCount;
          const hasAdminReply = newMessages.slice(-newCount).some((msg: Message) => msg.is_admin_reply);
          
          if (hasAdminReply) {
            audioRef.current?.play().catch(() => {});
            
            toast({
              title: '💬 Новый ответ от поддержки',
              description: `Администратор ответил на ваше обращение`,
              duration: 5000
            });
          } else {
            toast({
              title: '💬 Новое сообщение',
              description: `Получено ${newCount} ${newCount === 1 ? 'новое сообщение' : 'новых сообщения'}`,
              duration: 5000
            });
          }
          
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        
        setMessages(newMessages);
        setPrevMessageCount(newMessages.length);
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось загрузить обращение', variant: 'destructive' });
        navigate('/support');
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить обращение', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 10 МБ', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
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

  const handleSendReply = async () => {
    if (!reply.trim() && !file) {
      toast({ title: 'Ошибка', description: 'Введите сообщение или прикрепите файл', variant: 'destructive' });
      return;
    }

    setSending(true);
    
    try {
      let fileUrl = '';
      if (file) {
        fileUrl = await uploadFile(file);
      }

      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=reply&ticket_id=${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ 
          message: reply,
          file_url: fileUrl 
        })
      });
      
      if (res.ok) {
        toast({ title: 'Успешно', description: 'Ответ отправлен' });
        setReply('');
        setFile(null);
        loadTicketDetails();
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось отправить ответ', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast({ title: 'Ошибка', description: 'Не удалось отправить ответ', variant: 'destructive' });
    } finally {
      setSending(false);
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

  if (!ticket) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate('/support')} variant="outline" className="mb-6">
            <Icon name="ArrowLeft" className="mr-2" />
            Назад к списку
          </Button>

          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                  <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1>
                <p className="text-muted-foreground">Сервер: {ticket.server}</p>
                <p className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleString('ru-RU')}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                    <div className={`inline-block max-w-[80%] p-4 rounded-lg ${
                      msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <p className="text-sm font-medium mb-1">
                        {msg.is_admin_reply ? (msg.admin_name || 'Администратор') : (msg.user_name || 'Вы')}
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
              <div ref={messagesEndRef} />
            </div>

            {ticket.status !== 'closed' && (
              <div className="border-t pt-6">
                <Label htmlFor="reply">Ваш ответ</Label>
                <Textarea
                  id="reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Введите ваш ответ..."
                  rows={4}
                  className="mb-4"
                />
                
                <div className="mb-4">
                  <Label htmlFor="replyFile">Прикрепить файл (необязательно)</Label>
                  <Input
                    id="replyFile"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.txt,.log,.pdf"
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Выбран: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                    </p>
                  )}
                </div>

                <Button onClick={handleSendReply} disabled={sending || (!reply.trim() && !file)}>
                  <Icon name="Send" className="mr-2" />
                  {sending ? 'Отправка...' : 'Отправить ответ'}
                </Button>
              </div>
            )}

            {ticket.status === 'closed' && (
              <div className="border-t pt-6">
                <p className="text-center text-muted-foreground">
                  Это обращение закрыто. Вы не можете отправлять новые сообщения.
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TicketDetails;