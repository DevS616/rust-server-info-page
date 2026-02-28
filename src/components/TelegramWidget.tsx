import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface TelegramWidgetProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const TelegramWidget = ({ forceOpen, onClose }: TelegramWidgetProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
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
      const now = new Date().getTime();
      
      if (now < hiddenTime) {
        return;
      } else {
        localStorage.removeItem('telegram_widget_hidden_until');
      }
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      setTimeout(() => setShowFireworks(true), 400);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isMobile, forceOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleSubscribe = () => {
    window.open('https://t.me/devilrust', '_blank', 'noopener,noreferrer');
  };

  const handleAlreadySubscribed = () => {
    const hideUntil = new Date().getTime() + (24 * 60 * 60 * 1000);
    localStorage.setItem('telegram_widget_hidden_until', hideUntil.toString());
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60] animate-fade-in">
      <div className="relative">
        {showFireworks && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 h-1 bg-primary rounded-full animate-firework"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  '--angle': `${(i * 30)}deg`,
                  '--distance': '40px',
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {isHovered && (
          <div className="absolute inset-0 pointer-events-none z-[61]">
            {Array.from({ length: 30 }).map((_, i) => {
              const colors = ['#ff4400', '#ffaa00', '#ffdd00', '#00ff88', '#0088ff', '#ff00ff', '#ff0066', '#00ffff'];
              const isConfetti = i >= 20;
              return (
                <div
                  key={`hover-${i}`}
                  className={`absolute ${isConfetti ? 'animate-confetti' : 'animate-firework-hover'}`}
                  style={{
                    left: `${mousePos.x}px`,
                    top: `${mousePos.y}px`,
                    width: isConfetti ? '8px' : '6px',
                    height: isConfetti ? '12px' : '6px',
                    background: colors[i % colors.length],
                    borderRadius: isConfetti ? '2px' : '50%',
                    animationDelay: `${i * 0.03}s`,
                    '--angle': `${(i * 12)}deg`,
                    '--distance': `${180 + Math.random() * 90}px`,
                    '--rotation': `${Math.random() * 720}deg`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}

        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onMouseMove={handleMouseMove}
          className={`relative bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/20 transition-all duration-500 overflow-visible ${isHovered ? 'animate-shake' : ''}`}
        >
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

      <style>{`
        @keyframes firework {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
            opacity: 1;
            scale: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance));
            opacity: 0;
            scale: 0.3;
          }
        }

        @keyframes firework-hover {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(0);
            opacity: 0;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-3px) rotate(-2deg); }
          20% { transform: translateX(3px) rotate(2deg); }
          30% { transform: translateX(-3px) rotate(-2deg); }
          40% { transform: translateX(3px) rotate(2deg); }
          50% { transform: translateX(-2px) rotate(-1deg); }
          60% { transform: translateX(2px) rotate(1deg); }
          70% { transform: translateX(-2px) rotate(-1deg); }
          80% { transform: translateX(2px) rotate(1deg); }
          90% { transform: translateX(-1px) rotate(-0.5deg); }
        }

        @keyframes confetti {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) rotate(var(--rotation));
            opacity: 0;
          }
        }

        .animate-firework {
          animation: firework 0.8s ease-out forwards;
        }

        .animate-firework-hover {
          animation: firework-hover 1.2s ease-out forwards;
        }

        .animate-confetti {
          animation: confetti 1.5s ease-out forwards;
        }

        .animate-shake {
          animation: shake 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TelegramWidget;