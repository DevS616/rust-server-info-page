import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { type CalendarEvent, mergeEvents } from '@/utils/autoEvents';
import { cachedFetch } from '@/lib/cachedFetch';

const DISMISS_KEY = 'event_alert_dismissed';

const getMoscowTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000);
};

const EventAlert = () => {
  const navigate = useNavigate();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await cachedFetch<{ events?: CalendarEvent[] }>(
        'https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/',
        'events_cache',
      );
      return mergeEvents(data?.events || []);
    };

    load().then(allEvents => {
      const msk = getMoscowTime();
      const upcoming = allEvents
        .map(e => ({ ...e, eventDate: new Date(e.date + 'T' + (e.event_time || '12:00') + '+03:00') }))
        .filter(e => e.eventDate.getTime() + 86400000 > msk.getTime())
        .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0] || null;

      if (!upcoming) return;

      // Показываем алерт только если до события ≤ 3 дней
      const diff = upcoming.eventDate.getTime() - msk.getTime();
      if (diff > 3 * 86400000) return;

      // Проверяем, не закрывал ли пользователь этот конкретный алерт
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed === upcoming.date + upcoming.title) return;

      setEvent(upcoming);
      setVisible(true);
    });
  }, []);

  const updateTimer = useCallback(() => {
    if (!event) return;
    const msk = getMoscowTime();
    const eventTime = new Date(event.date + 'T' + (event.event_time || '12:00') + '+03:00');
    const diff = eventTime.getTime() - msk.getTime();
    if (diff <= 0) { setTimeLeft('Событие началось!'); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    setTimeLeft(d > 0 ? `${d} дн ${h} ч ${m} мин` : `${h} ч ${m} мин`);
  }, [event]);

  useEffect(() => {
    if (!event) return;
    updateTimer();
    const t = setInterval(updateTimer, 60000);
    return () => clearInterval(t);
  }, [event, updateTimer]);

  const dismiss = () => {
    if (event) localStorage.setItem(DISMISS_KEY, event.date + event.title);
    setVisible(false);
  };

  if (!visible || !event) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 mx-auto max-w-3xl px-3 pt-2"
    >
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border text-white text-sm"
        style={{
          backgroundColor: event.color + 'ee',
          borderColor: event.color,
        }}
      >
        <Icon name="CalendarClock" size={18} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-bold">{event.title}</span>
          {event.servers && <span className="text-white/80 ml-2 text-xs">{event.servers}</span>}
          {timeLeft && (
            <span className="ml-2 text-white/90">
              — {timeLeft === 'Событие началось!' ? timeLeft : `через ${timeLeft}`}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 flex-shrink-0 h-7 px-2 text-xs"
          onClick={() => navigate('/calendar')}
        >
          Подробнее
        </Button>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
          aria-label="Закрыть"
        >
          <Icon name="X" size={16} />
        </button>
      </div>
    </div>
  );
};

export default EventAlert;