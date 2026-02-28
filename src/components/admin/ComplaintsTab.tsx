import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

const COMPLAINTS_API = 'https://functions.poehali.dev/76a02e7f-8572-4035-9cd5-8533e8fb1c6d';
const UPLOAD_API = 'https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5';

interface Complaint {
  id: number;
  user_id: number;
  complaint_against: string;
  subject: string;
  reason: string;
  file_url: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
  steam_id: string;
  user_is_blocked: boolean;
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

interface ComplaintsTabProps {
  token: string;
}

const ComplaintsTab = ({ token }: ComplaintsTabProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgainst, setFilterAgainst] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=list`, {
        headers: { 'X-Auth-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const openComplaint = async (c: Complaint) => {
    const res = await fetch(`${COMPLAINTS_API}/?complaint_id=${c.id}`, {
      headers: { 'X-Auth-Token': token },
    });
    if (res.ok) {
      const data = await res.json();
      setSelected(data.complaint);
      setMessages(data.messages || []);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);

    let file_url = '';
    if (replyFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(replyFile);
      });
      try {
        const uploadRes = await fetch(UPLOAD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
          body: JSON.stringify({ file: base64, filename: replyFile.name, content_type: replyFile.type }),
        });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          file_url = d.url || '';
        }
      } catch (e) {
        console.error('Upload error', e);
      }
    }

    const res = await fetch(`${COMPLAINTS_API}/?action=reply&complaint_id=${selected.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ message: reply.trim(), file_url }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setReply('');
      setReplyFile(null);
    }
    setSending(false);
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    const res = await fetch(`${COMPLAINTS_API}/?action=status&complaint_id=${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelected(data.complaint);
      setComplaints((prev) => prev.map((c) => c.id === data.complaint.id ? { ...c, status: data.complaint.status } : c));
    }
  };

  const deleteComplaint = async () => {
    if (!selected || !confirm(`Удалить жалобу #${selected.id}? Это действие необратимо.`)) return;
    const res = await fetch(`${COMPLAINTS_API}/?complaint_id=${selected.id}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': token },
    });
    if (res.ok) {
      setComplaints((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
    }
  };

  const toggleBlockUser = async () => {
    if (!selected) return;
    const block = !selected.user_is_blocked;
    const action = block ? 'заблокировать' : 'разблокировать';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} пользователя ${selected.steam_username}?`)) return;
    const res = await fetch(`${COMPLAINTS_API}/?action=block_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ user_id: selected.user_id, block }),
    });
    if (res.ok) {
      setSelected((prev) => prev ? { ...prev, user_is_blocked: block } : prev);
      setComplaints((prev) => prev.map((c) => c.user_id === selected.user_id ? { ...c, user_is_blocked: block } : c));
    }
  };

  const copyId = (id: number) => {
    navigator.clipboard.writeText(String(id));
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

  const filteredComplaints = complaints.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterAgainst !== 'all' && c.complaint_against !== filterAgainst) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = String(c.id).includes(q);
      const matchSubject = c.subject.toLowerCase().includes(q);
      const matchNick = c.steam_username?.toLowerCase().includes(q);
      const matchSteamId = c.steam_id?.includes(q);
      if (!matchId && !matchSubject && !matchNick && !matchSteamId) return false;
    }
    return true;
  });

  if (!loaded) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Нажмите кнопку для загрузки жалоб</p>
        <Button onClick={load} disabled={loading}>
          {loading ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : <Icon name="RefreshCw" size={16} className="mr-2" />}
          Загрузить жалобы
        </Button>
      </div>
    );
  }

  if (selected) {
    return (
      <div>
        <Button onClick={() => setSelected(null)} variant="outline" className="mb-4">
          <Icon name="ArrowLeft" className="mr-2" size={16} />
          Назад к списку
        </Button>

        <Card className="p-4 md:p-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-start gap-3">
              {selected.steam_avatar ? (
                <img src={selected.steam_avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-lg md:text-xl font-semibold break-words">{selected.subject}</h2>
                  <button
                    onClick={() => copyId(selected.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Скопировать ID"
                  >
                    #{selected.id}
                    <Icon name="Copy" size={10} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">от {selected.steam_username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs text-muted-foreground break-all">Steam64ID: {selected.steam_id}</p>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                    onClick={() => navigator.clipboard.writeText(selected.steam_id)}>
                    <Icon name="Copy" size={12} />
                  </Button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(selected.status)}`}>
                    {getStatusText(selected.status)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border">
                    Жалоба на: {selected.complaint_against === 'admin' ? 'Администратора' : 'Игрока'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Select value={selected.status} onValueChange={changeStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Открыта</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="closed">Закрыта</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleBlockUser}
                className={selected.user_is_blocked ? 'border-green-500 text-green-600 hover:bg-green-50' : 'border-orange-500 text-orange-600 hover:bg-orange-50'}
              >
                <Icon name={selected.user_is_blocked ? 'ShieldCheck' : 'ShieldOff'} size={14} className="mr-1" />
                {selected.user_is_blocked ? 'Разблокировать' : 'Заблокировать'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteComplaint}
                className="border-red-500 text-red-600 hover:bg-red-50 ml-auto"
              >
                <Icon name="Trash2" size={14} className="mr-1" />
                Удалить жалобу
              </Button>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4 mb-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-full md:max-w-[80%] p-3 md:p-4 rounded-lg ${
                    msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <p className="text-xs md:text-sm font-medium mb-1">
                      {msg.is_admin_reply ? msg.admin_name || 'Администратор' : msg.user_name}
                    </p>
                    <p className="text-sm md:text-base whitespace-pre-wrap break-words">{msg.message}</p>
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline mt-2 flex items-center gap-1">
                        <Icon name="Paperclip" size={12} />
                        Прикреплённый файл
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
            <div className="mb-3">
              <label htmlFor="reply-file" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <Icon name="Paperclip" size={16} />
                <span>{replyFile ? replyFile.name : 'Прикрепить файл'}</span>
              </label>
              <Input
                id="reply-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => e.target.files && setReplyFile(e.target.files[0])}
                className="hidden"
              />
              {replyFile && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setReplyFile(null)}>
                  <Icon name="X" size={12} className="mr-1" /> Убрать
                </Button>
              )}
            </div>
            <Button onClick={sendReply} disabled={!reply.trim() || sending}>
              {sending ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : <Icon name="Send" size={16} className="mr-2" />}
              Отправить
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input
          placeholder="Поиск по ID, теме, нику, Steam ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-72"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="open">Открытые</SelectItem>
            <SelectItem value="in_progress">В работе</SelectItem>
            <SelectItem value="closed">Закрытые</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAgainst} onValueChange={setFilterAgainst}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Тип жалобы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все жалобы</SelectItem>
            <SelectItem value="admin">На администратора</SelectItem>
            <SelectItem value="player">На игрока</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={load} variant="outline" size="sm">
          <Icon name="RefreshCw" size={14} className="mr-1" />
          Обновить
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          Всего: {filteredComplaints.length}
        </span>
      </div>

      {filteredComplaints.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="AlertTriangle" size={32} className="mx-auto mb-3 opacity-30" />
          <p>Жалоб не найдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((c) => (
            <Card
              key={c.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openComplaint(c)}
            >
              <div className="flex items-start gap-3">
                {c.steam_avatar ? (
                  <img src={c.steam_avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={16} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(c.status)}`}>
                      {getStatusText(c.status)}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                      {c.complaint_against === 'admin' ? 'На администратора' : 'На игрока'}
                    </span>
                    {c.message_count > 1 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="MessageSquare" size={12} />
                        {c.message_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{c.subject}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyId(c.id); }}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      title="Скопировать ID"
                    >
                      #{c.id}
                      <Icon name="Copy" size={10} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.steam_username} · {new Date(c.created_at).toLocaleString('ru-RU')}</p>
                  {c.steam_id && (
                    <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground">Steam ID: {c.steam_id}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.steam_id); }}
                      >
                        <Icon name="Copy" size={10} />
                      </Button>
                    </div>
                  )}
                </div>
                <Icon name="ChevronRight" size={18} className="text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplaintsTab;