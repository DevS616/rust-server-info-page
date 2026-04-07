export interface CalendarEvent {
  id: number;
  date: string;
  event_time?: string;
  title: string;
  description: string;
  color: string;
  servers?: string;
  isAuto?: boolean;
}

export const AUTO_TITLES = ['Глобальный вайп', 'Судная ночь'];

const getFirstThursday = (year: number, month: number): Date => {
  const d = new Date(year, month, 1);
  const daysUntilThursday = (4 - d.getDay() + 7) % 7;
  return new Date(year, month, 1 + daysUntilThursday);
};

export const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const generateAutoEvents = (): CalendarEvent[] => {
  const result: CalendarEvent[] = [];
  const now = new Date();
  for (let offset = -1; offset <= 2; offset++) {
    const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth();

    const wipeDate = getFirstThursday(year, month);
    const doomDate = new Date(wipeDate.getTime() - 1 * 24 * 60 * 60 * 1000);

    result.push({
      id: -(offset * 2 + 1) - 1000,
      date: toDateStr(wipeDate),
      event_time: '22:00',
      title: 'Глобальный вайп',
      description: 'Полный сброс всех серверов. Стартуем с чистого листа! Все постройки, ресурсы и прогресс будут удалены.',
      color: '#DC2626',
      servers: 'Все сервера',
      isAuto: true,
    });

    result.push({
      id: -(offset * 2 + 2) - 1000,
      date: toDateStr(doomDate),
      event_time: '18:00',
      title: 'Судная ночь',
      description: 'Ночь перед вайпом — последний шанс отомстить обидчикам и забрать всё что можно! Усиленные рейды, хаос и веселье.',
      color: '#EA580C',
      servers: 'Все сервера',
      isAuto: true,
    });
  }
  return result;
};

export const mergeEvents = (dbEvents: CalendarEvent[]): CalendarEvent[] => {
  const autoEvents = generateAutoEvents();
  const dbDates = new Set(
    dbEvents.filter(e => AUTO_TITLES.includes(e.title)).map(e => e.date)
  );
  const filteredAuto = autoEvents.filter(e => !dbDates.has(e.date));
  const manualEvents = dbEvents.filter(e => !AUTO_TITLES.includes(e.title));
  return [...manualEvents, ...filteredAuto];
};
