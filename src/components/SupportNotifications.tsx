import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://functions.poehali.dev';

interface NotificationState {
  unreadCount: number;
  isBlocked: boolean;
  lastChecked: number;
  tickets: TicketUpdate[];
}

interface TicketUpdate {
  id: number;
  subject: string;
  status: string;
  unread_count: number;
}

const SupportNotifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lastState, setLastState] = useState<NotificationState | null>(null);

  useEffect(() => {
    const checkNotifications = async () => {
      const token = localStorage.getItem('support_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=dashboard`, {
          headers: { 'X-Auth-Token': token }
        });

        if (res.ok) {
          const data = await res.json();
          const tickets = data.tickets || [];
          
          const newState: NotificationState = {
            unreadCount: data.unread_count || 0,
            isBlocked: data.is_blocked || false,
            lastChecked: Date.now(),
            tickets: tickets.map((t: any) => ({
              id: t.id,
              subject: t.subject,
              status: t.status,
              unread_count: t.unread_count || 0
            }))
          };

          if (lastState) {
            if (newState.isBlocked && !lastState.isBlocked) {
              toast({
                title: '⛔ Аккаунт заблокирован',
                description: 'Ваш аккаунт был заблокирован администрацией. Вы не можете создавать новые обращения.',
                variant: 'destructive',
                duration: 10000
              });
            }

            newState.tickets.forEach(newTicket => {
              const oldTicket = lastState.tickets.find(t => t.id === newTicket.id);
              
              if (oldTicket) {
                if (newTicket.status !== oldTicket.status) {
                  const statusText = newTicket.status === 'closed' ? 'Закрыт' : 
                                   newTicket.status === 'in_progress' ? 'В работе' : 'Открыт';
                  toast({
                    title: '📋 Статус обращения изменен',
                    description: `${newTicket.subject}\nНовый статус: ${statusText}`,
                    action: (
                      <ToastAction 
                        altText="Перейти к обращению"
                        onClick={() => navigate(`/support/ticket/${newTicket.id}`)}
                      >
                        Перейти
                      </ToastAction>
                    ),
                    duration: 10000
                  });
                }
                
                if (newTicket.unread_count > oldTicket.unread_count) {
                  toast({
                    title: '💬 Новый ответ администрации',
                    description: newTicket.subject,
                    action: (
                      <ToastAction 
                        altText="Перейти к обращению"
                        onClick={() => navigate(`/support/ticket/${newTicket.id}`)}
                      >
                        Перейти
                      </ToastAction>
                    ),
                    duration: 10000
                  });
                }
              }
            });
          }

          setLastState(newState);
        }
      } catch (error) {
        console.error('Failed to check notifications:', error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 15000);

    return () => clearInterval(interval);
  }, [lastState, toast, navigate]);

  return null;
};

export default SupportNotifications;