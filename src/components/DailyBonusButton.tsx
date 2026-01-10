import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DailyBonusWheel from './DailyBonusWheel';

const DailyBonusButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canClaim, setCanClaim] = useState(true);

  useEffect(() => {
    const lastSpin = localStorage.getItem('lastBonusSpin');
    if (lastSpin) {
      const lastSpinDate = new Date(lastSpin);
      const now = new Date();
      const hoursSinceLastSpin = (now.getTime() - lastSpinDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSpin < 24) {
        setCanClaim(false);
      }
    }
  }, [isOpen]);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={!canClaim}
        className="fixed bottom-24 right-8 z-40 shadow-lg animate-pulse hover:animate-none"
        size="lg"
      >
        <Icon name="Gift" className="mr-2 h-5 w-5" />
        {canClaim ? 'Бонус' : 'Завтра'}
      </Button>

      <DailyBonusWheel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default DailyBonusButton;