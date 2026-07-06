import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { type CalendarEvent, mergeEvents } from '@/utils/autoEvents';

const DAYS_OF_WEEK = ['ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const getMoscowTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000);
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMapVote, setHasMapVote] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/');
        const db = res.ok ? (await res.json()).events || [] : [];
        setEvents(mergeEvents(db));
      } catch {
        setEvents(mergeEvents([]));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    interface PollLite { is_map_vote?: boolean; is_active?: boolean; ends_at?: string | null; }
    const checkMapVote = async () => {
      try {
        const res = await fetch('https://functions.poehali.dev/b11aeefa-8364-460f-a54e-6338ddb77cf3/');
        if (!res.ok) return;
        const data = await res.json();
        const polls: PollLite[] = data.polls || [];
        const active = polls.some((p) => {
          if (!p.is_map_vote || p.is_active === false) return false;
          if (p.ends_at) {
            const end = new Date(String(p.ends_at).replace(' ', 'T') + 'Z');
            if (!isNaN(end.getTime()) && Date.now() >= end.getTime()) return false;
          }
          return true;
        });
        setHasMapVote(active);
      } catch { /* ignore */ }
    };
    checkMapVote();
  }, []);

  const getUpcomingEvent = useCallback((moscowTime: Date) => {
    return events
      .map(e => ({ ...e, eventDate: new Date(e.date + 'T' + (e.event_time || '12:00') + '+03:00') }))
      .filter(e => e.eventDate.getTime() + 86400000 > moscowTime.getTime())
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0] || null;
  }, [events]);

  useEffect(() => {
    if (!events.length) return;
    const update = () => {
      const msk = getMoscowTime();
      const ev = getUpcomingEvent(msk);
      if (!ev) { setTimeLeft(''); return; }
      const diff = new Date(ev.date + 'T' + (ev.event_time || '12:00') + '+03:00').getTime() - msk.getTime();
      if (diff <= 0) { setTimeLeft('Событие началось!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d} дн ${h} ч ${m} мин` : `${h} ч ${m} мин`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [events, getUpcomingEvent]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startDow; i++)
      days.push(new Date(year, month, -startDow + i + 1).getDate());
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    const rem = 7 - (days.length % 7);
    if (rem < 7) for (let i = 1; i <= rem; i++) days.push(i);
    return { days, startDow, daysInMonth };
  };

  const getEventsForDate = (day: number) => {
    const ds = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === ds);
  };

  const { days, startDow, daysInMonth } = getDaysInMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const upcomingEvent = getUpcomingEvent(getMoscowTime());

  // Легенда (уникальные названия)
  const legend = events.reduce<CalendarEvent[]>((acc, e) => {
    if (!acc.find(x => x.title === e.title)) acc.push(e);
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onOpenBonus={() => {}} onOpenTelegram={() => {}} bonusAvailable={false} />

      <main className="flex-1 container py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <h1 className="text-3xl font-bold uppercase tracking-wider">Календарь событий</h1>
        </div>

        {hasMapVote && (
          <button
            onClick={() => navigate('/vote')}
            className="w-full mb-6 rounded-xl p-4 bg-primary/15 border-2 border-primary hover:bg-primary/25 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Icon name="Map" size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">Проголосовать за карту</p>
                <p className="text-xs text-gray-400">Идёт голосование — выбери следующую карту</p>
              </div>
              <Icon name="ChevronRight" size={20} className="text-primary group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Сетка календаря */}
            <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4 sm:p-6">
              {/* Навигация по месяцу */}
              <div className="flex items-center justify-between mb-4 bg-gray-800/50 px-4 py-3 rounded-lg">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                  <Icon name="ChevronLeft" size={20} />
                </Button>
                <h2 className="text-xl font-bold text-primary">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                  <Icon name="ChevronRight" size={20} />
                </Button>
              </div>

              {/* Дни недели */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase py-1">
                    {d.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Сетка дней */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                  const isCurMonth = idx >= startDow && idx < startDow + daysInMonth;
                  const isToday = isCurrentMonth && isCurMonth && day === today.getDate();
                  const dayEvents = isCurMonth && day ? getEventsForDate(day as number) : [];
                  const firstEvent = dayEvents[0];

                  return (
                    <button
                      key={idx}
                      onClick={() => firstEvent && setSelectedEvent(firstEvent)}
                      disabled={!isCurMonth}
                      className={`aspect-square rounded-lg text-sm sm:text-base font-bold transition-all relative flex items-center justify-center
                        ${!isCurMonth ? 'bg-gray-800/20 text-gray-700' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'}
                        ${isToday ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''}
                        ${firstEvent ? 'cursor-pointer' : 'cursor-default'}
                      `}
                      style={firstEvent ? { backgroundColor: firstEvent.color + 'cc' } : {}}
                    >
                      {day}
                      {dayEvents.length > 1 && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-white rounded-full opacity-80" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Правая панель */}
            <div className="space-y-4">
              {/* Ближайшее событие */}
              {upcomingEvent && (
                <div
                  className="rounded-xl p-4 border-2 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ borderColor: upcomingEvent.color, backgroundColor: upcomingEvent.color + '22' }}
                  onClick={() => setSelectedEvent(upcomingEvent)}
                >
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Ближайшее событие</p>
                  <p className="font-bold text-white mb-1">{upcomingEvent.title}</p>
                  {upcomingEvent.servers && (
                    <p className="text-xs text-gray-400 mb-2">
                      <Icon name="Server" size={12} className="inline mr-1" />{upcomingEvent.servers}
                    </p>
                  )}
                  <p className="text-sm font-semibold" style={{ color: upcomingEvent.color }}>
                    {timeLeft === 'Событие началось!' ? timeLeft : timeLeft ? `Через ${timeLeft}` : ''}
                  </p>
                </div>
              )}

              {/* Детали выбранного события */}
              {selectedEvent ? (
                <div className="bg-gray-900 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: selectedEvent.color }}>
                        {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </p>
                      {selectedEvent.event_time && (
                        <p className="text-sm text-gray-400">{selectedEvent.event_time} МСК</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{selectedEvent.title}</h3>
                  {selectedEvent.servers && (
                    <p className="text-sm text-primary mb-3">
                      <Icon name="Server" size={14} className="inline mr-1" />{selectedEvent.servers}
                    </p>
                  )}
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Нажмите на дату с событием для просмотра деталей</p>
                </div>
              )}

              {/* Легенда */}
              <div className="bg-gray-900 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Легенда</h4>
                <div className="space-y-2">
                  {legend.map(e => (
                    <div key={e.title} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="text-sm text-gray-300">{e.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CalendarPage;