import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const TICKETS_API = 'https://functions.poehali.dev/887805c0-0d3a-4f32-8436-1ba1adda4a4f';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  steam_username: string;
  steam_avatar: string;
  steam_id: string;
  is_blocked: boolean;
  message_count: number;
  unread_count?: number;
  user_id: number;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

interface Message {
  id: number;
  user_id?: number;
  admin_id?: number;
  message: string;
  file_url: string;
  is_admin_reply: boolean;
  created_at: string;
  edited_at?: string | null;
  user_name?: string;
  user_avatar?: string;
  admin_name?: string;
}

interface TicketsTabProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
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
  loadTicketDetails: (ticketId: string, token: string) => void;
  token: string;
  adminId?: number;
  onMessagesUpdate?: (messages: Message[]) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterServer: string;
  setFilterServer: (server: string) => void;
  filterUnread: boolean;
  setFilterUnread: (unread: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  servers: string[];
  onRefresh?: () => void;
}

const TicketsTab = ({
  tickets,
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
  loadTicketDetails,
  token,
  adminId,
  onMessagesUpdate,
  getStatusColor,
  getStatusText,
  loading,
  filterStatus,
  setFilterStatus,
  filterServer,
  setFilterServer,
  filterUnread,
  setFilterUnread,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  servers,
  onRefresh
}: TicketsTabProps) => {
  const { toast } = useToast();
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

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
  if (selectedTicket) {
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
                          {new Date(msg.created_at).toLocaleString('ru-RU')}
                        </p>
                        {msg.edited_at && !msg.is_admin_reply && (
                          <span className="text-xs opacity-60 italic">
                            изм. {new Date(msg.edited_at).toLocaleString('ru-RU')}
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
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <Card className="p-3 md:p-4">
        <div className="flex flex-col gap-3 mb-3 md:mb-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs md:text-sm mb-2 block">Поиск</Label>
              <div className="relative">
                <Icon name="Search" className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 md:pl-10 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                )}
              </div>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Обновить тикеты"
              >
                <Icon name="RefreshCw" size={16} className={refreshing ? 'animate-spin' : ''} />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs md:text-sm mb-2 block">Статус</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открыт</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="closed">Закрыт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs md:text-sm mb-2 block">Сервер</Label>
            <Select value={filterServer} onValueChange={setFilterServer}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все серверы</SelectItem>
                {servers.map(server => (
                  <SelectItem key={server} value={server}>{server}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs md:text-sm mb-2 block">Сортировка</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Сначала новые</SelectItem>
                <SelectItem value="date_asc">Сначала старые</SelectItem>
                <SelectItem value="unread_desc">Больше непрочитанных</SelectItem>
                <SelectItem value="status">По статусу</SelectItem>
                <SelectItem value="messages_desc">Больше сообщений</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
        
        <div className="mt-3 flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={filterUnread} 
              onCheckedChange={(checked) => setFilterUnread(checked === true)}
            />
            <span className="text-xs md:text-sm">Только непрочитанные</span>
          </label>
        </div>
      </Card>

      <div className="grid gap-3 md:gap-4">
        {tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="Inbox" className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">Нет обращений</p>
          </Card>
        ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="p-3 md:p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedTicket(ticket);
              loadTicketDetails(ticket.id.toString(), token);
            }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                {ticket.steam_avatar ? (
                  <img src={ticket.steam_avatar} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={16} className="text-muted-foreground md:w-5 md:h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(ticket.status)}`}></span>
                    <span className="text-xs md:text-sm font-medium">{getStatusText(ticket.status)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm md:text-lg font-semibold break-words">{ticket.subject}</h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">#{ticket.id}</span>
                    {ticket.unread_count !== undefined && ticket.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 md:px-2 py-0.5 rounded-full flex-shrink-0">
                        {ticket.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">от {ticket.steam_username || 'Unknown'}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Steam ID: <span className="break-all">{ticket.steam_id || 'N/A'}</span>
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Сервер: {ticket.server}</p>
                  <div className="flex items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-muted-foreground flex-wrap">
                    <span className="whitespace-nowrap">Сообщений: {ticket.message_count}</span>
                    <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString('ru-RU')}</span>
                    {ticket.rating && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Icon name="Star" size={14} className="fill-yellow-500" />
                        <span className="font-semibold">{ticket.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Icon name="ChevronRight" className="text-muted-foreground flex-shrink-0" size={20} />
            </div>
          </Card>
        ))
        )}
      </div>
    </div>
  );
};

export default TicketsTab;