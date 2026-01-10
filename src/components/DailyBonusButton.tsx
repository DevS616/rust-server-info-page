import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';

const DailyBonusButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const canClaim = useMemo(() => {
    const lastSpin = localStorage.getItem('lastBonusSpin');
    if (!lastSpin) return true;
    
    const lastSpinDate = new Date(lastSpin);
    const now = new Date();
    const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastSpin >= 24;
  }, [isOpen]);

  useEffect(() => {
    if (canClaim) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const lastSpin = localStorage.getItem('lastBonusSpin');
      if (!lastSpin) return;

      const lastSpinDate = new Date(lastSpin);
      const nextAvailable = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = nextAvailable.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('');
        window.location.reload();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}ч ${minutes}м`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [canClaim]);

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