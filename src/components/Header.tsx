import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useEffect, useState } from 'react';
import RulesModal from '@/components/RulesModal';
import SteamAuth from '@/components/SteamAuth';
import EventCalendar from '@/components/EventCalendar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface HeaderProps {
  onOpenBonus?: () => void;
  onOpenTelegram?: () => void;
  bonusAvailable?: boolean;
}

const Header = ({ onOpenBonus, onOpenTelegram, bonusAvailable }: HeaderProps = {}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('support_token');
    if (!token) return;

    fetch('https://functions.poehali.dev/887805c0-0d3a-4f32-8436-1ba1adda4a4f/?action=status', {
      headers: { 'X-Auth-Token': token }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUnreadCount(data.unread_count || 0); })
      .catch(() => {});
  }, []);





  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg shadow-primary/5 relative">
      <div className="container flex h-16 items-center justify-between my-0">
        <a href="/" className="flex items-center space-x-2 group">
          <img 
            src="https://s3.regru.cloud/img.devilrust/devilrust_logo.png" 
            alt="DevilRust" 
            className="h-8 w-auto group-hover:drop-shadow-[0_0_12px_rgba(255,68,0,0.6)] transition-all"
          />
          <span className="text-2xl font-bold tracking-wide font-nunito-italic">DEVILRUST</span>
        </a>

        <nav className="hidden md:flex items-center space-x-6">
          <a href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Главная
          </a>
          <a href="/banlist" className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Банлист
          </a>
          <button onClick={() => setIsRulesOpen(true)} className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Правила
          </button>
          <button onClick={() => setIsCalendarOpen(true)} className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Календарь
          </button>
          <a href="https://wiki.devilrust.ru" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Wiki
          </a>
          <a href="https://devrus.gamestores.app/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider">
            Магазин
          </a>
          <a href="/support" className="text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider relative">
            Поддержка
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2">
                <Icon name="Bell" className="h-4 w-4 text-destructive animate-[wiggle_1s_ease-in-out_infinite]" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
              </span>
            )}
          </a>
          <a href="/complaints" className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors uppercase tracking-wider">
            Жалобы
          </a>
        </nav>

<div className="hidden md:flex">
          <SteamAuth />
        </div>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Icon name="Menu" className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="text-left font-nunito-italic">DEVILRUST</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col space-y-4 mt-8">
              <a 
                href="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2"
              >
                Главная
              </a>
              <a 
                href="/banlist" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2"
              >
                Банлист
              </a>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsRulesOpen(true);
                }} 
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2 text-left"
              >
                Правила
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCalendarOpen(true);
                }} 
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2 text-left"
              >
                Календарь
              </button>
              <a 
                href="https://wiki.devilrust.ru" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2"
              >
                Wiki
              </a>
              <a 
                href="https://devrus.gamestores.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2"
              >
                Магазин
              </a>
              <a 
                href="/support" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wider py-2"
              >
                Поддержка
              </a>
              <a 
                href="/complaints" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-destructive hover:text-destructive/80 transition-colors uppercase tracking-wider py-2"
              >
                Жалобы
              </a>

              <div className="border-t border-primary/20 pt-4 space-y-3">
                {onOpenBonus && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setTimeout(onOpenBonus, 200);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold uppercase tracking-wider transition-all hover:bg-primary/20"
                  >
                    <Icon name="Gift" size={20} className={bonusAvailable ? 'animate-bounce' : ''} />
                    <span>Бонусы</span>
                    {bonusAvailable && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">ДОСТУПНО</span>
                    )}
                  </button>
                )}
                {onOpenTelegram && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setTimeout(onOpenTelegram, 200);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary font-semibold uppercase tracking-wider transition-all hover:bg-primary/20"
                  >
                    <Icon name="Send" size={20} />
                    <span>Telegram</span>
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-primary/20">
                <SteamAuth />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      
      <RulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
      <EventCalendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </header>
  );
};

export default Header;