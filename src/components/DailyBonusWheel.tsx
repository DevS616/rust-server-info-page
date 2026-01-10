import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Confetti from 'react-confetti';

interface DailyBonusWheelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIZES = [
  { value: 1, chance: 50, color: '#FCD34D' },
  { value: 3, chance: 30, color: '#34D399' },
  { value: 5, chance: 15, color: '#60A5FA' },
  { value: 10, chance: 3, color: '#A78BFA' },
  { value: 20, chance: 2, color: '#F87171' }
];

const DailyBonusWheel = ({ isOpen, onClose }: DailyBonusWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isRewarded, setIsRewarded] = useState(false);
  const wheelRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const user = localStorage.getItem('steamUser');
    if (user) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setSteamId(userData.steamId);
    }
  }, []);

  const selectPrize = (): number => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const prize of PRIZES) {
      cumulative += prize.chance;
      if (random <= cumulative) {
        return prize.value;
      }
    }
    
    return PRIZES[0].value;
  };

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const handleSpin = async () => {
    if (isSpinning || result !== null) return;

    if (steamId) {
      try {
        const response = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steam_id: steamId })
          }
        );

        if (response.status === 404 || response.status === 429) {
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          alert(data.error || 'Не удалось начать прокрутку');
          return;
        }
      } catch (error) {
        console.error('Failed to record spin:', error);
      }
    }

    localStorage.setItem('lastBonusSpin', new Date().toISOString());
    
    setIsSpinning(true);
    setShowResult(false);
    
    const selectedPrize = selectPrize();
    const baseRotation = 360 * 50;
    const segments = 24;
    const segmentAngle = 360 / segments;
    
    const prizePositions = [
      0, 3, 6, 9, 12, 15, 18, 21,
      1, 4, 7, 10, 13, 16, 19, 22,
      2, 5, 8, 11, 14, 17, 20, 23
    ];
    
    const targetIndex = prizePositions.findIndex((_, i) => {
      if (selectedPrize === 1) return i < 8;
      if (selectedPrize === 3) return i >= 8 && i < 16;
      if (selectedPrize === 5) return i >= 16 && i < 20;
      if (selectedPrize === 10) return i >= 20 && i < 22;
      return i >= 22;
    });
    
    const targetAngle = prizePositions[targetIndex] * segmentAngle;
    const finalRotation = baseRotation + (360 - targetAngle) + (segmentAngle / 2);
    const duration = 3000 + Math.random() * 7000;

    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const currentRotation = finalRotation * easedProgress;
      setRotation(currentRotation);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setResult(selectedPrize);
        setIsSpinning(false);
        setShowResult(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleAuth = () => {
    const authWindow = window.open(
      'https://devilrust.ru/api/v1/player.login?login',
      'steam_auth',
      'width=800,height=600'
    );
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://devilrust.ru') return;
      
      if (event.data.type === 'steam_auth_success' && event.data.token) {
        window.location.href = `${window.location.origin}?auth_token=${event.data.token}`;
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    const checkWindow = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkWindow);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  };

  const handleClaim = async () => {
    if (!steamId || !result) return;

    try {
      const response = await fetch(
        'https://functions.poehali.dev/f417ccf5-cc33-4765-9f67-ff481ae7cf82/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steam_id: steamId,
            amount: result
          })
        }
      );

      if (response.status === 404 || response.status === 429) {
        return;
      }

      if (response.ok) {
        setIsRewarded(true);
      } else {
        const data = await response.json();
        alert(data.error || 'Не удалось получить бонус');
      }
    } catch (error) {
      console.error('Failed to claim bonus:', error);
      alert('Ошибка при получении бонуса');
    }
  };

  const resetWheel = () => {
    setResult(null);
    setShowResult(false);
    setRotation(0);
    setIsRewarded(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetWheel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            🎁 Ежедневный бонус
          </DialogTitle>
        </DialogHeader>

        {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

        <div className="space-y-6 py-4">
          {!showResult ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-full max-w-md aspect-square">
                <img
                  ref={wheelRef}
                  src="https://cdn.poehali.dev/files/WuV2sgnWGuHLkImX8YlCHAqXY2aJjrLLSBw8FdhEDoVFNpvMW1528yP13UKYGgCZ8ahTnvHtU3Y-WsbHahp8IpNB.png"
                  alt="Колесо фортуны"
                  className="w-full h-full object-contain"
                  style={{ 
                    transform: `rotate(${rotation}deg)`,
                    filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
                  }}
                />
                
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-primary drop-shadow-lg" />
                </div>
              </div>

              <Button
                onClick={handleSpin}
                disabled={isSpinning}
                size="lg"
                className="text-lg px-8 py-6"
              >
                {isSpinning ? (
                  <>
                    <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                    Крутим...
                  </>
                ) : (
                  <>
                    <Icon name="Gift" className="mr-2 h-5 w-5" />
                    Крутить колесо!
                  </>
                )}
              </Button>

              <Card className="p-4 w-full bg-muted/50 space-y-3">
                <div>
                  <h3 className="font-semibold mb-2 text-center">Призы:</h3>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold text-lg">1₽</div>
                      <div className="text-muted-foreground">50%</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">3₽</div>
                      <div className="text-muted-foreground">30%</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">5₽</div>
                      <div className="text-muted-foreground">15%</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">10₽</div>
                      <div className="text-muted-foreground">3%</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">20₽</div>
                      <div className="text-muted-foreground">2%</div>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    ⚠️ Бонус нельзя вывести в реальные деньги<br/>
                    Можно потратить только в донат-магазине{' '}
                    <a 
                      href="https://devilrust.ru" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      devilrust.ru
                    </a>
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-center space-y-4">
                <div className="text-6xl animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold">Поздравляем!</h2>
                <p className="text-5xl font-bold text-primary animate-pulse">
                  {result}₽
                </p>
                <p className="text-muted-foreground">
                  Вы выиграли {result} рублей на баланс!
                </p>
                <p className="text-xs text-muted-foreground pt-2">
                  Бонус можно потратить только в{' '}
                  <a 
                    href="https://devilrust.ru" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    донат-магазине
                  </a>
                </p>
              </div>

              {!isAuthenticated ? (
                <Card className="p-6 w-full text-center space-y-4 bg-primary/5">
                  <Icon name="LogIn" className="h-12 w-12 mx-auto text-primary" />
                  <p className="text-lg">
                    Авторизуйтесь через Steam, чтобы получить награду
                  </p>
                  <Button onClick={handleAuth} size="lg" className="w-full">
                    <Icon name="LogIn" className="mr-2 h-5 w-5" />
                    Войти через Steam
                  </Button>
                </Card>
              ) : isRewarded ? (
                <Card className="p-6 w-full text-center space-y-4 bg-green-500/10">
                  <Icon name="CheckCircle2" className="h-12 w-12 mx-auto text-green-500" />
                  <p className="text-lg font-semibold">Награда получена!</p>
                  <p className="text-muted-foreground">
                    {result}₽ зачислены на ваш баланс
                  </p>
                  <Button onClick={resetWheel} variant="outline" className="w-full">
                    Закрыть
                  </Button>
                </Card>
              ) : (
                <Button onClick={handleClaim} size="lg" className="w-full">
                  <Icon name="Gift" className="mr-2 h-5 w-5" />
                  Получить награду
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyBonusWheel;