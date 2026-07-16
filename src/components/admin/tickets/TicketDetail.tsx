import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { formatMskDateTime } from '@/utils/dateFormat';
import { Ticket, Message, TICKETS_API } from './types';

interface TicketDetailProps {
  selectedTicket: Ticket;
  setSelectedTicket: (ticket: Ticket | null) => void;
  messages: Message[];
  reply: string;
  setReply: (reply: string) => void;
  replyFile: File | null;
  setReplyFile: (file: File | null) => void;
  handleSendReply: () => void;
  handleChangeStatus: (status: string) => void;
  handleBlockUser: (userId: number, block: boolean) => void;
  handleDeleteTicket: (ticketId: number) => void;
  token: string;
  onMessagesUpdate?: (messages: Message[]) => void;
  loading: boolean;
}

const TicketDetail = ({
  selectedTicket,
  setSelectedTicket,
  messages,
  reply,
  setReply,
  replyFile,
  setReplyFile,
  handleSendReply,
  handleChangeStatus,
  handleBlockUser,
  handleDeleteTicket,
  token,
  onMessagesUpdate,
  loading,
}: TicketDetailProps) => {
  const { toast } = useToast();
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async (messageId: number) => {
    if (!editingText.trim() || !selectedTicket) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${TICKETS_API}/?action=edit_message&ticket_id=${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ message_id: messageId, message: editingText })
      });
      if (res.ok) {
        const data = await res.json();
        const now = data.edited_at || new Date().toISOString();
        const updated = messages.map(m => m.id === messageId ? { ...m, message: editingText, edited_at: now } : m);
        onMessagesUpdate?.(updated);
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

  const copySteamId = (steamId: string) => {
    navigator.clipboard.writeText(steamId);
  };

  return (
    <div>
      <Button onClick={() => setSelectedTicket(null)} variant="outline" className="mb-4">
        <Icon name="ArrowLeft" className="mr-2" />
        Назад к списку
      </Button>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start gap-3">
            {selectedTicket.steam_avatar ? (
              <img src={selectedTicket.steam_avatar} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon name="User" size={20} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg md:text-2xl font-semibold break-words">{selectedTicket.subject}</h2>
                <span className="text-xs md:text-sm text-muted-foreground">#{selectedTicket.id}</span>
              </div>
              <p className="text-sm md:text-base text-muted-foreground truncate">от {selectedTicket.steam_username}</p>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <p className="text-xs md:text-sm text-muted-foreground break-all">Steam64ID: {selectedTicket.steam_id}</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-5 w-5 p-0 md:h-6 md:px-2"
                  onClick={() => copySteamId(selectedTicket.steam_id)}
                >
                  <Icon name="Copy" size={12} />
                </Button>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Сервер: {selectedTicket.server}</p>
              {selectedTicket.rating && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Icon name="Star" size={16} className="text-yellow-500" />
                    <span className="text-sm font-semibold">Оценка: {selectedTicket.rating}/5</span>
                  </div>
                  {selectedTicket.rating_comment && (
                    <p className="text-xs text-muted-foreground italic">"{selectedTicket.rating_comment}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedTicket.status} onValueChange={handleChangeStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Открыт</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="answered">Прочитан</SelectItem>
                <SelectItem value="closed">Закрыт</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              {selectedTicket.is_blocked ? (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleBlockUser(selectedTicket.user_id, false)}
                  title="Разблокировать пользователя"
                >
                  <Icon name="ShieldCheck" />
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  size="icon"
                  onClick={() => handleBlockUser(selectedTicket.user_id, true)}
                  title="Заблокировать пользователя"
                >
                  <Icon name="Ban" />
                </Button>
              )}
              
              <Button 
                variant="destructive" 
                size="icon"
                onClick={() => {
                  if (confirm('Вы уверены, что хотите удалить это обращение? Действие нельзя отменить.')) {
                    handleDeleteTicket(selectedTicket.id);
                  }
                }}
                title="Удалить обращение"
              >
                <Icon name="Trash2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4 mb-6">
          {messages.map((msg) => {
            const canEdit = selectedTicket.status !== 'closed' && msg.is_admin_reply;
            const isEditing = editingMsgId === msg.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                  <div className={`group/msg inline-block max-w-full md:max-w-[80%] p-3 md:p-4 rounded-lg ${
                    msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <p className="text-xs md:text-sm font-medium mb-1">
                      {msg.is_admin_reply ? msg.admin_name : msg.user_name}
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
                      <p className="text-sm md:text-base whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    {msg.file_url && !isEditing && (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {msg.file_url.match(/\.(mp4|webm|mov|avi|mkv)$/i)
                          ? <video src={msg.file_url} controls className="w-full rounded max-h-48" style={{maxWidth: '100%'}} />
                          : msg.file_url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
                            ? <img src={msg.file_url} alt="Прикреплённый файл" className="w-full rounded max-h-64 object-contain" style={{maxWidth: '100%'}} loading="lazy" />
                            : <span className="text-xs md:text-sm underline">📎 Прикреплённый файл</span>
                        }
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs opacity-70">
                        {formatMskDateTime(msg.created_at)}
                      </p>
                      {msg.edited_at && !msg.is_admin_reply && (
                        <span className="text-xs opacity-60 italic">
                          изм. {formatMskDateTime(msg.edited_at)}
                        </span>
                      )}
                      {msg.edited_at && msg.is_admin_reply && (
                        <span className="text-xs opacity-50 italic">изм.</span>
                      )}
                      {canEdit && !isEditing && (
                        <button
                          onClick={() => { setEditingMsgId(msg.id); setEditingText(msg.message); }}
                          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
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
            <Label htmlFor="reply-file" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Paperclip" size={16} />
                <span>Прикрепить файл</span>
              </div>
            </Label>
            <Input
              id="reply-file"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  if (file.size > 10 * 1024 * 1024) {
                    alert('Размер файла не должен превышать 10 МБ');
                    return;
                  }
                  setReplyFile(file);
                }
              }}
              className="hidden"
            />
            {replyFile && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Icon name="File" size={16} />
                <span>{replyFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyFile(null)}
                  className="h-6 px-2"
                >
                  <Icon name="X" size={14} />
                </Button>
              </div>
            )}
          </div>
          
          <Button onClick={handleSendReply} disabled={!reply.trim() || loading}>
            {loading ? (
              <>
                <Icon name="Loader2" className="mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Icon name="Send" className="mr-2" />
                Отправить ответ
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TicketDetail;
