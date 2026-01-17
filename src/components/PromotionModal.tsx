import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface PromotionData {
  enabled: boolean;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  button: {
    text: string;
    url: string;
  };
  styling: {
    showGifts: boolean;
    accentColor: string;
    animation: string;
  };
  behavior: {
    showOnce: boolean;
    cookieName: string;
  };
}

const PromotionModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [promotionData, setPromotionData] = useState<PromotionData | null>(null);

  useEffect(() => {
    const loadPromotion = async () => {
      const CACHE_KEY = 'promotion_cache';
      const CACHE_DURATION = 30 * 60 * 1000;
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setPromotionData(data);
            return;
          }
        } catch (e) {
          console.error('Failed to parse promotion cache:', e);
        }
      }
      
      try {
        const response = await fetch('https://functions.poehali.dev/6bf5dace-312e-443f-8666-9af4a8112d1c/');
        if (response.ok) {
          const data = await response.json();
          setPromotionData(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Failed to load promotion:', error);
      }
    };
    
    loadPromotion();
  }, []);

  useEffect(() => {
    if (!promotionData) return;
    
    console.log('PromotionModal: useEffect started');
    console.log('Promotion enabled:', promotionData.enabled);
    
    if (!promotionData.enabled) {
      console.log('PromotionModal: disabled, exiting');
      return;
    }

    const now = new Date().getTime();
    const start = new Date(promotionData.startDate).getTime();
    const end = new Date(promotionData.endDate).getTime();

    console.log('PromotionModal dates:', {
      now: new Date(now).toISOString(),
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      isActive: now >= start && now <= end
    });

    const checkPromotion = () => {
      if (now < start) {
        console.log('PromotionModal: not started yet');
        return false;
      }
      
      if (now > end) {
        console.log('PromotionModal: already ended');
        return false;
      }

      const hiddenUntil = localStorage.getItem('promotion_hidden_until');
      if (hiddenUntil) {
        const hiddenTime = parseInt(hiddenUntil);
        if (now < hiddenTime) {
          console.log('PromotionModal: hidden until', new Date(hiddenTime).toISOString());
          return false;
        } else {
          localStorage.removeItem('promotion_hidden_until');
        }
      }

      const cookieName = promotionData.behavior.cookieName;
      const seen = localStorage.getItem(cookieName);
      
      console.log('PromotionModal: showOnce:', promotionData.behavior.showOnce, 'seen:', seen);
      
      if (promotionData.behavior.showOnce && seen) {
        console.log('PromotionModal: already shown, skipping');
        return false;
      }

      console.log('PromotionModal: should show');
      return true;
    };

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(promotionData.endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft(null);
        setIsOpen(false);
        return false;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      return true;
    };

    updateTimer();

    if (checkPromotion()) {
      console.log('PromotionModal: opening in 1 second');
      setTimeout(() => {
        console.log('PromotionModal: opening now');
        setIsOpen(true);
      }, 1000);
    }

    const timer = setInterval(() => {
      if (!updateTimer()) {
        clearInterval(timer);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [promotionData]);

  const handleRemindLater = () => {
    const hideUntil = new Date().getTime() + (60 * 60 * 1000);
    localStorage.setItem('promotion_hidden_until', hideUntil.toString());
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (promotionData) {
      window.open(promotionData.button.url, '_blank');
      setIsOpen(false);
    }
  };

  if (!isOpen || !timeLeft || !promotionData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in" onClick={handleRemindLater} />
      
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-lg px-4">
        <div className="relative bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden animate-scale-in">
          
          {promotionData.styling.showGifts && (
            <>
              <div className="absolute -top-6 -left-6 text-6xl animate-bounce-slow">
                🎁
              </div>
              <div className="absolute -top-4 -right-4 text-5xl animate-bounce-slow-delay">
                🎉
              </div>
              <div className="absolute -bottom-4 -left-4 text-5xl animate-bounce-slow-delay-2">
                ✨
              </div>
              <div className="absolute -bottom-6 -right-6 text-6xl animate-bounce-slow">
                🎊
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse-slow" />

          <div className="relative p-8 text-center space-y-6">
            <div className="space-y-2">
              <div className="inline-block px-4 py-1 bg-primary/20 border border-primary/40 rounded-full text-sm font-semibold text-primary mb-2 animate-pulse">
                🔥 Горячее предложение
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight animate-glow">
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  {promotionData.title}
                </span>
              </h2>
              
              <p className="text-muted-foreground max-w-md mx-auto text-base">
                {promotionData.subtitle}
              </p>
            </div>

            <div className="bg-background/80 backdrop-blur-sm border border-primary/20 rounded-xl p-6 space-y-4">
              <div className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                ⏰ Акция заканчивается через:
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-3">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {timeLeft.days}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    дней
                  </div>
                </div>
                
                <div className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-3">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    часов
                  </div>
                </div>
                
                <div className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-3">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    минут
                  </div>
                </div>
                
                <div className="bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-3 animate-pulse">
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    секунд
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleButtonClick}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all animate-pulse-glow"
            >
              <Icon name="ShoppingBag" className="mr-2 h-5 w-5" />
              {promotionData.button.text}
              <Icon name="ArrowRight" className="ml-2 h-5 w-5" />
            </Button>

            <button
              onClick={handleRemindLater}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Напомнить позже
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(10deg);
          }
        }

        @keyframes bounce-slow-delay {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(-10deg);
          }
        }

        @keyframes bounce-slow-delay-2 {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-25px) rotate(15deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(255, 68, 0, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 30px rgba(255, 68, 0, 0.8));
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(255, 68, 0, 0.3);
          }
          50% {
            box-shadow: 0 10px 60px rgba(255, 68, 0, 0.5);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        .animate-bounce-slow-delay {
          animation: bounce-slow-delay 3s ease-in-out infinite 0.5s;
        }

        .animate-bounce-slow-delay-2 {
          animation: bounce-slow-delay-2 3s ease-in-out infinite 1s;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default PromotionModal;