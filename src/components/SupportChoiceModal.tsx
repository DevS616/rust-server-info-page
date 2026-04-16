import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface SupportChoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const SupportChoiceModal = ({ open, onClose }: SupportChoiceModalProps) => {
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-wider">Чем можем помочь?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          {/* Жалоба */}
          <button
            onClick={() => go('/complaints')}
            className="group flex items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 px-5 py-4 text-left transition-all hover:border-destructive/60"
          >
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/15">
              <Icon name="AlertTriangle" size={20} className="text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-destructive transition-colors">
                Подать жалобу
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                На игрока или Администратора
              </p>
            </div>
            <Icon name="ChevronRight" size={18} className="ml-auto mt-3 text-muted-foreground/50 group-hover:text-destructive transition-colors flex-shrink-0" />
          </button>

          {/* Поддержка */}
          <button
            onClick={() => go('/support')}
            className="group flex items-start gap-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 px-5 py-4 text-left transition-all hover:border-primary/60"
          >
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Icon name="MessageCircle" size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Написать в поддержку
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Нашли ошибку? Есть предложения? Решение проблем и обратная связь с Администрацией
              </p>
            </div>
            <Icon name="ChevronRight" size={18} className="ml-auto mt-3 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportChoiceModal;
