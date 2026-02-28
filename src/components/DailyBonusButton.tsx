import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';
import WeeklyBonusCrate from './WeeklyBonusCrate';
import BonusSelectionModal from './BonusSelectionModal';

interface DailyBonusButtonProps {
  openFromMenu?: boolean;
  onMenuOpenHandled?: () => void;
  onAvailabilityChange?: (available: boolean) => void;
}

const DailyBonusButton = ({ openFromMenu, onMenuOpenHandled, onAvailabilityChange }: DailyBonusButtonProps = {}) => {
  const [showSelection, setShowSelection] = useState(false);
  const [showDailyWheel, setShowDailyWheel] = useState(false);
  const [showWeeklyCrate, setShowWeeklyCrate] = useState(false);
  const [dailyTimeLeft, setDailyTimeLeft] = useState<string>('');
  const [weeklyTimeLeft, setWeeklyTimeLeft] = useState<string>('');
  const [dailyCanClaim, setDailyCanClaim] = useState(false);
  const [weeklyCanClaim, setWeeklyCanClaim] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const canClaimAny = dailyCanClaim || weeklyCanClaim;

  useEffect(() => {
    const user = localStorage.getItem('steam_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setSteamId(userData.steamId);
      } catch (e) {
        console.error('Failed to parse steam_user:', e);
      }
    } else {
      // Если пользователь не авторизован, сбрасываем steamId
      setSteamId(null);
      // Сбрасываем состояния бонусов для неавторизованных
      setDailyCanClaim(false);
      setWeeklyCanClaim(false);
      setDailyTimeLeft('');
      setWeeklyTimeLeft('');
    }
  }, []);

  // Проверка ежедневного бонуса
  useEffect(() => {
    const checkDailyAvailability = async () => {
      if (!steamId) {
        // Для неавторизованных - не показываем кнопку как доступную
        setDailyCanClaim(false);
        return;
      }

      const cachedData = localStorage.getItem(`bonus_check_${steamId}`);
      if (cachedData) {
        const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached_at;
        
        if (cacheAge < 2 * 60 * 60 * 1000) {
          setDailyCanClaim(can_claim);
          
          if (!can_claim && time_left) {
            const remainingTime = time_left - Math.floor(cacheAge / 1000);
            if (remainingTime > 0) {
              const hours = Math.floor(remainingTime / 3600);
              const minutes = Math.floor((remainingTime % 3600) / 60);
              setDailyTimeLeft(`${hours}ч ${minutes}м`);
              return;
            }
          }
        }
      }

      try {
        const response = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setDailyCanClaim(data.can_claim);
          
          localStorage.setItem(`bonus_check_${steamId}`, JSON.stringify({
            can_claim: data.can_claim,
            time_left: data.time_left,
            cached_at: Date.now()
          }));
          
          if (!data.can_claim && data.time_left) {
            const hours = Math.floor(data.time_left / 3600);
            const minutes = Math.floor((data.time_left % 3600) / 60);
            setDailyTimeLeft(`${hours}ч ${minutes}м`);
          }
        }
      } catch (error) {
        console.error('Failed to check daily availability:', error);
      }
    };

    checkDailyAvailability();
  }, [steamId]);

  // Проверка еженедельного бонуса
  useEffect(() => {
    const checkWeeklyAvailability = async () => {
      if (!steamId) {
        // Для неавторизованных - не показываем кнопку как доступную
        setWeeklyCanClaim(false);
        return;
      }

      const cachedData = localStorage.getItem(`weekly_bonus_check_${steamId}`);
      if (cachedData) {
        const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached_at;
        
        if (cacheAge < 2 * 60 * 60 * 1000) {
          setWeeklyCanClaim(can_claim);
          
          if (!can_claim && time_left) {
            const remainingTime = time_left - Math.floor(cacheAge / 1000);
            if (remainingTime > 0) {
              const days = Math.floor(remainingTime / 86400);
              const hours = Math.floor((remainingTime % 86400) / 3600);
              setWeeklyTimeLeft(`${days}д ${hours}ч`);
              return;
            }
          }
        }
      }

      try {
        const response = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}&bonus_type=weekly`
        );
        
        if (response.ok) {
          const data = await response.json();
          setWeeklyCanClaim(data.can_claim);
          
          localStorage.setItem(`weekly_bonus_check_${steamId}`, JSON.stringify({
            can_claim: data.can_claim,
            time_left: data.time_left,
            cached_at: Date.now()
          }));
          
          if (!data.can_claim && data.time_left) {
            const days = Math.floor(data.time_left / 86400);
            const hours = Math.floor((data.time_left % 86400) / 3600);
            setWeeklyTimeLeft(`${days}д ${hours}ч`);
          }
        }
      } catch (error) {
        console.error('Failed to check weekly availability:', error);
      }
    };

    checkWeeklyAvailability();
    
    // Слушаем событие обновления бонусов
    const handleBonusUpdate = () => {
      checkWeeklyAvailability();
    };
    
    window.addEventListener('bonusUpdated', handleBonusUpdate);
    return () => window.removeEventListener('bonusUpdated', handleBonusUpdate);
  }, [steamId]);

  useEffect(() => {
    setIsChecking(false);
    
    const shouldOpenBonus = localStorage.getItem('bonus_after_auth');
    if (shouldOpenBonus === 'true' && canClaimAny) {
      localStorage.removeItem('bonus_after_auth');
      setTimeout(() => setShowSelection(true), 100);
    }

    onAvailabilityChange?.(canClaimAny);
  }, [dailyCanClaim, weeklyCanClaim, canClaimAny]);

  useEffect(() => {
    if (openFromMenu && !isChecking) {
      handleButtonClick();
      onMenuOpenHandled?.();
    }
  }, [openFromMenu]);

  // Обновление таймеров (только для авторизованных)
  useEffect(() => {
    if (!steamId) return; // Не обновляем таймеры для неавторизованных
    
    const interval = setInterval(() => {
      // Daily timer
      if (!dailyCanClaim) {
        const cachedData = localStorage.getItem(`bonus_check_${steamId}`);
        if (cachedData) {
          const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
          const cacheAge = Date.now() - cached_at;
          const remainingTime = time_left - Math.floor(cacheAge / 1000);
          
          if (remainingTime <= 0) {
            setDailyCanClaim(true);
            setDailyTimeLeft('');
          } else {
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            setDailyTimeLeft(`${hours}ч ${minutes}м`);
          }
        }
      }

      // Weekly timer
      if (!weeklyCanClaim) {
        const cachedData = localStorage.getItem(`weekly_bonus_check_${steamId}`);
        if (cachedData) {
          const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
          const cacheAge = Date.now() - cached_at;
          const remainingTime = time_left - Math.floor(cacheAge / 1000);
          
          if (remainingTime <= 0) {
            setWeeklyCanClaim(true);
            setWeeklyTimeLeft('');
          } else {
            const days = Math.floor(remainingTime / 86400);
            const hours = Math.floor((remainingTime % 86400) / 3600);
            setWeeklyTimeLeft(`${days}д ${hours}ч`);
          }
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [dailyCanClaim, weeklyCanClaim, steamId]);

  if (isChecking) {
    return null;
  }

  // Для неавторизованных показываем как доступный
  const isAvailable = !steamId || canClaimAny;
  
  // Определяем текст: "Открыть" для доступных, таймер для кулдауна
  let displayText = 'Открыть';
  if (steamId && !canClaimAny) {
    // Показываем ближайший доступный таймер
    displayText = dailyTimeLeft || weeklyTimeLeft || 'Открыть';
  }

  const handleButtonClick = () => {
    if (!steamId) {
      // Если не авторизован - сразу перенаправляем на авторизацию
      const currentUrl = encodeURIComponent(window.location.origin);
      const authUrl = `https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${currentUrl}`;
      localStorage.setItem('bonus_after_auth', 'true');
      window.location.href = authUrl;
    } else {
      // Если авторизован - показываем выбор бонусов
      setShowSelection(true);
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className={`
          hidden md:flex fixed bottom-24 right-8 z-40 
          px-6 py-4 rounded-2xl
          font-bold text-lg
          transition-all duration-300
          ${isAvailable
            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 bg-[length:200%_100%] animate-gradient text-white shadow-[0_0_20px_rgba(245,158,11,0.6)] md:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] md:hover:shadow-[0_0_50px_rgba(245,158,11,0.8)] hover:scale-105 md:hover:scale-110 cursor-pointer' 
            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 cursor-pointer hover:scale-105'
          }
        `}
        style={isAvailable ? {
          animation: 'gradient 3s ease infinite, pulse 2s ease-in-out infinite'
        } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className={isAvailable ? 'animate-bounce' : ''}>
            <Icon name="Gift" className="h-6 w-6 flex-shrink-0" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm opacity-90">Бонусы</span>
            <span className="text-xl font-black">
              {displayText}
            </span>
          </div>
          {isAvailable && (
            <div className="absolute -top-1.5 md:-top-2 -right-1.5 md:-right-2 bg-red-500 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full animate-pulse">
              ПОЛУЧИ
            </div>
          )}
        </div>
      </button>

      <BonusSelectionModal
        isOpen={showSelection}
        onClose={() => setShowSelection(false)}
        onSelectDaily={() => setShowDailyWheel(true)}
        onSelectWeekly={() => setShowWeeklyCrate(true)}
        dailyAvailable={dailyCanClaim}
        weeklyAvailable={weeklyCanClaim}
        dailyTimeLeft={dailyTimeLeft}
        weeklyTimeLeft={weeklyTimeLeft}
      />

      <DailyBonusWheel isOpen={showDailyWheel} onClose={() => setShowDailyWheel(false)} />
      <WeeklyBonusCrate isOpen={showWeeklyCrate} onClose={() => setShowWeeklyCrate(false)} />
      
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
};

export default DailyBonusButton;