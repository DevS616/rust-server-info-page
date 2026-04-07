import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface CalendarEvent {
  id: number;
  date: string;
  event_time?: string;
  title: string;
  description: string;
  color: string;
  servers?: string;
}

interface EventCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Возвращает дату первого четверга месяца (year, month — 0-based)
const getFirstThursday = (year: number, month: number): Date => {
  const d = new Date(year, month, 1);
  // getDay(): 0=Вс, 1=Пн, ..., 4=Чт
  const dayOfWeek = d.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  return new Date(year, month, 1 + daysUntilThursday);
};

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Генерирует авто-события для N месяцев вперёд и текущего
const generateAutoEvents = (): CalendarEvent[] => {
  const result: CalendarEvent[] = [];
  const now = new Date();
  // Генерируем для предыдущего, текущего и 2 следующих месяцев
  for (let offset = -1; offset <= 2; offset++) {
    const year = new Date(now.getFullYear(), now.getMonth() + offset, 1).getFullYear();
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1).getMonth();

    const wipeDate = getFirstThursday(year, month);
    // Судная ночь — четверг за 7 дней до вайпа (предыдущий четверг)
    const doomDate = new Date(wipeDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    result.push({
      id: -(offset * 2 + 1) - 1000,
      date: toDateStr(wipeDate),
      event_time: '22:00',
      title: 'Глобальный вайп',
      description: 'Полный сброс всех серверов. Стартуем с чистого листа! Все постройки, ресурсы и прогресс будут удалены.',
      color: '#DC2626',
      servers: 'Все сервера',
    });

    result.push({
      id: -(offset * 2 + 2) - 1000,
      date: toDateStr(doomDate),
      event_time: '18:00',
      title: 'Судная ночь',
      description: 'Ночь перед вайпом — последний шанс отомстить обидчикам и забрать всё что можно! Усиленные рейды, хаос и веселье.',
      color: '#EA580C',
      servers: 'Все сервера',
    });
  }
  return result;
};

const EventCalendar = ({ isOpen, onClose }: EventCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || events.length === 0) return;

    const updateTimer = () => {
      const now = new Date();
      const moscowOffset = 3 * 60;
      const localOffset = now.getTimezoneOffset();
      const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60000);

      const upcomingEvent = getUpcomingEvent(moscowTime);
      if (!upcomingEvent) {
        setTimeLeft('');
        return;
      }

      const eventTime = upcomingEvent.event_time || '12:00:00';
      const eventDate = new Date(upcomingEvent.date + 'T' + eventTime + '+03:00');
      const diff = eventDate.getTime() - moscowTime.getTime();

      if (diff <= 0) {
        setTimeLeft('Событие началось!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days} дней ${hours} часов ${minutes} минут`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [isOpen, events]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const autoEvents = generateAutoEvents();
      const response = await fetch('https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/');
      if (response.ok) {
        const data = await response.json();
        const dbEvents: CalendarEvent[] = data.events || [];
        // Авто-события не перекрывают вручную добавленные на ту же дату
        const dbDates = new Set(dbEvents.map(e => e.date));
        const filteredAuto = autoEvents.filter(e => !dbDates.has(e.date));
        setEvents([...dbEvents, ...filteredAuto]);
      } else {
        setEvents(autoEvents);
      }
    } catch {
      setEvents(generateAutoEvents());
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // 0 = Monday

    const days: (number | null)[] = [];
    
    // Add previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1).getDate();
      days.push(prevMonthDay);
    }
    
    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Add next month days to complete the grid
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push(i);
      }
    }
    
    return { days, startingDayOfWeek, daysInMonth };
  };

  const getEventForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.find(e => e.date === dateStr);
  };

  const getUpcomingEvent = (moscowTime: Date) => {
    const upcomingEvents = events
      .map(e => {
        const eventTime = e.event_time || '12:00:00';
        const eventDate = new Date(e.date + 'T' + eventTime + '+03:00');
        return { ...e, eventDate };
      })
      .filter(e => {
        // Показываем события которые еще не прошли (в пределах 24 часов после начала)
        const eventEndTime = e.eventDate.getTime() + (24 * 60 * 60 * 1000);
        return eventEndTime > moscowTime.getTime();
      })
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    
    return upcomingEvents[0] || null;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const { days, startingDayOfWeek, daysInMonth } = getDaysInMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-gradient-to-b from-gray-900 to-gray-800 border-2 border-primary/30 p-6">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-white uppercase tracking-wider">
            КАЛЕНДАРЬ
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side - Calendar */}
          <div className="lg:col-span-2">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6 bg-gray-800/50 p-4 rounded-lg">
              <Button
                onClick={handlePrevMonth}
                variant="ghost"
                size="icon"
                className="hover:bg-primary/20"
              >
                <Icon name="ChevronLeft" className="h-6 w-6" />
              </Button>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-primary">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>
              
              <Button
                onClick={handleNextMonth}
                variant="ghost"
                size="icon"
                className="hover:bg-primary/20"
              >
                <Icon name="ChevronRight" className="h-6 w-6" />
              </Button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-400 uppercase py-2"
                >
                  {day.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const isCurrentMonthDay = index >= startingDayOfWeek && index < startingDayOfWeek + daysInMonth;
                const isToday = isCurrentMonth && isCurrentMonthDay && day === today.getDate();
                const event = isCurrentMonthDay && day ? getEventForDate(day as number) : null;
                
                return (
                  <button
                    key={index}
                    onClick={() => event && setSelectedEvent(event)}
                    disabled={!isCurrentMonthDay}
                    className={`
                      aspect-square p-2 rounded-lg text-lg font-bold transition-all relative
                      ${!isCurrentMonthDay ? 'bg-gray-800/30 text-gray-600' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'}
                      ${isToday ? 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/50' : ''}
                      ${event ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    style={event ? { backgroundColor: event.color } : {}}
                  >
                    {day}
                    {isToday && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                        <div className="absolute w-2 h-2 bg-yellow-400 rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side - Event details or selected event info */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            {selectedEvent ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-primary">
                    {new Date(selectedEvent.date).getDate()}
                  </h3>
                  <Button
                    onClick={() => setSelectedEvent(null)}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-gray-700"
                  >
                    <Icon name="X" className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-xl font-bold text-white mb-1">{MONTHS[new Date(selectedEvent.date).getMonth()]}</h4>
                  <p className="text-sm text-gray-400 uppercase">
                    {DAYS_OF_WEEK[new Date(selectedEvent.date).getDay()]}
                  </p>
                </div>

                <div className="mt-6">
                  <h5 className="text-lg font-semibold text-white mb-2">{selectedEvent.title}</h5>
                  {selectedEvent.servers && (
                    <div className="mb-3 flex items-center gap-2">
                      <Icon name="Server" className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">{selectedEvent.servers}</span>
                    </div>
                  )}
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6 text-blue-400">
                  <Icon name="Info" className="h-6 w-6" />
                  <p className="text-sm">
                    ДЛЯ ПОЛУЧЕНИЯ ДОП. ИНФОРМАЦИИ В ИГРЕ ВВЕДИТЕ КОМАНДУ /wipe В ЧАТЕ, ИЛИ НАЖМИТЕ НА КАЛЕНДАРЬ В ЛИЧНОМ МЕНЮ
                  </p>
                </div>

                {timeLeft && (() => {
                  const now = new Date();
                  const moscowOffset = 3 * 60;
                  const localOffset = now.getTimezoneOffset();
                  const moscowTime = new Date(now.getTime() + (moscowOffset + localOffset) * 60000);
                  const upcomingEvent = getUpcomingEvent(moscowTime);
                  
                  if (!upcomingEvent) return null;
                  
                  const isEventStarted = timeLeft === 'Событие началось!';
                  
                  return (
                    <button
                      onClick={() => setSelectedEvent(upcomingEvent)}
                      className="w-full mb-6 p-4 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 rounded-lg border-2 border-primary/50 transition-all"
                    >
                      <div className="text-left space-y-2">
                        <p className="text-xs text-gray-400 uppercase font-semibold">До ближайшего события</p>
                        <p 
                          className="text-lg font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                          style={{ color: upcomingEvent.color }}
                        >
                          "{upcomingEvent.title}"
                        </p>
                        {upcomingEvent.servers && (
                          <div className="flex items-center gap-2">
                            <Icon name="Server" className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-400">{upcomingEvent.servers}</span>
                          </div>
                        )}
                        <p className="text-sm text-gray-300">
                          {isEventStarted ? timeLeft : `Осталось: ${timeLeft}`}
                        </p>
                        <p className="text-xs text-gray-400">Время по МСК</p>
                      </div>
                    </button>
                  );
                })()}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Легенда событий:</h4>
                  
                  {events.reduce((acc, event) => {
                    if (!acc.find(e => e.title === event.title)) {
                      acc.push(event);
                    }
                    return acc;
                  }, [] as CalendarEvent[]).map((event) => (
                    <div key={event.id} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="text-sm text-gray-300">{event.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventCalendar;