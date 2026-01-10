import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';

const DailyBonusButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [canClaim, setCanClaim] = useState(true);
  const [steamId, setSteamId] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('steamUser');
    if (user) {
      const userData = JSON.parse(user);
      setSteamId(userData.steamId);
    }
  }, []);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!steamId) {
        const lastSpin = localStorage.getItem('lastBonusSpin');
        if (!lastSpin) {
          setCanClaim(true);
          return;
        }
        
        const lastSpinDate = new Date(lastSpin);
        const now = new Date();
        const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);
        setCanClaim(hoursSinceLastSpin >= 24);
        return;
      }

      try {
        const response = await fetch(
          `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setCanClaim(data.can_claim);
        }
      } catch (error) {
        console.error('Failed to check availability:', error);
      }
    };

    checkAvailability();
  }, [steamId, isOpen]);

  useEffect(() => {
    if (canClaim) {
      setTimeLeft('');
      return;
    }

    const updateTimer = async () => {
      if (steamId) {
        try {
          const response = await fetch(
            `https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/?steam_id=${steamId}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.can_claim) {
              setTimeLeft('');
              setCanClaim(true);
              return;
            }
            
            const hours = Math.floor(data.time_left / 3600);
            const minutes = Math.floor((data.time_left % 3600) / 60);
            setTimeLeft(`${hours}ч ${minutes}м`);
          }
        } catch (error) {
          console.error('Failed to update timer:', error);
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

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={!canClaim}
        className="fixed bottom-24 right-8 z-40 shadow-lg animate-pulse hover:animate-none whitespace-nowrap"
        size="lg"
      >
        <Icon name="Gift" className="mr-2 h-5 w-5 flex-shrink-0" />
        {canClaim ? 'Бонус' : `Через ${timeLeft}`}
      </Button>

      <DailyBonusWheel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default DailyBonusButton;