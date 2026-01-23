import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface ServerDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  server: {
    id: string;
    name: string;
    mode: string;
    ip: string;
    serverIp: string;
    battlemetricsId: string;
    description: string;
    features: string[];
    detailedDescription?: {
      title: string;
      highlights: Array<{ icon: string; text: string }>;
      description: string;
    };
  } | null;
  detailedDescription: {
    title: string;
    highlights: Array<{ icon: string; text: string }>;
    description: string;
  } | undefined;
  onConnect: (server: any) => void;
}

const ServerDetailsDialog = ({
  isOpen,
  onOpenChange,
  server,
  detailedDescription,
  onConnect,
}: ServerDetailsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{server?.name}</DialogTitle>
          <DialogDescription className="text-base">
            {server?.description}
          </DialogDescription>
        </DialogHeader>

        {server && detailedDescription && (
          <div className="space-y-6 mt-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">{detailedDescription.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detailedDescription.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Icon name={highlight.icon as any} className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{highlight.text}</span>
                  </div>
                ))}
              </div>
              {detailedDescription.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {detailedDescription.description}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Check" className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Ванильный опыт</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Check" className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Вайп 1 раз в месяц</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Check" className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Базы для рейдов</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="Check" className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Статистика</span>
            </div>
          </div>

          <Button 
            className="w-full font-semibold uppercase tracking-wider" 
            size="lg"
            onClick={() => {
              if (server) {
                onConnect(server);
                onOpenChange(false);
              }
            }}
          >
            <Icon name="Rocket" className="mr-2 h-5 w-5" />
            Подключиться к серверу
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerDetailsDialog;
