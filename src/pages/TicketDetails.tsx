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
import RatingModal from '@/components/support/RatingModal';


const API_BASE = 'https://functions.poehali.dev';

interface Message {
  id: number;
  user_id?: number;
  admin_id?: number;
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
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

function parseJwtUserId(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id ? Number(payload.user_id) : null;
  } catch { return null; }
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('support_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      if (ticketId) {
        localStorage.setItem('redirect_to_ticket', ticketId);
      }
      navigate('/support');
    }
    
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    audioRef.current = {
      play: () => {
        try {
          const audioContext = new AudioCtx();
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
    } as HTMLAudioElement;
  }, [navigate]);

  useEffect(() => {
    if (token && ticketId) {
      loadTicketDetails();
    }
  }, [token, ticketId]);

  const loadTicketDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?ticket_id=${ticketId}`, {
        headers: { 'X-Auth-Token': token! }
      });
      
      if (res.ok) {
        const data = await res.json();
        const ticketData = data.ticket;
        setTicket(ticketData);
        
        const newMessages = data.messages || [];
        const hasLiveAdminReply = newMessages.some(
          (msg: Message) => msg.is_admin_reply && msg.admin_name
        );
        if (ticketData.status === 'closed' && !ticketData.rating && prevMessageCount > 0 && hasLiveAdminReply) {
          setShowRatingModal(true);
        }
        
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

  const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','image/bmp','video/mp4','video/webm','video/mov','video/avi','video/mkv','video/quicktime'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        toast({ title: 'Ошибка', description: 'Допустимы только фото (JPG, PNG, GIF, WEBP) и видео (MP4, MOV, AVI, MKV)', variant: 'destructive' });
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 100 МБ', variant: 'destructive' });
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
        // Инвалидируем кэш и перезагружаем
        apiCache.invalidate(`ticket_${ticketId}`);
        loadTicketDetails(false);
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

  const handleCloseTicket = async () => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=status&ticket_id=${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
        body: JSON.stringify({ status: 'closed' })
      });
      if (res.ok) {
        toast({ title: 'Обращение закрыто', description: 'Спасибо, что обратились в поддержку!' });
        loadTicketDetails();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось закрыть обращение', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось закрыть обращение', variant: 'destructive' });
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=rate&ticket_id=${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({ rating, comment })
      });
      
      if (res.ok) {
        toast({ title: 'Спасибо!', description: 'Ваша оценка отправлена' });
        loadTicketDetails();
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось отправить оценку', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Rating error:', error);
      toast({ title: 'Ошибка', description: 'Не удалось отправить оценку', variant: 'destructive' });
    }
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editingText.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=edit_message&ticket_id=${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
        body: JSON.stringify({ message_id: messageId, message: editingText })
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: editingText } : m));
        setEditingMsgId(null);
        toast({ title: 'Сообщение обновлено' });
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
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
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={() => navigate('/support')} variant="outline">
              <Icon name="ArrowLeft" className="mr-2" />
              Назад к списку
            </Button>
            <Button onClick={() => loadTicketDetails()} variant="outline" disabled={loading}>
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>

          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                  <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                </div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold">{ticket.subject}</h1>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(ticket.id))}
                    className="flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
                    title="Скопировать ID"
                  >
                    #{ticket.id}
                    <Icon name="Copy" size={14} />
                  </button>
                </div>
                <p className="text-muted-foreground">Сервер: {ticket.server}</p>
                <p className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => {
                const isAutoReply = msg.is_admin_reply && !msg.admin_name;
                if (isAutoReply) {
                  // Парсим время ответа из текста: "Примерное время ответа на обращения: X."
                  const timeMatch = msg.message.match(/Примерное время ответа на обращения:\s*(.+?)\./);
                  const timeValue = timeMatch ? timeMatch[1].trim() : null;
                  // Определяем цвет по тексту
                  let timeColor = 'text-muted-foreground';
                  if (timeValue) {
                    const hoursMatch = timeValue.match(/около\s+(\d+)\s+час/);
                    const minsMatch = /менее\s+1\s+часа/.test(timeValue);
                    const daysMatch = timeValue.match(/около\s+(\d+)\s+дн/);
                    if (minsMatch) timeColor = 'text-green-500';
                    else if (hoursMatch) {
                      const h = parseInt(hoursMatch[1]);
                      timeColor = h < 8 ? 'text-orange-400' : 'text-red-500';
                    } else if (daysMatch) timeColor = 'text-red-500';
                  }
                  // Разбиваем текст на части до и после строки со временем
                  const lines = msg.message.split('\n\n');
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="w-full max-w-[90%] rounded-xl border border-dashed border-muted-foreground/30 bg-muted/40 px-5 py-4">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                          <Icon name="Bot" size={15} />
                          <span className="text-xs font-semibold uppercase tracking-wide">Системное сообщение</span>
                        </div>
                        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                          {lines.map((line, i) => {
                            const isTimeLine = line.startsWith('Примерное время ответа');
                            if (isTimeLine && timeValue) {
                              const prefix = 'Примерное время ответа на обращения: ';
                              return (
                                <p key={i}>
                                  {prefix}<span className={`font-semibold ${timeColor}`}>{timeValue}</span>.
                                </p>
                              );
                            }
                            return <p key={i} className="whitespace-pre-wrap">{line}</p>;
                          })}
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          {ticket.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-fit"
                              onClick={handleCloseTicket}
                            >
                              <Icon name="XCircle" size={15} className="mr-2" />
                              Закрыть обращение
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                            <Icon name="Clock" size={12} />
                            Время работы поддержки: 09:00 – 23:00 МСК
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground/50 mt-2">
                          {new Date(msg.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                        </p>
                      </div>
                    </div>
                  );
                }
                const currentUserId = parseJwtUserId(token);
                const canEdit = ticket.status !== 'closed' && !msg.is_admin_reply && currentUserId !== null && Number(msg.user_id) === currentUserId;
                const isEditing = editingMsgId === msg.id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                      <div className={`group/msg inline-block max-w-[80%] p-4 rounded-lg ${
                        msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <p className="text-sm font-medium mb-1">
                          {msg.is_admin_reply ? (msg.admin_name || 'Администратор') : (msg.user_name || 'Вы')}
                        </p>
                        {isEditing ? (
                          <div className="space-y-2 mt-1">
                            <Textarea
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              rows={3}
                              className="text-sm bg-background text-foreground"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(msg.id)} disabled={savingEdit}>
                                {savingEdit ? <Icon name="Loader2" size={13} className="animate-spin mr-1" /> : <Icon name="Check" size={13} className="mr-1" />}
                                Сохранить
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingMsgId(null)}>Отмена</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        )}
                        {msg.file_url && !isEditing && (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                            {msg.file_url.match(/\.(mp4|webm|mov|avi|mkv)$/i)
                              ? <video src={msg.file_url} controls className="w-full rounded max-h-48" style={{maxWidth: '100%'}} />
                              : msg.file_url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
                                ? <img src={msg.file_url} alt="Прикреплённый файл" className="w-full rounded max-h-64 object-contain" style={{maxWidth: '100%'}} loading="lazy" />
                                : <span className="text-sm underline">📎 Прикреплённый файл</span>
                            }
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                          </p>
                          {canEdit && !isEditing && (
                            <button
                              onClick={() => { setEditingMsgId(msg.id); setEditingText(msg.message); }}
                              className="text-xs opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Icon name="Pencil" size={11} />
                              Изменить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <Label htmlFor="replyFile" className="mb-3 block">Прикрепить файл (необязательно)</Label>
                  <input
                    id="replyFile"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/avi,video/x-matroska"
                    className="hidden"
                  />
                  <label 
                    htmlFor="replyFile"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 rounded-md cursor-pointer transition-all"
                  >
                    <Icon name="Paperclip" size={18} />
                    <span>{file ? 'Изменить файл' : 'Выбрать файл'}</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Фото: JPG, PNG, GIF, WEBP · Видео: MP4, MOV, AVI, MKV · Макс. 100 МБ
                  </p>
                  {file && (
                    <div className="mt-3 p-3 bg-muted border border-border rounded-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="File" size={16} className="text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} МБ)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <Button onClick={handleSendReply} disabled={sending || (!reply.trim() && !file)}>
                  <Icon name="Send" className="mr-2" />
                  {sending ? 'Отправка...' : 'Отправить ответ'}
                </Button>
              </div>
            )}

            {ticket.status === 'closed' && (
              <div className="border-t pt-6 space-y-4">
                <p className="text-center text-muted-foreground">
                  Это обращение закрыто. Вы не можете отправлять новые сообщения.
                </p>
                
                {ticket.rating ? (
                  <div className="bg-slate-900 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-400 mb-2">Ваша оценка:</p>
                    <div className="flex justify-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon 
                          key={star}
                          name="Star" 
                          size={20}
                          className={star <= ticket.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'}
                        />
                      ))}
                    </div>
                    {ticket.rating_comment && (
                      <p className="text-sm text-slate-300 mt-2">"{ticket.rating_comment}"</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      Оценено {new Date(ticket.rated_at!).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setShowRatingModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <Icon name="Star" size={16} className="mr-2" />
                    Оценить качество поддержки
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
      
      {ticket && (
        <RatingModal 
          open={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
          ticketSubject={ticket.subject}
        />
      )}
    </div>
  );
};

export default TicketDetails;