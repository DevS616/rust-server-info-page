import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';

const DailyBonusButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canClaim, setCanClaim] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

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

  useEffect(() => {
    const checkAvailability = async () => {
      setIsChecking(true);
      
      if (!steamId) {
        const lastSpin = localStorage.getItem('lastBonusSpin');
        if (!lastSpin) {
          setCanClaim(true);
          setIsChecking(false);
          
          const shouldOpenBonus = localStorage.getItem('bonus_after_auth');
          if (shouldOpenBonus === 'true') {
            localStorage.removeItem('bonus_after_auth');
            setTimeout(() => setIsOpen(true), 100);
          }
          return;
        }
        
        const lastSpinDate = new Date(lastSpin);
        const now = new Date();
        const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);
        const available = hoursSinceLastSpin >= 24;
        setCanClaim(available);
        setIsChecking(false);
        
        if (available) {
          const shouldOpenBonus = localStorage.getItem('bonus_after_auth');
          if (shouldOpenBonus === 'true') {
            localStorage.removeItem('bonus_after_auth');
            setTimeout(() => setIsOpen(true), 100);
          }
        } else {
          localStorage.removeItem('bonus_after_auth');
        }
        return;
      }

      const cachedData = localStorage.getItem(`bonus_check_${steamId}`);
      if (cachedData) {
        const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
        const cacheAge = Date.now() - cached_at;
        
        if (cacheAge < 30 * 60 * 1000) {
          setCanClaim(can_claim);
          setIsChecking(false);
          
          if (!can_claim && time_left) {
            const remainingTime = time_left - Math.floor(cacheAge / 1000);
            if (remainingTime > 0) {
              const hours = Math.floor(remainingTime / 3600);
              const minutes = Math.floor((remainingTime % 3600) / 60);
              setTimeLeft(`${hours}ч ${minutes}м`);
              localStorage.removeItem('bonus_after_auth');
              return;
            }
          }
        }
      }

      try {
        const response = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`
        );
        
        if (response.status === 404 || response.status === 429) {
          setIsChecking(false);
          localStorage.removeItem('bonus_after_auth');
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          setCanClaim(data.can_claim);
          setIsChecking(false);
          
          localStorage.setItem(`bonus_check_${steamId}`, JSON.stringify({
            can_claim: data.can_claim,
            time_left: data.time_left,
            cached_at: Date.now()
          }));
          
          if (!data.can_claim && data.time_left) {
            const hours = Math.floor(data.time_left / 3600);
            const minutes = Math.floor((data.time_left % 3600) / 60);
            setTimeLeft(`${hours}ч ${minutes}м`);
            localStorage.removeItem('bonus_after_auth');
          } else if (data.can_claim) {
            const shouldOpenBonus = localStorage.getItem('bonus_after_auth');
            if (shouldOpenBonus === 'true') {
              localStorage.removeItem('bonus_after_auth');
              setTimeout(() => setIsOpen(true), 100);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check availability:', error);
        setIsChecking(false);
        localStorage.removeItem('bonus_after_auth');
      }
    };

    checkAvailability();
  }, [steamId]);

  useEffect(() => {
    if (canClaim) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      if (steamId) {
        const cachedData = localStorage.getItem(`bonus_check_${steamId}`);
        if (cachedData) {
          const { can_claim, time_left, cached_at } = JSON.parse(cachedData);
          const cacheAge = Date.now() - cached_at;
          const remainingTime = time_left - Math.floor(cacheAge / 1000);
          
          if (remainingTime <= 0) {
            setTimeLeft('');
            setCanClaim(true);
            localStorage.removeItem(`bonus_check_${steamId}`);
            return;
          }
          
          const hours = Math.floor(remainingTime / 3600);
          const minutes = Math.floor((remainingTime % 3600) / 60);
          setTimeLeft(`${hours}ч ${minutes}м`);
        }
      } else {
        const lastSpin = localStorage.getItem('lastBonusSpin');
        if (!lastSpin) return;

        const lastSpinDate = new Date(lastSpin);
        const nextAvailable = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = nextAvailable.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft('');
          setCanClaim(true);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}ч ${minutes}м`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [canClaim, steamId]);

  // Скрываем кнопку если колесо открыто или идет проверка
  if (isOpen || isChecking) {
    return <DailyBonusWheel isOpen={isOpen} onClose={() => setIsOpen(false)} />;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!canClaim}
        className={`
          fixed bottom-24 right-8 z-40 
          px-6 py-4 rounded-2xl
          font-bold text-lg
          transition-all duration-300
          ${canClaim 
            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 bg-[length:200%_100%] animate-gradient text-white shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_50px_rgba(245,158,11,0.8)] hover:scale-110 cursor-pointer' 
            : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
          }
        `}
        style={canClaim ? {
          animation: 'gradient 3s ease infinite, pulse 2s ease-in-out infinite'
        } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className={canClaim ? 'animate-bounce' : ''}>
            <Icon name="Gift" className="h-6 w-6 flex-shrink-0" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm opacity-90">Ежедневный</span>
            <span className="text-xl font-black">
              {canClaim ? 'БОНУС' : timeLeft}
            </span>
          </div>
          {canClaim && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              ПОЛУЧИ
            </div>
          )}
        </div>
      </button>

      <DailyBonusWheel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      
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