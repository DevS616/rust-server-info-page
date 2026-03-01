import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComplaintForm from '@/components/complaints/ComplaintForm';

const COMPLAINTS_API = 'https://functions.poehali.dev/76a02e7f-8572-4035-9cd5-8533e8fb1c6d';
const STEAM_AUTH_URL = 'https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3';

interface Complaint {
  id: number;
  complaint_against: string;
  subject: string;
  reason: string;
  file_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  steam_username?: string;
  steam_avatar?: string;
  is_own?: boolean;
  user_id?: number;
}

interface Message {
  id: number;
  message: string;
  file_url: string | null;
  is_admin_reply: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  admin_name?: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  open:        { color: 'bg-green-500/20 text-green-400 border-green-500/30',    label: 'Открыта',   icon: 'CircleDot' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'В работе',  icon: 'Clock' },
  closed:      { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',    label: 'Закрыта',   icon: 'CheckCircle' },
};

const getStatus = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.closed;

/* ─── View: список жалоб ─── */
function ComplaintsList({
  complaints, isAdmin, onOpen, onNew,
}: {
  complaints: Complaint[];
  isAdmin: boolean;
  onOpen: (c: Complaint) => void;
  onNew: () => void;
}) {
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const visible = tab === 'mine' ? complaints.filter(c => c.is_own) : complaints;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Жалобы</h1>
          <p className="text-slate-400 text-sm mt-1">Публичные обращения игроков</p>
        </div>
        <Button
          onClick={onNew}
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Подать жалобу
        </Button>
      </div>

      {/* Табы */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Все жалобы <span className="ml-1 text-xs opacity-70">{complaints.length}</span>
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'mine' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Мои жалобы <span className="ml-1 text-xs opacity-70">{complaints.filter(c => c.is_own).length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center bg-slate-900 border-slate-700">
          <Icon name="Inbox" size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Жалоб пока нет</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(c => {
            const st = getStatus(c.status);
            return (
              <Card
                key={c.id}
                onClick={() => onOpen(c)}
                className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3">
                  {c.steam_avatar ? (
                    <img src={c.steam_avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon name="User" size={16} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium truncate">{c.subject}</span>
                      <span className="text-slate-500 text-xs flex-shrink-0">#{c.id}</span>
                      {c.is_own && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">Моя</span>
                      )}
                      {isAdmin && (
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">Адм.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{c.steam_username || 'Игрок'}</span>
                      <span>·</span>
                      <span>{c.complaint_against === 'admin' ? 'На администратора' : 'На игрока'}</span>
                      <span>·</span>
                      <span>{new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                      {c.message_count > 0 && (
                        <><span>·</span><span><Icon name="MessageCircle" size={12} className="inline mr-1" />{c.message_count}</span></>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── View: просмотр жалобы ─── */
function ComplaintDetail({
  complaint: initialComplaint,
  token,
  isAdmin,
  onBack,
  onClosed,
}: {
  complaint: Complaint;
  token: string;
  isAdmin: boolean;
  onBack: () => void;
  onClosed: (id: number) => void;
}) {
  const { toast } = useToast();
  const [complaint, setComplaint] = useState(initialComplaint);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  const canReply = (complaint.is_own || isAdmin) && complaint.status !== 'closed';
  const canClose = (complaint.is_own || isAdmin) && complaint.status !== 'closed';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${COMPLAINTS_API}/?complaint_id=${complaint.id}`, {
          headers: { 'X-Auth-Token': token },
        });
        if (res.ok) {
          const data = await res.json();
          setComplaint(data.complaint);
          setMessages(data.messages || []);
        }
      } catch { /* ignore */ }
      finally { setLoadingMsgs(false); }
    })();
  }, [complaint.id, token]);

  const handleClose = async () => {
    if (!window.confirm('Закрыть жалобу? Дальнейшие ответы будут недоступны.')) return;
    setClosing(true);
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=close&complaint_id=${complaint.id}`, {
        method: 'PUT',
        headers: { 'X-Auth-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        onClosed(complaint.id);
        toast({ title: 'Жалоба закрыта' });
      }
    } catch { /* ignore */ }
    finally { setClosing(false); }
  };

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);

    let file_url = '';
    if (replyFile) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(replyFile!);
        });
        const up = await fetch('https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
          body: JSON.stringify({ file: base64, filename: replyFile.name, content_type: replyFile.type }),
        });
        if (up.ok) { const d = await up.json(); file_url = d.url || ''; }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=reply&complaint_id=${complaint.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ message: reply.trim(), file_url }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setReply('');
        setReplyFile(null);
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error, variant: 'destructive' });
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const st = getStatus(complaint.status);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button onClick={onBack} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
        <Icon name="ArrowLeft" size={16} className="mr-2" />
        Назад к жалобам
      </Button>

      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name={complaint.complaint_against === 'admin' ? 'Shield' : 'User'} className="text-white" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{complaint.subject}</h2>
                <span className="text-slate-500 text-sm">#{complaint.id}</span>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${st.color}`}>{st.label}</span>
                <span className="px-3 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300 border border-slate-600">
                  На: {complaint.complaint_against === 'admin' ? 'Администратора' : 'Игрока'}
                </span>
                {complaint.steam_username && (
                  <span className="text-xs text-slate-500 self-center">от {complaint.steam_username}</span>
                )}
              </div>
            </div>
          </div>
          {canClose && (
            <Button
              onClick={handleClose}
              disabled={closing}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-400 flex-shrink-0"
            >
              {closing
                ? <Icon name="Loader2" size={14} className="mr-1 animate-spin" />
                : <Icon name="XCircle" size={14} className="mr-1" />
              }
              Закрыть тему
            </Button>
          )}
        </div>

        {/* Сообщения */}
        {loadingMsgs ? (
          <div className="flex justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                  msg.is_admin_reply ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-slate-700'
                }`}>
                  {!msg.is_admin_reply && msg.user_avatar
                    ? <img src={msg.user_avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <Icon name={msg.is_admin_reply ? 'Shield' : 'User'} size={14} className="text-white" />
                  }
                </div>
                <div className={`flex-1 max-w-[80%] ${msg.is_admin_reply ? 'items-end' : ''} flex flex-col`}>
                  <div className={`p-3 rounded-lg text-sm ${
                    msg.is_admin_reply
                      ? 'bg-gradient-to-br from-purple-900/60 to-blue-900/60 border border-purple-500/30 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold ${msg.is_admin_reply ? 'text-purple-300' : 'text-slate-400'}`}>
                        {msg.is_admin_reply ? (msg.admin_name || 'Администратор') : (msg.user_name || 'Игрок')}
                      </span>
                      {msg.is_admin_reply && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Администратор</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {msg.file_url.match(/\.(mp4|webm|mov|avi|mkv)$/i)
                          ? <video src={msg.file_url} controls className="max-w-xs rounded max-h-40" />
                          : <img src={msg.file_url} alt="Доказательство" className="max-w-xs rounded max-h-40 object-contain" loading="lazy" />
                        }
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Форма ответа */}
        {canReply ? (
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <Textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={isAdmin ? 'Ответ администратора...' : 'Ваш ответ...'}
              rows={3}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                <Icon name="Paperclip" size={16} />
                {replyFile ? replyFile.name : 'Прикрепить файл'}
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={e => setReplyFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {replyFile && (
                <button onClick={() => setReplyFile(null)} className="text-slate-500 hover:text-red-400 text-xs">✕ Убрать</button>
              )}
              <Button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                className={`ml-auto ${isAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                } text-white`}
              >
                {sending
                  ? <><Icon name="Loader2" size={14} className="mr-2 animate-spin" />Отправка...</>
                  : <><Icon name="Send" size={14} className="mr-2" />{isAdmin ? 'Ответить (Адм.)' : 'Ответить'}</>
                }
              </Button>
            </div>
          </div>
        ) : complaint.status === 'closed' ? (
          <div className="border-t border-slate-700 pt-4">
            <p className="text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Icon name="Lock" size={14} />
              Жалоба закрыта. Ответы недоступны.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/* ─── Главная страница ─── */
const Complaints = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const stored = localStorage.getItem('support_token');
    if (urlToken) {
      localStorage.setItem('support_token', urlToken);
      setToken(urlToken);
      navigate('/complaints', { replace: true });
    } else if (stored) {
      setToken(stored);
    } else {
      setLoading(false);
    }
  }, [searchParams, navigate]);

  const loadList = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [pubRes, dashRes] = await Promise.all([
        fetch(`${COMPLAINTS_API}/?action=public_list`, { headers: { 'X-Auth-Token': t } }),
        fetch(`${COMPLAINTS_API}/?action=dashboard`, { headers: { 'X-Auth-Token': t } }),
      ]);
      if (pubRes.ok) {
        const data = await pubRes.json();
        setComplaints(data.complaints || []);
        setIsAdmin(data.is_admin || false);
      }
      if (dashRes.ok) {
        const data = await dashRes.json();
        setIsBlocked(data.is_blocked || false);
        setIsAdmin(prev => prev || data.is_admin || false);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить жалобы', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (token) loadList(token);
  }, [token, loadList]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('support_token');
    localStorage.removeItem('steam_user');
    setToken(null);
    setComplaints([]);
  }, []);

  const handleLogin = useCallback(() => {
    window.location.href = `${STEAM_AUTH_URL}/?base_url=${encodeURIComponent(window.location.origin)}&redirect_path=/complaints`;
  }, []);

  const handleClosed = useCallback((id: number) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'closed' } : c));
    if (selectedComplaint?.id === id) {
      setSelectedComplaint(prev => prev ? { ...prev, status: 'closed' } : prev);
    }
  }, [selectedComplaint]);

  // Не авторизован
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
              <p className="text-slate-400 mb-8">Авторизуйтесь через Steam, чтобы просматривать и подавать жалобы</p>
              <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg">
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
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Icon name="Loader2" size={32} className="animate-spin text-slate-500" />
          </div>
        ) : showForm ? (
          <div className="max-w-4xl mx-auto">
            <ComplaintForm
              token={token}
              isBlocked={isBlocked}
              onCreated={() => { setShowForm(false); loadList(token); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : selectedComplaint ? (
          <ComplaintDetail
            complaint={selectedComplaint}
            token={token}
            isAdmin={isAdmin}
            onBack={() => setSelectedComplaint(null)}
            onClosed={handleClosed}
          />
        ) : (
          <>
            <div className="flex justify-end mb-4 max-w-4xl mx-auto">
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-500 hover:text-white">
                <Icon name="LogOut" size={14} className="mr-1" />
                Выйти
              </Button>
            </div>
            <ComplaintsList
              complaints={complaints}
              isAdmin={isAdmin}
              onOpen={setSelectedComplaint}
              onNew={() => setShowForm(true)}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Complaints;
