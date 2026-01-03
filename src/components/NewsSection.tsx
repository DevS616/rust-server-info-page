import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface NewsItem {
  id: number;
  title: string;
  description: string;
  date: string;
  category: 'update' | 'event' | 'wipe' | 'news';
  icon: string;
}

const newsItems: NewsItem[] = [
  {
    id: 1,
    title: 'Новогодний ивент 2026',
    description: 'Начался праздничный ивент с уникальными наградами и х2 к дропу подарков! Собирайте новогодние ящики и получайте эксклюзивные скины.',
    date: '25 декабря 2025',
    category: 'event',
    icon: 'Gift'
  },
  {
    id: 2,
    title: 'Еженедельный вайп серверов',
    description: 'Запланирован вайп всех х2-х10 серверов. Карты обновлены, добавлены новые монументы. Приготовьтесь к свежему старту!',
    date: '4 января 2026',
    category: 'wipe',
    icon: 'RefreshCw'
  },
  {
    id: 3,
    title: 'Обновление античита',
    description: 'Внедрена новая система защиты от читеров. Мы постоянно работаем над безопасностью игры и честной игровой средой для всех игроков.',
    date: '28 декабря 2025',
    category: 'update',
    icon: 'Shield'
  },
  {
    id: 4,
    title: 'Открытие 10-го сервера',
    description: 'Скоро откроется новый х100 сервер для любителей быстрого прогресса! Следите за анонсами в нашем Telegram канале.',
    date: 'Скоро',
    category: 'news',
    icon: 'Rocket'
  }
];

const categoryConfig = {
  update: { label: 'Обновление', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  event: { label: 'Ивент', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  wipe: { label: 'Вайп', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  news: { label: 'Новость', color: 'bg-green-500/10 text-green-500 border-green-500/20' }
};

const NewsSection = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Новости и обновления
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Следите за последними событиями, обновлениями и анонсами серверов DevilRust
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {newsItems.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-muted">
              <CardHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon name={item.icon} className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="outline" className={categoryConfig[item.category].color}>
                    {categoryConfig[item.category].label}
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {item.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm">
                  <Icon name="Calendar" className="h-4 w-4" />
                  {item.date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Хотите быть в курсе всех новостей? Подписывайтесь на наш Telegram!
          </p>
          <a
            href="https://t.me/devilrust"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Icon name="Send" className="h-5 w-5" />
            Telegram канал
          </a>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
