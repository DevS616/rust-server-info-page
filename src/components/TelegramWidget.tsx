import { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface TelegramWidgetProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

/* Pre-computed firework angles — no Math.random() in render */
const FIREWORK_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

const TelegramWidget = ({ forceOpen, onClose }: TelegramWidgetProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setTimeout(() => setShowFireworks(true), 400);
      return;
    }
    if (isMobile) return;

    const hiddenUntil = localStorage.getItem('telegram_widget_hidden_until');
    if (hiddenUntil) {
      const hiddenTime = parseInt(hiddenUntil);
      if (Date.now() < hiddenTime) return;
      localStorage.removeItem('telegram_widget_hidden_until');
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      setTimeout(() => setShowFireworks(true), 400);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isMobile, forceOpen]);

  const handleSubscribe = useCallback(() => {
    window.open('https://t.me/devilrust', '_blank', 'noopener,noreferrer');
  }, []);

  const handleAlreadySubscribed = useCallback(() => {
    localStorage.setItem('telegram_widget_hidden_until', (Date.now() + 86400000).toString());
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60] animate-fade-in">
      <div className="relative">
        {showFireworks && (
          <div className="absolute inset-0 pointer-events-none">
            {FIREWORK_ANGLES.map((angle, i) => (
              <div
                key={i}
                className="tg-firework absolute top-1/2 left-1/2 w-1 h-1 bg-primary rounded-full"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  '--angle': `${angle}deg`,
                  '--distance': '40px',
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent animate-pulse" />

          <div className="relative p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl animate-pulse" />
                <div className="relative bg-primary/20 p-2 rounded-xl border border-primary/40">
                  <Icon name="Send" className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Подпишись на Telegram!</div>
                <div className="text-xs text-muted-foreground">Новости и обновления</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSubscribe}
                size="sm"
                className="w-full font-semibold uppercase tracking-wider shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Icon name="Send" className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                Подпишись
              </Button>
              <button
                onClick={handleAlreadySubscribed}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Уже подписался
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />
        </div>
      </div>
    </div>
  );
};

export default memo(TelegramWidget);
