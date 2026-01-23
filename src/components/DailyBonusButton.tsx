import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';
import WeeklyBonusCrate from './WeeklyBonusCrate';
import BonusSelectionModal from './BonusSelectionModal';

const DailyBonusButton = () => {
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
    }
  }, []);

  // Проверка ежедневного бонуса
  useEffect(() => {
    const checkDailyAvailability = async () => {
      if (!steamId) {
        const lastSpin = localStorage.getItem('lastBonusSpin');
        if (!lastSpin) {
          setDailyCanClaim(true);
          return;
        }
        
        const lastSpinDate = new Date(lastSpin);
        const now = new Date();
        const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);
        setDailyCanClaim(hoursSinceLastSpin >= 24);
        return;
      }

      const cachedData = localStorage.getItem(`bonus_check_${steamId}`);
      if (cachedData) {
        const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached_at;
        
        if (cacheAge < 30 * 60 * 1000) {
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
        const lastBonus = localStorage.getItem('lastWeeklyBonus');
        if (!lastBonus) {
          setWeeklyCanClaim(true);
          return;
        }
        
        const lastBonusDate = new Date(lastBonus);
        const now = new Date();
        const daysSinceLastBonus = (now.getTime() - lastBonusDate.getTime()) / (1000 * 60 * 60 * 24);
        setWeeklyCanClaim(daysSinceLastBonus >= 7);
        return;
      }

      const cachedData = localStorage.getItem(`weekly_bonus_check_${steamId}`);
      if (cachedData) {
        const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached_at;
        
        if (cacheAge < 30 * 60 * 1000) {
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
  }, [steamId]);

  useEffect(() => {
    setIsChecking(false);
    
    const shouldOpenBonus = localStorage.getItem('bonus_after_auth');
    if (shouldOpenBonus === 'true' && canClaimAny) {
      localStorage.removeItem('bonus_after_auth');
      setTimeout(() => setShowSelection(true), 100);
    }
  }, [dailyCanClaim, weeklyCanClaim, canClaimAny]);

  // Обновление таймеров
  useEffect(() => {
    const interval = setInterval(() => {
      // Daily timer
      if (!dailyCanClaim) {
        if (steamId) {
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
        } else {
          const lastSpin = localStorage.getItem('lastBonusSpin');
          if (lastSpin) {
            const lastSpinDate = new Date(lastSpin);
            const nextAvailable = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
            const now = new Date();
            const diff = nextAvailable.getTime() - now.getTime();

            if (diff <= 0) {
              setDailyCanClaim(true);
              setDailyTimeLeft('');
            } else {
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              setDailyTimeLeft(`${hours}ч ${minutes}м`);
            }
          }
        }
      }

      // Weekly timer
      if (!weeklyCanClaim) {
        if (steamId) {
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
        } else {
          const lastBonus = localStorage.getItem('lastWeeklyBonus');
          if (lastBonus) {
            const lastBonusDate = new Date(lastBonus);
            const nextAvailable = new Date(lastBonusDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();
            const diff = nextAvailable.getTime() - now.getTime();

            if (diff <= 0) {
              setWeeklyCanClaim(true);
              setWeeklyTimeLeft('');
            } else {
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              setWeeklyTimeLeft(`${days}д ${hours}ч`);
            }
          }
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [dailyCanClaim, weeklyCanClaim, steamId]);

  if (isChecking) {
    return null;
  }

  const displayText = canClaimAny ? 'БОНУС' : dailyTimeLeft || weeklyTimeLeft || 'Скоро';

  return (
    <>
      <button
        onClick={() => setShowSelection(true)}
        className={`
          fixed bottom-20 md:bottom-24 right-4 md:right-8 z-40 
          px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl
          font-bold text-base md:text-lg
          transition-all duration-300
          ${canClaimAny 
            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 bg-[length:200%_100%] animate-gradient text-white shadow-[0_0_20px_rgba(245,158,11,0.6)] md:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] md:hover:shadow-[0_0_50px_rgba(245,158,11,0.8)] hover:scale-105 md:hover:scale-110 cursor-pointer' 
            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 cursor-pointer hover:scale-105'
          }
        `}
        style={canClaimAny ? {
          animation: 'gradient 3s ease infinite, pulse 2s ease-in-out infinite'
        } : undefined}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <div className={canClaimAny ? 'animate-bounce' : ''}>
            <Icon name="Gift" className="h-5 md:h-6 w-5 md:w-6 flex-shrink-0" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs md:text-sm opacity-90">Бонусы</span>
            <span className="text-lg md:text-xl font-black">
              {displayText}
            </span>
          </div>
          {canClaimAny && (
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
