import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface Complaint {
  id: number;
  complaint_against: string;
  subject: string;
  status: string;
  created_at: string;
  message_count: number;
}

interface ComplaintsListProps {
  complaints: Complaint[];
  loading: boolean;
  onNewComplaint: () => void;
  onOpen: (id: number) => void;
}

const ComplaintsList = ({ complaints, loading, onNewComplaint, onOpen }: ComplaintsListProps) => {
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

  const getAgainstLabel = (against: string) => {
    return against === 'admin' ? 'Администратор' : 'Игрок';
  };

  const getAgainstIcon = (against: string) => {
    return against === 'admin' ? 'Shield' : 'User';
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Мои жалобы</h2>
        <Button
          onClick={onNewComplaint}
          className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Подать жалобу
        </Button>
      </div>

      {complaints.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="AlertTriangle" className="text-slate-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">У вас пока нет жалоб</h3>
            <p className="text-slate-400 mb-6">Заметили нарушение? Подайте жалобу и мы разберёмся</p>
            <Button
              onClick={onNewComplaint}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Подать жалобу
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {complaints.map((c) => (
            <Card
              key={c.id}
              className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-red-500/50 transition-all cursor-pointer"
              onClick={() => onOpen(c.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(c.status)}`}>
                      {getStatusText(c.status)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                      <Icon name={getAgainstIcon(c.complaint_against)} size={12} />
                      {getAgainstLabel(c.complaint_against)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{c.subject}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Icon name="Calendar" size={14} />
                      {formatDate(c.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="MessageSquare" size={14} />
                      {c.message_count} сообщений
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

export default ComplaintsList;