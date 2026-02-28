import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface Ticket {
  id: number;
  server: string;
  subject: string;
  status: string;
  created_at: string;
  message_count: number;
  unread_count?: number;
}

interface TicketsListProps {
  tickets: Ticket[];
  loading: boolean;
  onNewTicket: () => void;
}

const TicketsList = ({ tickets, loading, onNewTicket }: TicketsListProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

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
      case 'open': return 'Открыт';
      case 'closed': return 'Закрыт';
      case 'in_progress': return 'В работе';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Мои обращения</h2>
        <Button 
          onClick={onNewTicket}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Новое обращение
        </Button>
      </div>

      {tickets.length > 0 && (
        <div className="relative mb-4">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Поиск по ID или теме..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      )}

      {tickets.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="MessageSquare" className="text-slate-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">У вас пока нет обращений</h3>
            <p className="text-slate-400 mb-6">Создайте первое обращение, чтобы получить помощь</p>
            <Button 
              onClick={onNewTicket}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Создать обращение
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.filter((ticket) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return String(ticket.id).includes(q) || ticket.subject.toLowerCase().includes(q);
          }).map((ticket) => (
            <Card 
              key={ticket.id}
              className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer"
              onClick={() => navigate(`/support/ticket/${ticket.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                    <span className="text-sm text-slate-500">{ticket.server}</span>
                    {ticket.unread_count && ticket.unread_count > 0 && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">
                        {ticket.unread_count} новых
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{ticket.subject}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(ticket.id)); }}
                      className="flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                      title="Скопировать ID"
                    >
                      #{ticket.id}
                      <Icon name="Copy" size={10} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Icon name="Calendar" size={14} />
                      {formatDate(ticket.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="MessageSquare" size={14} />
                      {ticket.message_count} сообщений
                    </span>
                  </div>
                </div>
                
                <Icon name="ChevronRight" className="text-slate-600 flex-shrink-0" size={24} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default TicketsList;