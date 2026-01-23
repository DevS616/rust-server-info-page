import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Confetti from 'react-confetti';

interface WeeklyBonusCrateProps {
  isOpen: boolean;
  onClose: () => void;
}

const CODES = ['1337', '4242', '7777', '9999'];

const WeeklyBonusCrate = ({ isOpen, onClose }: WeeklyBonusCrateProps) => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [correctCode, setCorrectCode] = useState<string>('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Выбираем случайный правильный код
      const randomCode = CODES[Math.floor(Math.random() * CODES.length)];
      setCorrectCode(randomCode);
      setSelectedCode(null);
      setResult(null);
      setShowConfetti(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const user = localStorage.getItem('steam_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setSteamId(userData.steamId);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    } else {
      setIsAuthenticated(false);
      setSteamId(null);
    }
  }, [isOpen]);

  const handleCodeSelect = async (code: string) => {
    if (isProcessing || selectedCode) return;
    
    setIsProcessing(true);
    setSelectedCode(code);
    
    const isCorrect = code === correctCode;
    const amount = isCorrect ? 50 : 5;
    
    setTimeout(async () => {
      setResult(isCorrect ? 'correct' : 'incorrect');
      
      if (isCorrect) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      // Записываем бонус в базу
      if (steamId) {
        try {
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

          console.log('WeeklyBonus: Recording bonus', { steam_id: steamId, amount, username, bonus_type: 'weekly' });

          const response = await fetch('https://functions.poehali.dev/2f8f1aed-8299-4c7c-b041-cfe28a3aa7f3/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              steam_id: steamId,
              amount,
              username,
              avatar,
              bonus_type: 'weekly'
            })
          });

          console.log('WeeklyBonus: Response status', response.status);
          const responseData = await response.json();
          console.log('WeeklyBonus: Response data', responseData);

          if (response.ok) {
            localStorage.removeItem(`weekly_bonus_check_${steamId}`);
          }
        } catch (error) {
          console.error('Failed to record weekly bonus:', error);
        }
      } else {
        localStorage.setItem('lastWeeklyBonus', new Date().toISOString());
      }

      setIsProcessing(false);
    }, 1000);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setSelectedCode(null);
    setResult(null);
    setShowConfetti(false);
    onClose();
  };

  const handleAuth = () => {
    const authUrl = 'https://functions.poehali.dev/c850f577-a59f-4ea7-aede-fb9f65e3bf14/';
    localStorage.setItem('bonus_after_auth', 'true');
    window.location.href = authUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-b from-gray-900 to-gray-800 border-2 border-orange-500/30">
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Еженедельный крейт
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <Icon name="Lock" className="h-16 w-16 text-orange-500" />
            <p className="text-center text-lg">
              Авторизуйтесь через Steam, чтобы получить еженедельный бонус
            </p>
            <Button onClick={handleAuth} size="lg" className="font-semibold">
              <Icon name="LogIn" className="mr-2 h-5 w-5" />
              Войти через Steam
            </Button>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center gap-6 py-8">
            {result === 'correct' ? (
              <>
                <div className="text-6xl">🎉</div>
                <h3 className="text-2xl font-bold text-green-400">Код верный!</h3>
                <p className="text-center text-lg">
                  Поздравляем! Ты получаешь <span className="text-green-400 font-bold">50 рублей</span> на баланс!
                </p>
                <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-green-400">+50₽</div>
                  <div className="text-sm text-muted-foreground mt-2">Еженедельный бонус</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl">😔</div>
                <h3 className="text-2xl font-bold text-orange-400">Код не верный!</h3>
                <p className="text-center text-lg">
                  Но за старания ты получаешь <span className="text-orange-400 font-bold">5 рублей</span> на баланс!
                </p>
                <div className="bg-orange-500/20 border-2 border-orange-500 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-orange-400">+5₽</div>
                  <div className="text-sm text-muted-foreground mt-2">Еженедельный бонус</div>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Правильный код был: <span className="text-green-400 font-bold">{correctCode}</span>
                </p>
              </>
            )}
            <Button onClick={handleClose} size="lg" className="mt-4">
              Закрыть
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 py-6">
            {/* Крейт изображение */}
            <div className="relative">
              <img
                src="https://cdn.poehali.dev/projects/14cc16e7-6bfa-466f-b030-aa09db74a13a/bucket/6f5700c1-cece-4c29-b20d-2f0db0ba1703.png"
                alt="Locked Crate"
                className="w-64 h-auto drop-shadow-[0_0_30px_rgba(255,68,0,0.5)]"
              />
            </div>

            {/* Описание */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Подбери правильный код</h3>
              <p className="text-muted-foreground">
                и получи <span className="text-green-400 font-bold">50 рублей</span> на баланс!
              </p>
            </div>

            {/* Коды */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {CODES.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCodeSelect(code)}
                  disabled={isProcessing || selectedCode !== null}
                  className={`
                    relative p-6 rounded-xl font-mono text-2xl font-bold
                    transition-all duration-300
                    ${selectedCode === code
                      ? 'bg-orange-500 text-white scale-95'
                      : 'bg-gray-700 hover:bg-gray-600 hover:scale-105'
                    }
                    ${isProcessing || selectedCode ? 'cursor-not-allowed' : 'cursor-pointer'}
                    border-2 border-orange-500/30 hover:border-orange-500
                  `}
                >
                  {code}
                  {selectedCode === code && isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <Icon name="Loader2" className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-400 text-center mt-4">
              Один из этих кодов откроет крейт!
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyBonusCrate;