import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

const COMPLAINTS_API = 'https://functions.poehali.dev/76a02e7f-8572-4035-9cd5-8533e8fb1c6d';
const UPLOAD_API = 'https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5';

interface AdminEntry {
  id: number;
  full_name: string;
  email: string;
  role: string;
  steam_id: string;
  complaint_access: boolean;
}

interface Complaint {
  id: number;
  user_id: number;
  complaint_against: string;
  complaint_type?: string;
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

/* ─── Секция управления доступом к жалобам ─── */
function AdminAccessSection({ token }: { token: string }) {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=list_admins`, {
        headers: { 'X-Auth-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (adminId: number, currentAccess: boolean) => {
    setSaving(adminId);
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=set_complaint_access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ admin_id: adminId, access: !currentAccess }),
      });
      if (res.ok) {
        setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, complaint_access: !currentAccess } : a));
      }
    } finally {
      setSaving(null);
    }
  };

  if (!loaded) {
    return (
      <Card className="p-4 mb-6 border-purple-500/30 bg-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="ShieldCheck" size={18} className="text-purple-400" />
            <span className="font-semibold text-sm">Доступ администраторов к жалобам</span>
          </div>
          <Button onClick={load} disabled={loading} variant="outline" size="sm" className="border-purple-500/30 text-purple-400">
            {loading ? <Icon name="Loader2" size={14} className="mr-1 animate-spin" /> : <Icon name="Users" size={14} className="mr-1" />}
            Управлять доступом
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6 border-purple-500/30 bg-purple-500/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon name="ShieldCheck" size={18} className="text-purple-400" />
          <span className="font-semibold">Доступ администраторов к жалобам</span>
        </div>
        <Button onClick={() => setLoaded(false)} variant="ghost" size="sm" className="text-muted-foreground">
          <Icon name="X" size={14} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Администраторы с доступом смогут отвечать, менять статусы и закрывать жалобы игроков.
      </p>
      <div className="space-y-2">
        {admins.map(a => (
          <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 border border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.full_name || a.email}</span>
                {a.role === 'superadmin' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Суперадмин</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{a.email}</p>
            </div>
            {a.role === 'superadmin' ? (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Icon name="Check" size={12} />
                Всегда есть
              </span>
            ) : (
              <button
                onClick={() => toggleAccess(a.id, a.complaint_access)}
                disabled={saving === a.id}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  a.complaint_access ? 'bg-purple-600' : 'bg-slate-600'
                } ${saving === a.id ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  a.complaint_access ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">Администраторов не найдено</p>
        )}
      </div>
    </Card>
  );
}

/* ─── Основной компонент ─── */
const ComplaintsTab = ({ token }: ComplaintsTabProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAgainst, setFilterAgainst] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, pubRes] = await Promise.all([
        fetch(`${COMPLAINTS_API}/?action=list`, { headers: { 'X-Auth-Token': token } }),
        fetch(`${COMPLAINTS_API}/?action=public_list`, { headers: { 'X-Auth-Token': token } }),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setComplaints(data.complaints || []);
        setLoaded(true);
      }
      if (pubRes.ok) {
        const data = await pubRes.json();
        setIsSuperadmin(data.is_superadmin || false);
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
      } catch { /* ignore */ }
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
    if (!selected || !confirm(`Удалить #${selected.id}? Это действие необратимо.`)) return;
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
    if (!confirm(`${block ? 'Заблокировать' : 'Разблокировать'} пользователя ${selected.steam_username}?`)) return;
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

  const copyId = (id: number) => navigator.clipboard.writeText(String(id));

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

  const getTypeLabel = (type?: string) => type === 'appeal' ? 'Апелляция' : 'Жалоба';
  const getTypeColor = (type?: string) => type === 'appeal'
    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

  const filteredComplaints = complaints.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterAgainst !== 'all' && c.complaint_against !== filterAgainst) return false;
    if (filterType !== 'all' && (c.complaint_type || 'complaint') !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!String(c.id).includes(q) && !c.subject.toLowerCase().includes(q) &&
          !c.steam_username?.toLowerCase().includes(q) && !c.steam_id?.includes(q)) return false;
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
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg md:text-xl font-semibold break-words">{selected.subject}</h2>
                  <button onClick={() => copyId(selected.id)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                    #{selected.id} <Icon name="Copy" size={10} />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(selected.status)}`}>{getStatusText(selected.status)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${getTypeColor(selected.complaint_type)}`}>{getTypeLabel(selected.complaint_type)}</span>
                  <span className="text-xs text-muted-foreground self-center">{selected.steam_username}</span>
                  {selected.steam_id && <span className="text-xs text-muted-foreground self-center">• {selected.steam_id}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={selected.status} onValueChange={changeStatus}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Открыта</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="closed">Закрыта</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={toggleBlockUser}
                variant={selected.user_is_blocked ? 'outline' : 'destructive'}
                size="sm"
                className="h-8 text-xs"
              >
                <Icon name={selected.user_is_blocked ? 'UserCheck' : 'UserX'} size={13} className="mr-1" />
                {selected.user_is_blocked ? 'Разблокировать' : 'Заблокировать'}
              </Button>
              <Button onClick={deleteComplaint} variant="outline" size="sm" className="h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10">
                <Icon name="Trash2" size={13} className="mr-1" />
                Удалить
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.is_admin_reply ? 'bg-purple-600' : 'bg-muted'
                }`}>
                  <Icon name={msg.is_admin_reply ? 'Shield' : 'User'} size={12} className="text-white" />
                </div>
                <div className={`flex-1 max-w-[80%] flex flex-col ${msg.is_admin_reply ? 'items-end' : ''}`}>
                  <div className={`p-3 rounded-lg text-sm ${
                    msg.is_admin_reply
                      ? 'bg-purple-900/40 border border-purple-500/30 text-white'
                      : 'bg-muted border border-border'
                  }`}>
                    <p className="text-xs font-semibold mb-1 opacity-70">
                      {msg.is_admin_reply ? (msg.admin_name || 'Администратор') : (msg.user_name || 'Игрок')}
                      {msg.is_admin_reply && <span className="ml-1 text-purple-400">(Адм.)</span>}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {msg.file_url.match(/\.(mp4|webm|mov)$/i)
                          ? <video src={msg.file_url} controls className="max-w-xs rounded max-h-40" />
                          : <img src={msg.file_url} alt="" className="max-w-xs rounded max-h-40 object-contain" />
                        }
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString('ru-RU')}</span>
                </div>
              </div>
            ))}
          </div>

          {selected.status !== 'closed' && (
            <div className="border-t pt-4 space-y-3">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Ответ администратора..."
                rows={3}
                className="text-sm"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  <Icon name="Paperclip" size={14} />
                  {replyFile ? replyFile.name : 'Прикрепить'}
                  <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden"
                    onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)} />
                </label>
                {replyFile && (
                  <button onClick={() => setReplyFile(null)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
                )}
                <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm" className="ml-auto bg-purple-600 hover:bg-purple-700 text-white">
                  {sending ? <Icon name="Loader2" size={14} className="mr-1 animate-spin" /> : <Icon name="Send" size={14} className="mr-1" />}
                  Ответить
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      {isSuperadmin && <AdminAccessSection token={token} />}

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input
          placeholder="Поиск по ID, теме, нику, Steam ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="complaint">Жалобы</SelectItem>
            <SelectItem value="appeal">Апелляции</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectValue placeholder="На кого" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="admin">На администратора</SelectItem>
            <SelectItem value="player">На игрока</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={load} variant="outline" size="sm">
          <Icon name="RefreshCw" size={14} className="mr-1" />
          Обновить
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">Всего: {filteredComplaints.length}</span>
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
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getTypeColor(c.complaint_type)}`}>
                      {getTypeLabel(c.complaint_type)}
                    </span>
                    {c.complaint_type !== 'appeal' && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                        {c.complaint_against === 'admin' ? 'На администратора' : 'На игрока'}
                      </span>
                    )}
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
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      #{c.id} <Icon name="Copy" size={10} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.steam_username} · {new Date(c.created_at).toLocaleString('ru-RU')}</p>
                  {c.steam_id && (
                    <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground">Steam ID: {c.steam_id}</p>
                      <button className="opacity-50 hover:opacity-100" onClick={() => navigator.clipboard.writeText(c.steam_id)}>
                        <Icon name="Copy" size={10} />
                      </button>
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
