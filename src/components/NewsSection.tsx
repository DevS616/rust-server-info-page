import { useState, useEffect, memo } from 'react';
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
  image_url?: string;
  is_published: boolean;
}

const categoryConfig = {
  update: { label: 'Обновление', color: 'bg-muted text-muted-foreground border-border' },
  event: { label: 'Ивент', color: 'bg-primary/10 text-primary border-primary/20' },
  wipe: { label: 'Вайп', color: 'bg-muted text-muted-foreground border-border' },
  news: { label: 'Новость', color: 'bg-muted text-muted-foreground border-border' }
};

const NewsSection = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      const CACHE_KEY = 'news_cache';
      const CACHE_DURATION = 6 * 60 * 60 * 1000;
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setNewsItems(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse news cache:', e);
        }
      }
      
      try {
        const res = await fetch('https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/');
        if (res.ok) {
          const data = await res.json();
          setNewsItems(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </section>
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

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
            <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-muted overflow-hidden">
              {item.image_url && (
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} className="h-6 w-6 text-primary" />
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

export default memo(NewsSection);