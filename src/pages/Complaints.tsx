import { useState, useEffect, useCallback, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  complaint_type?: string;
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
  closed_by_steam_id?: string | null;
  rating?: number | null;
  rating_comment?: string | null;
  rated_at?: string | null;
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
  mod_rating?: number | null;
  mod_rating_count?: number | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open:        { color: 'bg-green-500/20 text-green-400 border-green-500/30',    label: 'Открыта' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'В работе' },
  closed:      { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',    label: 'Закрыта' },
};

const getStatus = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.closed;

const TYPE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  complaint: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   label: 'Жалоба',     icon: 'AlertTriangle' },
  appeal:    { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Апелляция', icon: 'Scale' },
};

const getType = (t?: string) => TYPE_CONFIG[t || 'complaint'] ?? TYPE_CONFIG.complaint;

const RATING_LABELS: Record<number, string> = { 1: 'Очень плохо', 2: 'Плохо', 3: 'Удовлетворительно', 4: 'Хорошо', 5: 'Отлично' };

/* ─── Модалка оценки ─── */
const RatingModal = memo(({ open, onClose, onSubmit, subject }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  subject: string;
}) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try { await onSubmit(rating, comment); onClose(); }
    finally { setSubmitting(false); }
  };

  const handleClose = () => {
    if (!submitting) { setRating(0); setHovered(0); setComment(''); onClose(); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Оцените качество ответа</DialogTitle>
          <DialogDescription className="text-slate-400">{subject}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-3">Насколько вы довольны решением вашего обращения?</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110" disabled={submitting}>
                  <Icon name="Star" size={40}
                    className={star <= (hovered || rating) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} />
                </button>
              ))}
            </div>
            {rating > 0 && <p className="text-sm text-slate-400 mt-2">{RATING_LABELS[rating]}</p>}
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-2">Комментарий (необязательно)</p>
            <Textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Расскажите подробнее о вашем опыте..."
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]" disabled={submitting} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleClose} variant="outline"
              className="flex-1 border-slate-700 text-white hover:bg-slate-800" disabled={submitting}>
              Пропустить
            </Button>
            <Button onClick={handleSubmit} disabled={!rating || submitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
              {submitting
                ? <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Отправка...</>
                : <><Icon name="Check" size={16} className="mr-2" />Отправить оценку</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

/* ─── Звёзды (отображение) ─── */
const StarDisplay = ({ rating, count }: { rating: number; count: number }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Icon key={s} name="Star" size={12}
          className={s <= Math.round(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} />
      ))}
    </div>
    <span className="text-xs text-slate-400">{rating.toFixed(1)} ({count})</span>
  </div>
);

/* ─── Форма апелляции ─── */
const AppealForm = memo(({ token, onCreated, onCancel }: {
  token: string;
  onCreated: () => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !reason.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }
    setUploading(true);
    let file_url = '';

    if (file) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file!);
        });
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: 'Ошибка', description: 'Файл не должен превышать 20 МБ', variant: 'destructive' });
          setUploading(false);
          return;
        }
        const up = await fetch('https://functions.poehali.dev/b36ed6dc-c690-4e62-b1e9-e3dd1b1d15c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
          body: JSON.stringify({ file: base64, filename: file.name, content_type: file.type }),
        });
        if (up.ok) { const d = await up.json(); file_url = d.url || ''; }
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ complaint_type: 'appeal', complaint_against: 'player', subject: subject.trim(), reason: reason.trim(), file_url }),
      });
      if (res.ok) {
        toast({ title: 'Апелляция подана', description: 'Администраторы рассмотрят ваше обращение' });
        onCreated();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось подать апелляцию', variant: 'destructive' });
      }
    } catch { /* ignore */ }
    finally { setUploading(false); }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-orange-500/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
          <Icon name="Scale" className="text-white" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Оспорить блокировку</h2>
          <p className="text-slate-400 text-sm">Апелляция к администрации сервера</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-slate-300 text-sm mb-2 block">Тема апелляции *</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Кратко: за что заблокировали и почему считаете это ошибкой"
            maxLength={200}
            className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
        <div>
          <label className="text-slate-300 text-sm mb-2 block">Описание ситуации *</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Опишите подробно: когда и за что получили бан, ваш Steam ID, ник, доказательства невиновности..."
            rows={5}
            maxLength={2000}
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 mt-1">{reason.length}/2000</p>
        </div>
        <div>
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
            <Icon name="Paperclip" size={18} className="text-slate-400" />
            <span className="text-slate-400 text-sm">{file ? file.name : 'Прикрепить доказательство (фото/видео)'}</span>
            <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={uploading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white">
            {uploading
              ? <><Icon name="Loader2" size={16} className="mr-2 animate-spin" />Отправка...</>
              : <><Icon name="Send" size={16} className="mr-2" />Подать апелляцию</>
            }
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300">Отмена</Button>
        </div>
      </form>
    </Card>
  );
});

/* ─── View: список жалоб ─── */
const ComplaintsList = memo(({
  complaints, isAdmin, onOpen, onNew, onAppeal,
}: {
  complaints: Complaint[];
  isAdmin: boolean;
  onOpen: (c: Complaint) => void;
  onNew: () => void;
  onAppeal: () => void;
}) => {
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const visible = tab === 'mine' ? complaints.filter(c => c.is_own) : complaints;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Жалобы и апелляции</h1>
          <p className="text-slate-400 text-sm mt-1">Публичные обращения игроков</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onAppeal}
            variant="outline"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400"
          >
            <Icon name="Scale" size={16} className="mr-2" />
            Оспорить блокировку
          </Button>
          <Button
            onClick={onNew}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Подать жалобу
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Все <span className="ml-1 text-xs opacity-70">{complaints.length}</span>
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'mine' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Мои <span className="ml-1 text-xs opacity-70">{complaints.filter(c => c.is_own).length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center bg-slate-900 border-slate-700">
          <Icon name="Inbox" size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Обращений пока нет</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(c => {
            const st = getStatus(c.status);
            const tp = getType(c.complaint_type);
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
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{c.steam_username || 'Игрок'}</span>
                      <span>·</span>
                      {c.complaint_type === 'appeal'
                        ? <span>Апелляция</span>
                        : <span>{c.complaint_against === 'admin' ? 'На администратора' : 'На игрока'}</span>
                      }
                      <span>·</span>
                      <span>{new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                      {c.message_count > 0 && (
                        <><span>·</span><span><Icon name="MessageCircle" size={12} className="inline mr-1" />{c.message_count}</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${tp.color}`}>{tp.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${st.color}`}>{st.label}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
});

/* ─── View: просмотр жалобы ─── */
const ComplaintDetail = memo(({
  complaint: initialComplaint, token, isAdmin, onBack, onClosed,
}: {
  complaint: Complaint;
  token: string;
  isAdmin: boolean;
  onBack: () => void;
  onClosed: (id: number) => void;
}) => {
  const { toast } = useToast();
  const [complaint, setComplaint] = useState(initialComplaint);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [showRating, setShowRating] = useState(false);

  const canReply = (complaint.is_own || isAdmin) && complaint.status !== 'closed';
  const canClose = (complaint.is_own || isAdmin) && complaint.status !== 'closed';
  const tp = getType(complaint.complaint_type);
  // Показываем промпт если: автор, закрыта модератором (есть closed_by_steam_id), ещё не оценена
  const showRatingPrompt = complaint.is_own && complaint.status === 'closed'
    && !!complaint.closed_by_steam_id && !complaint.rating && !showRating;

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
    if (!window.confirm('Закрыть обращение? Дальнейшие ответы будут недоступны.')) return;
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
        toast({ title: 'Обращение закрыто' });
      }
    } catch { /* ignore */ }
    finally { setClosing(false); }
  };

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);

    let file_url = '';
    if (replyFile) {
      if (replyFile.size > 20 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Файл не должен превышать 20 МБ', variant: 'destructive' });
        setSending(false);
        return;
      }
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

  const handleRate = async (rating: number, comment: string) => {
    try {
      const res = await fetch(`${COMPLAINTS_API}/?action=rate&complaint_id=${complaint.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        toast({ title: 'Спасибо! Ваша оценка отправлена' });
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <RatingModal
        open={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleRate}
        subject={complaint.subject}
      />
      <Button onClick={onBack} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
        <Icon name="ArrowLeft" size={16} className="mr-2" />
        Назад
      </Button>

      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              complaint.complaint_type === 'appeal'
                ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
                : 'bg-gradient-to-br from-red-600 to-orange-500'
            }`}>
              <Icon name={tp.icon as Parameters<typeof Icon>[0]['name']} className="text-white" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{complaint.subject}</h2>
                <span className="text-slate-500 text-sm">#{complaint.id}</span>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${tp.color}`}>{tp.label}</span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${st.color}`}>{st.label}</span>
                {complaint.complaint_type !== 'appeal' && (
                  <span className="px-3 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300 border border-slate-600">
                    На: {complaint.complaint_against === 'admin' ? 'Администратора' : 'Игрока'}
                  </span>
                )}
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
                    <div className="flex flex-col gap-0.5 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${msg.is_admin_reply ? 'text-purple-300' : 'text-slate-400'}`}>
                          {msg.is_admin_reply ? (msg.admin_name || 'Администратор') : (msg.user_name || 'Игрок')}
                        </span>
                        {msg.is_admin_reply && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Администратор</span>
                        )}
                      </div>
                      {msg.is_admin_reply && msg.mod_rating != null && msg.mod_rating_count != null && (
                        <StarDisplay rating={Number(msg.mod_rating)} count={msg.mod_rating_count} />
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    {msg.file_url && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {msg.file_url.match(/\.(mp4|webm|mov|avi|mkv)$/i)
                          ? <video src={msg.file_url} controls className="w-full max-w-xs rounded max-h-48" style={{maxWidth: '100%'}} />
                          : <img src={msg.file_url} alt="Доказательство" className="w-full rounded max-h-64 object-contain" style={{maxWidth: '100%'}} loading="lazy" />
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
          <div className="border-t border-slate-700 pt-4 space-y-3">
            {/* Приглашение оценить — для автора, если закрыл модератор */}
            {showRatingPrompt && (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Icon name="Star" size={20} className="text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Оцените качество ответа</p>
                    <p className="text-xs text-slate-400">Ваша оценка помогает улучшить работу администраторов</p>
                  </div>
                </div>
                <Button onClick={() => setShowRating(true)} size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0">
                  Оценить
                </Button>
              </div>
            )}
            {/* Уже выставленная оценка */}
            {complaint.rating && (
              <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 flex items-center gap-3">
                <Icon name="Star" size={16} className="text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Icon key={s} name="Star" size={14}
                          className={s <= complaint.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{RATING_LABELS[complaint.rating]}</span>
                  </div>
                  {complaint.rating_comment && (
                    <p className="text-xs text-slate-400 mt-1">"{complaint.rating_comment}"</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Icon name="Lock" size={14} />
              Обращение закрыто. Ответы недоступны.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
});

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
  const [showAppeal, setShowAppeal] = useState(false);
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
        setIsAdmin(data.is_admin || data.is_moderator || false);
      }
      if (dashRes.ok) {
        const data = await dashRes.json();
        setIsBlocked(data.is_blocked || false);
        setIsAdmin(prev => prev || data.is_moderator || data.complaint_access || data.is_admin || false);
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить обращения', variant: 'destructive' });
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
    setSelectedComplaint(prev => prev ? { ...prev, status: 'closed' } : prev);
  }, []);

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
              <h1 className="text-3xl font-bold text-white mb-4">Жалобы и апелляции</h1>
              <p className="text-slate-400 mb-8">Авторизуйтесь через Steam, чтобы просматривать обращения и подавать жалобы</p>
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
        ) : showAppeal ? (
          <div className="max-w-4xl mx-auto">
            <AppealForm
              token={token}
              onCreated={() => { setShowAppeal(false); loadList(token); }}
              onCancel={() => setShowAppeal(false)}
            />
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
              onAppeal={() => setShowAppeal(true)}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Complaints;