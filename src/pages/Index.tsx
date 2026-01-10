import { useState, useEffect } from 'react';
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
  const [showScrollTop, setShowScrollTop] = useState(false);

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