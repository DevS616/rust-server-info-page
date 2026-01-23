import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface BonusSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDaily: () => void;
  onSelectWeekly: () => void;
  dailyAvailable: boolean;
  weeklyAvailable: boolean;
  dailyTimeLeft: string;
  weeklyTimeLeft: string;
}

const BonusSelectionModal = ({
  isOpen,
  onClose,
  onSelectDaily,
  onSelectWeekly,
  dailyAvailable,
  weeklyAvailable,
  dailyTimeLeft,
  weeklyTimeLeft
}: BonusSelectionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Выбери свой бонус!
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Ежедневный бонус */}
          <button
            onClick={() => {
              if (dailyAvailable) {
                onSelectDaily();
                onClose();
              }
            }}
            disabled={!dailyAvailable}
            className={`
              relative p-6 rounded-2xl border-2 transition-all duration-300
              ${dailyAvailable 
                ? 'border-amber-500 bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer' 
                : 'border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed'
              }
            `}
          >
            {dailyAvailable && (
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                Доступно!
              </div>
            )}
            
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${dailyAvailable ? 'bg-amber-500/30' : 'bg-gray-700/30'}`}>
                <Icon name="Sparkles" className="h-12 w-12" />
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Ежедневный бонус</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Крути колесо фортуны и выигрывай до 20₽!
                </p>
                
                {dailyAvailable ? (
                  <div className="text-green-400 font-semibold">
                    <Icon name="CheckCircle" className="h-5 w-5 inline mr-1" />
                    Готов к получению
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Icon name="Clock" className="h-5 w-5 inline mr-1" />
                    Доступно через: {dailyTimeLeft}
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Еженедельный бонус */}
          <button
            onClick={() => {
              if (weeklyAvailable) {
                onSelectWeekly();
                onClose();
              }
            }}
            disabled={!weeklyAvailable}
            className={`
              relative p-6 rounded-2xl border-2 transition-all duration-300
              ${weeklyAvailable 
                ? 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] cursor-pointer' 
                : 'border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed'
              }
            `}
          >
            {weeklyAvailable && (
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                Доступно!
              </div>
            )}
            
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${weeklyAvailable ? 'bg-purple-500/30' : 'bg-gray-700/30'}`}>
                <Icon name="Package" className="h-12 w-12" />
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Еженедельный бонус</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Взломай крейт и получи до 50₽!
                </p>
                
                {weeklyAvailable ? (
                  <div className="text-green-400 font-semibold">
                    <Icon name="CheckCircle" className="h-5 w-5 inline mr-1" />
                    Готов к получению
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Icon name="Clock" className="h-5 w-5 inline mr-1" />
                    Доступно через: {weeklyTimeLeft}
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BonusSelectionModal;
