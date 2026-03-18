import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';
import WeeklyBonusCrate from './WeeklyBonusCrate';
import BonusSelectionModal from './BonusSelectionModal';

interface DailyBonusButtonProps {
  openFromMenu?: boolean;
  onMenuOpenHandled?: () => void;
  onAvailabilityChange?: (available: boolean) => void;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}ч ${m}м`;
};

const formatWeeklyTime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}д ${h}ч`;
};

const CACHE_DURATION = 5 * 60 * 1000;

const DailyBonusButton = ({ openFromMenu, onMenuOpenHandled, onAvailabilityChange }: DailyBonusButtonProps = {}) => {
  const [showSelection, setShowSelection] = useState(false);
  const [showDailyWheel, setShowDailyWheel] = useState(false);
  const [showWeeklyCrate, setShowWeeklyCrate] = useState(false);
  const [dailyTimeLeft, setDailyTimeLeft] = useState('');
  const [weeklyTimeLeft, setWeeklyTimeLeft] = useState('');
  const [dailyCanClaim, setDailyCanClaim] = useState(false);
  const [weeklyCanClaim, setWeeklyCanClaim] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const canClaimAny = dailyCanClaim || weeklyCanClaim;

  useEffect(() => {
    try {
      const user = localStorage.getItem('steam_user');
      if (user) {
        const userData = JSON.parse(user);
        setSteamId(userData.steamId);
      } else {
        setSteamId(null);
        setDailyCanClaim(false);
        setWeeklyCanClaim(false);
        setDailyTimeLeft('');
        setWeeklyTimeLeft('');
      }
    } catch {
      setSteamId(null);
    }
  }, []);

  useEffect(() => {
    if (!steamId) { setDailyCanClaim(false); return; }

    const checkDaily = async () => {
      const cacheKey = `bonus_check_${steamId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { can_claim, time_left, cached_at } = JSON.parse(cached);
          const age = Date.now() - cached_at;
          if (age < CACHE_DURATION) {
            setDailyCanClaim(can_claim);
            if (!can_claim && time_left) {
              const remaining = time_left - Math.floor(age / 1000);
              if (remaining > 0) { setDailyTimeLeft(formatTime(remaining)); return; }
            }
          }
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(`https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`);
        if (res.ok) {
          const data = await res.json();
          setDailyCanClaim(data.can_claim);
          localStorage.setItem(cacheKey, JSON.stringify({ can_claim: data.can_claim, time_left: data.time_left, cached_at: Date.now() }));
          if (!data.can_claim && data.time_left) setDailyTimeLeft(formatTime(data.time_left));
        }
      } catch { /* ignore */ }
    };

    checkDaily();
  }, [steamId]);

  const checkWeekly = useCallback(async () => {
    if (!steamId) { setWeeklyCanClaim(false); return; }
    const cacheKey = `weekly_bonus_check_${steamId}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { can_claim, time_left, cached_at } = JSON.parse(cached);
        const age = Date.now() - cached_at;
        if (age < CACHE_DURATION) {
          setWeeklyCanClaim(can_claim);
          if (!can_claim && time_left) {
            const remaining = time_left - Math.floor(age / 1000);
            if (remaining > 0) { setWeeklyTimeLeft(formatWeeklyTime(remaining)); return; }
          }
        }
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch(`https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}&bonus_type=weekly`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyCanClaim(data.can_claim);
        localStorage.setItem(cacheKey, JSON.stringify({ can_claim: data.can_claim, time_left: data.time_left, cached_at: Date.now() }));
        if (!data.can_claim && data.time_left) setWeeklyTimeLeft(formatWeeklyTime(data.time_left));
      }
    } catch { /* ignore */ }
  }, [steamId]);

  useEffect(() => {
    checkWeekly();
    window.addEventListener('bonusUpdated', checkWeekly);
    return () => window.removeEventListener('bonusUpdated', checkWeekly);
  }, [checkWeekly]);

  useEffect(() => {
    setIsChecking(false);
    if (localStorage.getItem('bonus_after_auth') === 'true' && canClaimAny) {
      localStorage.removeItem('bonus_after_auth');
      setTimeout(() => setShowSelection(true), 100);
    }
    onAvailabilityChange?.(canClaimAny);
  }, [dailyCanClaim, weeklyCanClaim, canClaimAny, onAvailabilityChange]);

  const handleButtonClick = useCallback(() => {
    if (!steamId) {
      const currentUrl = encodeURIComponent(window.location.origin);
      localStorage.setItem('bonus_after_auth', 'true');
      window.location.href = `https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${currentUrl}`;
    } else {
      setShowSelection(true);
    }
  }, [steamId]);

  useEffect(() => {
    if (openFromMenu && !isChecking) {
      handleButtonClick();
      onMenuOpenHandled?.();
    }
  }, [openFromMenu, isChecking, handleButtonClick, onMenuOpenHandled]);

  if (isChecking) return null;

  const isAvailable = !steamId || canClaimAny;
  const displayText = steamId && !canClaimAny
    ? (dailyTimeLeft || weeklyTimeLeft || 'Открыть')
    : 'Открыть';

  return (
    <>
      <button
        onClick={handleButtonClick}
        className={`hidden md:flex fixed bottom-24 right-8 z-40 px-6 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
          isAvailable
            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 bg-[length:200%_100%] bonus-btn-active text-white hover:scale-110 cursor-pointer'
            : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200 cursor-pointer hover:scale-105'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={isAvailable ? 'animate-bounce' : ''}>
            <Icon name="Gift" className="h-6 w-6 flex-shrink-0" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm opacity-90">Бонусы</span>
            <span className="text-xl font-black">{displayText}</span>
          </div>
          {isAvailable && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
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
    </>
  );
};

export default DailyBonusButton;