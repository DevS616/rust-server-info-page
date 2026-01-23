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
  const [isClaiming, setIsClaiming] = useState(false);
  const wheelRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    spinSoundRef.current = new Audio('https://cdn.poehali.dev/files/spin-sound.mp3');
    spinSoundRef.current.loop = true;
    winSoundRef.current = new Audio('https://cdn.poehali.dev/files/win-sound.mp3');
    
    return () => {
      if (spinSoundRef.current) {
        spinSoundRef.current.pause();
        spinSoundRef.current = null;
      }
      if (winSoundRef.current) {
        winSoundRef.current.pause();
        winSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('steam_user');
    console.log('DailyBonusWheel: checking auth', { hasUser: !!user, isOpen });
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('DailyBonusWheel: user data', { steamId: userData.steamId });
        setIsAuthenticated(true);
        setSteamId(userData.steamId);
      } catch (e) {
        console.error('DailyBonusWheel: failed to parse user', e);
      }
    } else {
      setIsAuthenticated(false);
      setSteamId(null);
    }
  }, [isOpen]);

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

    // Проверяем можно ли получить бонус перед прокруткой
    if (steamId) {
      try {
        const checkResponse = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`,
          { method: 'GET' }
        );

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (!checkData.can_claim) {
            const hours = Math.ceil(checkData.time_left / 3600);
            alert(`Вы уже получали бонус сегодня. Попробуйте через ${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check bonus availability:', error);
      }
    }

    setIsSpinning(true);
    setShowResult(false);
    
    if (spinSoundRef.current) {
      spinSoundRef.current.currentTime = 0;
      spinSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
    }
    
    const selectedPrize = selectPrize();
    const baseRotation = 360 * 5; // 5 полных оборотов для эффектности
    const segments = 25;
    const segmentAngle = 360 / segments; // 14.4 градуса на сектор
    
    // Расположение призов на колесе (по часовой стрелке, начиная с верха где указатель)
    const wheelLayout = [20, 1, 3, 1, 5, 1, 3, 1, 10, 1, 3, 1, 5, 1, 5, 3, 1, 10, 1, 3, 1, 5, 1, 3, 1];
    
    // Находим все индексы с выпавшим призом
    const possibleIndices = wheelLayout
      .map((prize, index) => prize === selectedPrize ? index : -1)
      .filter(index => index !== -1);
    
    // Выбираем случайный индекс из возможных
    const targetIndex = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
    
    // Рассчитываем угол для остановки (по часовой стрелке от верха)
    // Указатель вверху = 0°, поворачиваем колесо ПРОТИВ часовой для попадания
    const targetAngle = targetIndex * segmentAngle;
    
    // Финальный угол = много оборотов + угол до нужного сектора + центрирование
    const finalRotation = baseRotation + (360 - targetAngle);
    
    console.log('🎰 Wheel spin details:', {
      selectedPrize,
      targetIndex,
      targetAngle: targetAngle.toFixed(2),
      segmentAngle: segmentAngle.toFixed(2),
      finalRotation: finalRotation.toFixed(2),
      wheelLayout: wheelLayout.join(', ')
    });
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
        if (spinSoundRef.current) {
          spinSoundRef.current.pause();
        }
        if (winSoundRef.current) {
          winSoundRef.current.play().catch(e => console.log('Win sound play failed:', e));
        }
        
        setResult(selectedPrize);
        setIsSpinning(false);
        setShowResult(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        
        // Сразу фиксируем получение бонуса
        claimBonusImmediately(selectedPrize);
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
    localStorage.setItem('bonus_after_auth', 'true');
    const currentUrl = encodeURIComponent(window.location.origin);
    const authUrl = `https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${currentUrl}`;
    window.location.href = authUrl;
  };

  const claimBonusImmediately = async (prizeAmount: number) => {
    // Для неавторизованных - просто фиксируем локально
    if (!steamId) {
      localStorage.setItem('lastBonusSpin', new Date().toISOString());
      setIsRewarded(true);
      return;
    }

    setIsClaiming(true);

    try {
      // Получаем данные пользователя
      const userStr = localStorage.getItem('steam_user');
      let username = null;
      let avatar = null;
      
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          username = userData.personaname || userData.username;
          avatar = userData.avatarfull || userData.avatar;
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }

      // Записываем время получения бонуса в базу данных
      const recordResponse = await fetch(
        'https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            steam_id: steamId,
            amount: prizeAmount,
            username,
            avatar
          })
        }
      );

      if (!recordResponse.ok) {
        const data = await recordResponse.json();
        console.error('Record bonus error:', data);
        // Продолжаем даже при ошибке записи
      }

      // Выдаём бонус через API
      const claimResponse = await fetch(
        'https://functions.poehali.dev/f417ccf5-cc33-4765-9f67-ff481ae7cf82/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steam_id: steamId,
            amount: prizeAmount
          })
        }
      );

      if (claimResponse.ok) {
        localStorage.setItem('lastBonusSpin', new Date().toISOString());
        
        // Обновляем кэш для кнопки
        localStorage.setItem(`bonus_check_${steamId}`, JSON.stringify({
          can_claim: false,
          time_left: 24 * 3600,
          cached_at: Date.now()
        }));
        
        setIsRewarded(true);
      } else {
        const data = await claimResponse.json();
        console.error('Claim error:', data);
      }
    } catch (error) {
      console.error('Failed to claim bonus immediately:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaim = () => {
    // Теперь эта кнопка просто закрывает окно, бонус уже получен
    onClose();
  };

  const resetWheel = () => {
    if (spinSoundRef.current) {
      spinSoundRef.current.pause();
    }
    setResult(null);
    setShowResult(false);
    setRotation(0);
    setIsRewarded(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetWheel}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-full p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl text-center">
            🎁 Ежедневный бонус
          </DialogTitle>
        </DialogHeader>

        {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

        <div className="space-y-4 md:space-y-6 py-2 md:py-4">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <Icon name="Lock" className="h-16 w-16 text-amber-500" />
              <p className="text-center text-lg">
                Авторизуйтесь через Steam, чтобы получить ежедневный бонус
              </p>
              <Button
                onClick={handleAuth}
                size="lg"
                className="font-semibold"
              >
                <Icon name="LogIn" className="mr-2 h-5 w-5" />
                Войти через Steam
              </Button>
            </div>
          ) : !showResult ? (
            <div className="flex flex-col items-center gap-4 md:gap-6">
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
                className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 w-full md:w-auto"
              >
                {isSpinning ? (
                  <>
                    <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                    Крутим...
                  </>
                ) : (
                  <>
                    <Icon name="Gift" className="mr-2 h-4 md:h-5 w-4 md:w-5" />
                    Крутить колесо!
                  </>
                )}
              </Button>

              <Card className="p-3 md:p-4 w-full bg-muted/50 space-y-2 md:space-y-3">
                <div>
                  <h3 className="font-semibold mb-2 text-center text-sm md:text-base">Призы:</h3>
                  <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center text-xs md:text-sm">
                    <div>
                      <div className="font-bold text-base md:text-lg">1₽</div>
                      <div className="text-muted-foreground text-xs">50%</div>
                    </div>
                    <div>
                      <div className="font-bold text-base md:text-lg">3₽</div>
                      <div className="text-muted-foreground text-xs">30%</div>
                    </div>
                    <div>
                      <div className="font-bold text-base md:text-lg">5₽</div>
                      <div className="text-muted-foreground text-xs">15%</div>
                    </div>
                    <div>
                      <div className="font-bold text-base md:text-lg">10₽</div>
                      <div className="text-muted-foreground text-xs">3%</div>
                    </div>
                    <div>
                      <div className="font-bold text-base md:text-lg">20₽</div>
                      <div className="text-muted-foreground text-xs">2%</div>
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
            <div className="flex flex-col items-center gap-4 md:gap-6 py-4 md:py-8">
              <div className="text-center space-y-3 md:space-y-4">
                <div className="text-5xl md:text-6xl animate-bounce">🎉</div>
                <h2 className="text-2xl md:text-3xl font-bold">Поздравляем!</h2>
                <p className="text-4xl md:text-5xl font-bold text-primary animate-pulse">
                  {result}₽
                </p>
                <p className="text-sm md:text-base text-muted-foreground">
                  {isAuthenticated 
                    ? `${result}₽ автоматически зачислены на ваш баланс!` 
                    : `Вы выиграли ${result} рублей на баланс!`
                  }
                </p>
                {isAuthenticated && !isRewarded && (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                    <Icon name="Loader2" className="h-4 w-4 animate-spin" />
                    <span>Зачисление...</span>
                  </div>
                )}
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
                <Button 
                  onClick={handleClaim} 
                  size="lg" 
                  className="w-full"
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <>
                      <Icon name="Loader2" className="mr-2 h-5 w-5 animate-spin" />
                      Получение...
                    </>
                  ) : (
                    <>
                      Закрыть
                    </>
                  )}
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