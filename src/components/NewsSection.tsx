import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface NewsItem {
  id: number;
  title: string;
  description: string;
  date: string;
  category: 'update' | 'event' | 'wipe' | 'news';
  icon: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  is_published: boolean;
}

const categoryConfig = {
  update: { label: 'Обновление', color: 'bg-muted text-muted-foreground border-border' },
  event: { label: 'Ивент', color: 'bg-primary/10 text-primary border-primary/20' },
  wipe: { label: 'Вайп', color: 'bg-muted text-muted-foreground border-border' },
  news: { label: 'Новость', color: 'bg-muted text-muted-foreground border-border' }
};

const PREVIEW_LENGTH = 300;

const NewsSection = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    localStorage.removeItem('news_cache');
    fetch('https://functions.poehali.dev/e6be6494-14cb-4278-882b-d4498bef6cf6/')
      .then(r => r.ok ? r.json() : [])
      .then(data => setNewsItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (newsItems.length === 0) return null;

  return (
    <section className="py-20 px-4">
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
          {newsItems.map((item) => {
            const isLong = item.description.length > PREVIEW_LENGTH;
            const preview = isLong ? item.description.slice(0, PREVIEW_LENGTH).trimEnd() + '…' : item.description;

            return (
              <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-muted overflow-hidden flex flex-col">
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
                <CardContent className="flex flex-col flex-1">
                  <p className="text-muted-foreground leading-relaxed flex-1">{preview}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {isLong && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start text-primary hover:text-primary/80 px-0"
                        onClick={() => setSelectedNews(item)}
                      >
                        Читать полностью
                        <Icon name="ChevronRight" size={16} className="ml-1" />
                      </Button>
                    )}
                    {item.button_text && item.button_url && (
                      <a href={item.button_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          {item.button_text}
                          <Icon name="ExternalLink" size={14} className="ml-1.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

      {/* Модалка полной новости */}
      <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <Icon name={selectedNews.icon as Parameters<typeof Icon>[0]['name']} className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className={categoryConfig[selectedNews.category].color}>
                      {categoryConfig[selectedNews.category].label}
                    </Badge>
                  </div>
                </div>
                <DialogTitle className="text-xl leading-snug">{selectedNews.title}</DialogTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Icon name="Calendar" size={13} />
                  {selectedNews.date}
                </p>
              </DialogHeader>

              {selectedNews.image_url && (
                <div className="w-full h-56 overflow-hidden rounded-lg">
                  <img src={selectedNews.image_url} alt={selectedNews.title} className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedNews.description}
              </p>

              {selectedNews.button_text && selectedNews.button_url && (
                <div className="pt-4 border-t mt-2">
                  <a
                    href={selectedNews.button_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full sm:w-auto">
                      {selectedNews.button_text}
                      <Icon name="ExternalLink" size={15} className="ml-2" />
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default memo(NewsSection);