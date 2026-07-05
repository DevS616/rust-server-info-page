import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { sanitizeNewsHtml, isHtmlContent } from '@/utils/newsContent';

const categoryConfig: Record<string, { label: string; color: string }> = {
  update: { label: 'Обновление', color: 'bg-muted text-muted-foreground border-border' },
  event: { label: 'Ивент', color: 'bg-primary/10 text-primary border-primary/20' },
  wipe: { label: 'Вайп', color: 'bg-muted text-muted-foreground border-border' },
  news: { label: 'Новость', color: 'bg-muted text-muted-foreground border-border' },
};

interface PreviewData {
  title: string;
  description: string;
  date: string;
  category: string;
  icon: string;
  image_url?: string;
  imagePreview?: string | null;
  button_text?: string;
  button_url?: string;
}

interface NewsPreviewProps {
  open: boolean;
  onClose: () => void;
  data: PreviewData;
}

const NewsPreview = ({ open, onClose, data }: NewsPreviewProps) => {
  const cat = categoryConfig[data.category] || categoryConfig.news;
  const image = data.imagePreview || data.image_url;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Icon name="Eye" size={15} />
            Так новость увидят игроки на сайте
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Icon name={data.icon as Parameters<typeof Icon>[0]['name']} className="h-5 w-5 text-primary" fallback="Newspaper" />
              </div>
              <Badge variant="outline" className={cat.color}>
                {cat.label}
              </Badge>
            </div>
          </div>

          <h2 className="text-xl font-semibold leading-snug mb-1">
            {data.title || 'Заголовок новости'}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
            <Icon name="Calendar" size={13} />
            {data.date || 'Дата не указана'}
          </p>

          {image && (
            <div className="w-full h-56 overflow-hidden rounded-lg mb-4">
              <img src={image} alt={data.title} className="w-full h-full object-cover" />
            </div>
          )}

          {data.description ? (
            isHtmlContent(data.description) ? (
              <div
                className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(data.description) }}
              />
            ) : (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {data.description}
              </p>
            )
          ) : (
            <p className="text-muted-foreground italic">Описание пока пустое</p>
          )}

          {data.button_text && data.button_url && (
            <div className="pt-4 border-t mt-4">
              <Button className="w-full sm:w-auto" type="button">
                {data.button_text}
                <Icon name="ExternalLink" size={15} className="ml-2" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewsPreview;
