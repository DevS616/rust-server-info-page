import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface CalendarEvent {
  id: number;
  date: string;
  title: string;
  description: string;
  color: string;
}

interface EventCalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const EventCalendar = ({ isOpen, onClose }: EventCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://functions.poehali.dev/20b8d7e0-8c27-4631-9f36-7be6d0ffb6a1/');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
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
                      aspect-square p-2 rounded-lg text-lg font-bold transition-all
                      ${!isCurrentMonthDay ? 'bg-gray-800/30 text-gray-600' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'}
                      ${isToday ? 'ring-2 ring-gray-500' : ''}
                      ${event ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    style={event ? { backgroundColor: event.color } : {}}
                  >
                    {day}
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