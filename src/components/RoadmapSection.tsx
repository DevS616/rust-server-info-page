import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

const ROADMAP_URL = 'https://functions.poehali.dev/bccc018e-abaf-434e-a899-688b45fcb58b';
const PREVIEW_LENGTH = 130;

interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'done' | 'fixed';
  icon: string;
  color: string;
  sort_order: number;
  updated_at: string;
}

const statusConfig = {
  planned: { label: 'Запланировано', color: 'bg-muted/60 text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  in_progress: { label: 'В разработке', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500' },
  done: { label: 'Готово', color: 'bg-green-500/10 text-green-500 border-green-500/20', dot: 'bg-green-500' },
  fixed: { label: 'Исправлено', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dot: 'bg-blue-500' },
};

function DescriptionText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function RoadmapSection() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoadmapItem | null>(null);

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
    fixed: items.filter(i => i.status === 'fixed'),
    done: items.filter(i => i.status === 'done'),
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="Map" size={22} className="text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">Дорожная карта</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-8">Планы по развитию проекта</p>

        <div className="flex flex-col gap-6">
          {(['in_progress', 'planned', 'fixed', 'done'] as const).map(statusKey => {
            const group = grouped[statusKey];
            if (group.length === 0) return null;
            const cfg = statusConfig[statusKey];
            return (
              <div key={statusKey}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {cfg.label}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(item => {
                    const isLong = item.description.length > PREVIEW_LENGTH;
                    const preview = isLong
                      ? item.description.slice(0, PREVIEW_LENGTH).trimEnd() + '…'
                      : item.description;
                    const itemColor = item.color || '#f97316';

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-xl border bg-card p-4 flex flex-col gap-2 transition-colors"
                        style={{ borderColor: 'hsl(var(--border))' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = itemColor)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                              style={{ backgroundColor: `${itemColor}1a`, color: itemColor }}
                            >
                              <Icon name={item.icon} size={16} fallback="Map" />
                            </span>
                            <span className="font-semibold text-sm leading-tight">{item.title}</span>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground text-xs leading-relaxed flex-1">
                          <DescriptionText text={preview} />
                        </p>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1 text-muted-foreground/60">
                            <Icon name="Clock" size={11} />
                            <span className="text-[11px]">Обновлено {item.updated_at}</span>
                          </div>
                          {isLong && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto px-0 py-0 text-xs hover:bg-transparent"
                              style={{ color: itemColor }}
                              onClick={() => setSelected(item)}
                            >
                              Читать далее
                              <Icon name="ChevronRight" size={13} className="ml-0.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: `${selected.color || '#f97316'}1a`, color: selected.color || '#f97316' }}
                  >
                    <Icon name={selected.icon} size={18} fallback="Map" />
                  </span>
                  <DialogTitle className="text-left leading-snug">{selected.title}</DialogTitle>
                </div>
                <Badge variant="outline" className={`w-fit text-xs ${statusConfig[selected.status].color}`}>
                  {statusConfig[selected.status].label}
                </Badge>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {selected.description}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground/60 pt-2 border-t">
                <Icon name="Clock" size={12} />
                <span className="text-xs">Обновлено {selected.updated_at}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}