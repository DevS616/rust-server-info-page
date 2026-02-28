import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComplaintForm from '@/components/complaints/ComplaintForm';
import ComplaintsList from '@/components/complaints/ComplaintsList';

const COMPLAINTS_API = 'https://functions.poehali.dev/76a02e7f-8572-4035-9cd5-8533e8fb1c6d';
const STEAM_AUTH_URL = 'https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3';

interface Complaint {
  id: number;
  complaint_against: string;
  subject: string;
  reason: string;
  file_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Message {
  id: number;
  message: string;
  file_url: string;
  is_admin_reply: boolean;
  created_at: string;
  user_name?: string;
  admin_name?: string;
}

const Complaints = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem('support_token');

    if (urlToken) {
      localStorage.setItem('support_token', urlToken);
      setToken(urlToken);
      navigate('/complaints', { replace: true });
    } else if (storedToken) {
      setToken(storedToken);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (token) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=dashboard`, {
        headers: { 'X-Auth-Token': token! },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setIsBlocked(data.is_blocked || false);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить жалобы', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openComplaint = async (id: number) => {
    try {
      const res = await fetch(`${COMPLAINTS_API}/?complaint_id=${id}`, {
        headers: { 'X-Auth-Token': token! },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedComplaint(data.complaint);
        setMessages(data.messages || []);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить жалобу', variant: 'destructive' });
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedComplaint) return;
    setSending(true);

    let file_url = '';
    if (replyFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(replyFile);
      });
      try {
        const uploadRes = await fetch('https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
          body: JSON.stringify({ file: base64, filename: replyFile.name, content_type: replyFile.type }),
        });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          file_url = d.url || '';
        }
      } catch (e) {
        console.error('Upload failed', e);
      }
    }

    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=reply&complaint_id=${selectedComplaint.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token! },
        body: JSON.stringify({ message: reply.trim(), file_url }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReply('');
        setReplyFile(null);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleSteamLogin = () => {
    const baseUrl = window.location.origin;
    window.location.href = `${STEAM_AUTH_URL}/?base_url=${encodeURIComponent(baseUrl)}&redirect_path=/complaints`;
  };

  const handleLogout = () => {
    localStorage.removeItem('support_token');
    localStorage.removeItem('steam_user');
    setToken(null);
    setComplaints([]);
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
      case 'open': return 'Открыта';
      case 'closed': return 'Закрыта';
      case 'in_progress': return 'В работе';
      default: return status;
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="AlertTriangle" className="text-white" size={40} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Жалобы</h1>
              <p className="text-slate-400 mb-8">
                Авторизуйтесь через Steam, чтобы подать жалобу на нарушителя
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

  if (selectedComplaint) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => setSelectedComplaint(null)}
              variant="outline"
              className="mb-4 border-slate-700 text-white hover:bg-slate-800"
            >
              <Icon name="ArrowLeft" className="mr-2" size={16} />
              Назад к жалобам
            </Button>

            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={selectedComplaint.complaint_against === 'admin' ? 'Shield' : 'User'} className="text-white" size={18} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">{selectedComplaint.subject}</h2>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedComplaint.status)}`}>
                      {getStatusText(selectedComplaint.status)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs bg-slate-700 text-slate-300 border border-slate-600">
                      Жалоба на: {selectedComplaint.complaint_against === 'admin' ? 'Администратора' : 'Игрока'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                      <div className={`inline-block max-w-full md:max-w-[80%] p-4 rounded-lg ${
                        msg.is_admin_reply ? 'bg-red-600/20 border border-red-500/30' : 'bg-slate-800 border border-slate-700'
                      }`}>
                        <p className="text-xs font-medium mb-1 text-slate-400">
                          {msg.is_admin_reply ? msg.admin_name || 'Администратор' : msg.user_name || 'Вы'}
                        </p>
                        <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.message}</p>
                        {msg.file_url && (
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-400 underline mt-2 flex items-center gap-1"
                          >
                            <Icon name="Paperclip" size={12} />
                            Прикреплённый файл
                          </a>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(msg.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedComplaint.status !== 'closed' && (
                <div className="border-t border-slate-700 pt-4">
                  <Label className="text-slate-300 mb-2 block">Добавить сообщение</Label>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Введите сообщение..."
                    rows={3}
                    className="mb-2 bg-slate-800 border-slate-600 text-white"
                  />
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                      <Icon name="Paperclip" size={16} />
                      {replyFile ? replyFile.name : 'Прикрепить файл'}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => e.target.files && setReplyFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    {replyFile && (
                      <Button variant="ghost" size="sm" className="text-slate-500 h-6 px-2" onClick={() => setReplyFile(null)}>
                        <Icon name="X" size={12} />
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
                  >
                    {sending ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : <Icon name="Send" size={16} className="mr-2" />}
                    Отправить
                  </Button>
                </div>
              )}
            </Card>
          </div>
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
            <h1 className="text-4xl font-bold text-white">Жалобы</h1>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
          </div>

          {showForm ? (
            <ComplaintForm
              token={token}
              isBlocked={isBlocked}
              onCreated={() => {
                setShowForm(false);
                loadDashboard();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <ComplaintsList
              complaints={complaints}
              loading={loading}
              onNewComplaint={() => setShowForm(true)}
              onOpen={openComplaint}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Complaints;