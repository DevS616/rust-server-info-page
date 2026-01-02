import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';

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
}

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

interface TicketsTabProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  messages: Message[];
  reply: string;
  setReply: (reply: string) => void;
  handleSendReply: () => void;
  handleChangeStatus: (status: string) => void;
  handleBlockUser: (userId: number, block: boolean) => void;
  handleDeleteTicket: (ticketId: number) => void;
  loadTicketDetails: (ticketId: string, token: string) => void;
  token: string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterServer: string;
  setFilterServer: (server: string) => void;
  filterUnread: boolean;
  setFilterUnread: (unread: boolean) => void;
  servers: string[];
}

const TicketsTab = ({
  tickets,
  selectedTicket,
  setSelectedTicket,
  messages,
  reply,
  setReply,
  handleSendReply,
  handleChangeStatus,
  handleBlockUser,
  handleDeleteTicket,
  loadTicketDetails,
  token,
  getStatusColor,
  getStatusText,
  loading,
  filterStatus,
  setFilterStatus,
  filterServer,
  setFilterServer,
  filterUnread,
  setFilterUnread,
  servers
}: TicketsTabProps) => {
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

        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <img src={selectedTicket.steam_avatar} alt="" className="w-12 h-12 rounded-full" />
              <div>
                <h2 className="text-2xl font-semibold">{selectedTicket.subject}</h2>
                <p className="text-muted-foreground">от {selectedTicket.steam_username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">Steam64ID: {selectedTicket.steam_id}</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copySteamId(selectedTicket.steam_id)}
                  >
                    <Icon name="Copy" size={14} />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Сервер: {selectedTicket.server}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedTicket.status} onValueChange={handleChangeStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Открыт</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="closed">Закрыт</SelectItem>
                </SelectContent>
              </Select>
              
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

          <div className="space-y-4 mb-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${msg.is_admin_reply ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[80%] p-4 rounded-lg ${
                    msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <p className="text-sm font-medium mb-1">
                      {msg.is_admin_reply ? msg.admin_name : msg.user_name}
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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">Статус</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открыт</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="answered">Отвечен</SelectItem>
                <SelectItem value="closed">Закрыт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">Сервер</Label>
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

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={filterUnread} 
                onCheckedChange={(checked) => setFilterUnread(checked === true)}
              />
              <span className="text-sm">Только непрочитанные</span>
            </label>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="Inbox" className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground">Нет обращений</p>
          </Card>
        ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedTicket(ticket);
              loadTicketDetails(ticket.id.toString(), token);
            }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <img src={ticket.steam_avatar} alt="" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                    <span className="text-sm font-medium">{getStatusText(ticket.status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                    {ticket.unread_count !== undefined && ticket.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {ticket.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">от {ticket.steam_username}</p>
                  <p className="text-sm text-muted-foreground">Сервер: {ticket.server}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Сообщений: {ticket.message_count}</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              <Icon name="ChevronRight" className="text-muted-foreground" />
            </div>
          </Card>
        ))
        )}
      </div>
    </div>
  );
};

export default TicketsTab;