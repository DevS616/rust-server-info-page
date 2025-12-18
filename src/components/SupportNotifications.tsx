import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface NotificationState {
  unreadCount: number;
  isBlocked: boolean;
  lastChecked: number;
}

const SupportNotifications = () => {
  const { toast } = useToast();
  const [lastState, setLastState] = useState<NotificationState | null>(null);

  useEffect(() => {
    const checkNotifications = async () => {
      const token = localStorage.getItem('support_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=status`, {
          headers: { 'X-Auth-Token': token }
        });

        if (res.ok) {
          const data = await res.json();
          const newState: NotificationState = {
            unreadCount: data.unread_count || 0,
            isBlocked: data.is_blocked || false,
            lastChecked: Date.now()
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

            if (newState.unreadCount > lastState.unreadCount) {
              const diff = newState.unreadCount - lastState.unreadCount;
              toast({
                title: '🔔 Новый ответ в техподдержке',
                description: `У вас ${diff} ${diff === 1 ? 'новое сообщение' : 'новых сообщения'} от администрации`,
                duration: 8000
              });
            }
          }

          setLastState(newState);
        }
      } catch (error) {
        console.error('Failed to check notifications:', error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [lastState, toast]);

  return null;
};

export default SupportNotifications;
