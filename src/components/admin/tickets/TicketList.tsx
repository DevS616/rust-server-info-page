import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { formatMskDate } from '@/utils/dateFormat';
import { Ticket } from './types';

interface TicketListProps {
  tickets: Ticket[];
  setSelectedTicket: (ticket: Ticket | null) => void;
  loadTicketDetails: (ticketId: string, token: string) => void;
  token: string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

const TicketList = ({
  tickets,
  setSelectedTicket,
  loadTicketDetails,
  token,
  getStatusColor,
  getStatusText,
}: TicketListProps) => {
  return (
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
                  <span className="whitespace-nowrap">{formatMskDate(ticket.created_at)}</span>
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
  );
};

export default TicketList;
