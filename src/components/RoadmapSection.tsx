import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const ROADMAP_URL = 'https://functions.poehali.dev/bccc018e-abaf-434e-a899-688b45fcb58b';

interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'done';
  icon: string;
  sort_order: number;
  updated_at: string;
}

const statusConfig = {
  planned: {
    label: 'Запланировано',
    color: 'bg-muted/60 text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  in_progress: {
    label: 'В разработке',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  done: {
    label: 'Готово',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    dot: 'bg-green-500',
  },
};

export default function RoadmapSection() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(ROADMAP_URL)
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  const grouped = {
    in_progress: items.filter(i => i.status === 'in_progress'),
    planned: items.filter(i => i.status === 'planned'),
    done: items.filter(i => i.status === 'done'),
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="Map" size={22} className="text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">Дорожная карта</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          Планы по развитию проекта
        </p>

        <div className="flex flex-col gap-3">
          {(['in_progress', 'planned', 'done'] as const).map(statusKey => {
            const group = grouped[statusKey];
            if (group.length === 0) return null;
            const cfg = statusConfig[statusKey];
            return (
              <div key={statusKey}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(item => (
                    <div
                      key={item.id}
                      className="relative rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Icon name={item.icon} size={16} fallback="Map" />
                          </span>
                          <span className="font-semibold text-sm leading-tight">{item.title}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed flex-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1 text-muted-foreground/60 mt-1">
                        <Icon name="Clock" size={11} />
                        <span className="text-[11px]">Обновлено {item.updated_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
