import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServersSection from '@/components/ServersSection';
import NewsSection from '@/components/NewsSection';
import HowToStartSection from '@/components/HowToStartSection';
import Footer from '@/components/Footer';
import DailyBonusButton from '@/components/DailyBonusButton';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    
    if (urlToken) {
      try {
        const payload = JSON.parse(atob(urlToken.split('.')[1]));
        localStorage.setItem('steam_user', JSON.stringify({
          steamId: payload.steam_id,
          username: payload.username,
          userId: payload.user_id,
          avatar: payload.avatar || ''
        }));
        localStorage.setItem('support_token', urlToken);
        localStorage.setItem('bonus_after_auth', 'true');
        
        window.dispatchEvent(new Event('storage'));
        
        window.location.href = '/';
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ServersSection />
      <NewsSection />
      <HowToStartSection />
      <Footer />

      <DailyBonusButton />

      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 z-50 shadow-lg"
          aria-label="Наверх"
        >
          <Icon name="ArrowUp" className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default Index;