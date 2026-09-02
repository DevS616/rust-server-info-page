export interface CalendarEvent {
  id: number;
  date: string;
  event_time?: string;
  title: string;
  description: string;
  color: string;
  servers?: string;
  isAuto?: boolean;
  is_hidden?: boolean;
}

export const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Получить все даты конкретного дня недели в месяце (0=Вс, 1=Пн, ..., 5=Пт, 6=Сб)
const getDaysOfWeekInMonth = (year: number, month: number, weekDay: number): Date[] => {
  const result: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === weekDay) result.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
};

// Генерирует авто-события для всех месяцев года year (или всех если year = 0 → текущий диапазон)
export const generateAutoEvents = (): CalendarEvent[] => {
  const result: CalendarEvent[] = [];
  let idCounter = -1001;

  // Генерируем для 2026 года + текущий/следующий год если не 2026
  const years = new Set([2026]);
  const now = new Date();
  years.add(now.getFullYear());
  years.add(now.getFullYear() + 1);

  for (const year of years) {
    for (let month = 0; month < 12; month++) {

      // 1. Судная ночь PVE — каждую ПЕРВУЮ СРЕДУ месяца в 18:00
      const wednesdays = getDaysOfWeekInMonth(year, month, 3); // 3 = Среда
      if (wednesdays.length > 0) {
        result.push({
          id: idCounter--,
          date: toDateStr(wednesdays[0]),
          event_time: '18:00',
          title: 'Судная ночь',
          description: 'PVP событие, начало в 18:00 по МСК, завершение после Официального вайпа от разработчиков игры 22:00-22:30 по МСК)',
          color: '#EA580C',
          servers: 'PVE сервера',
          isAuto: true,
        });
      }

      // 2. Глобальный вайп PVE — каждый ПЕРВЫЙ ЧЕТВЕРГ месяца в 22:30
      const thursdays = getDaysOfWeekInMonth(year, month, 4); // 4 = Четверг
      if (thursdays.length > 0) {
        result.push({
          id: idCounter--,
          date: toDateStr(thursdays[0]),
          event_time: '22:30',
          title: 'Глобальный вайп',
          description: 'Глобальный вайп с обновлением от разработчиков RUST, удаляет чертежи, меняется карта, очищаются инвентари.\nДоп рюкзак, валюта DC и DP, очки XP не обнуляются!\nНачало в 22:30 по МСК, завершение после обновления, следите за новостями в наших соц сетях',
          color: '#DC2626',
          servers: 'PVE сервера',
          isAuto: true,
        });
      }

      // 3+4. Вайпы PVP — все пятницы месяца
      const fridays = getDaysOfWeekInMonth(year, month, 5); // 5 = Пятница
      fridays.forEach((friday, index) => {
        const isOdd = index % 2 === 0; // 0-й и 2-й (1-я и 3-я пятницы)
        result.push({
          id: idCounter--,
          date: toDateStr(friday),
          event_time: '09:00',
          title: isOdd
            ? 'Глобальный вайп с удалением чертежей'
            : 'Глобальный вайп без удаления чертежей',
          description: isOdd
            ? 'Глобальный вайп с удалением чертежей, начало в 09:00 по МСК'
            : 'Глобальный вайп без удаления чертежей, начало в 09:00 по МСК',
          color: isOdd ? '#7C3AED' : '#A855F7',
          servers: 'PVP сервера',
          isAuto: true,
        });
      });
    }
  }

  return result;
};

// Мержит события из БД с авто-событиями.
// Ручные события из БД всегда показываются как есть.
// Авто-события скрываются только если в БД есть событие на ту же дату И с тем же названием.
export const mergeEvents = (dbEvents: CalendarEvent[]): CalendarEvent[] => {
  const autoEvents = generateAutoEvents();

  // Ключ: "дата|название" — только так перекрываем конкретное авто-событие
  const dbKeys = new Set(
    dbEvents.map(e => `${e.date}|${e.title}`)
  );

  const filteredAuto = autoEvents.filter(
    e => !dbKeys.has(`${e.date}|${e.title}`)
  );

  // Записи с is_hidden — это метки удалённых авто-событий, их не показываем
  const visibleDb = dbEvents.filter(e => !e.is_hidden);

  return [...visibleDb, ...filteredAuto];
};