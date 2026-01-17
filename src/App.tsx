import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import TelegramWidget from "./components/TelegramWidget";
import PromotionModal from "./components/PromotionModal";
import HolidayEffects from "./components/HolidayEffects";
import MaintenancePage from "./components/MaintenancePage";
import CookieConsent from "./components/CookieConsent";
import { refreshTokenIfNeeded } from "./utils/authToken";
import Index from "./pages/Index";
import BanList from "./pages/BanList";
import Support from "./pages/Support";
import TicketDetails from "./pages/TicketDetails";
import Admin from "./pages/Admin";
import SteamCallback from "./pages/SteamCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceSubtitle, setMaintenanceSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [maintenanceCheckEnabled, setMaintenanceCheckEnabled] = useState(() => {
    return localStorage.getItem('maintenanceCheckEnabled') !== 'false';
  });
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    refreshTokenIfNeeded();
  }, []);

  useEffect(() => {
    if (!maintenanceCheckEnabled) {
      setLoading(false);
      return;
    }

    let lastCheckTime = 0;
    const MIN_CHECK_INTERVAL = 30 * 60 * 1000;
    const CACHE_KEY = 'maintenance_cache';
    const CACHE_DURATION = 30 * 60 * 1000;

    const checkMaintenance = async (skipCache = false) => {
      if (document.hidden) return;
      
      const now = Date.now();
      if (!skipCache && now - lastCheckTime < MIN_CHECK_INTERVAL) {
        return;
      }
      
      const cached = localStorage.getItem(CACHE_KEY);
      if (!skipCache && cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (now - timestamp < CACHE_DURATION) {
            setIsMaintenance(data.is_maintenance);
            setMaintenanceTitle(data.maintenance_title);
            setMaintenanceSubtitle(data.maintenance_subtitle);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse maintenance cache:', e);
        }
      }
      
      lastCheckTime = now;
      
      try {
        const res = await fetch('https://functions.poehali.dev/1ad77753-040f-405c-8e61-7230f64e30e9/');
        if (res.ok) {
          const data = await res.json();
          setIsMaintenance(data.is_maintenance);
          setMaintenanceTitle(data.maintenance_title);
          setMaintenanceSubtitle(data.maintenance_subtitle);
          
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: now
          }));
          
          window.dispatchEvent(new CustomEvent('holidayChanged', { detail: data.active_holiday || null }));
        }
      } catch (error) {
        console.error('Failed to check maintenance:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
    const interval = setInterval(() => checkMaintenance(true), 30 * 60 * 1000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        if (now - lastCheckTime >= 10 * 60 * 1000) {
          checkMaintenance();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [maintenanceCheckEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isMaintenance && !isAdminPath) {
    return <MaintenancePage title={maintenanceTitle} subtitle={maintenanceSubtitle} />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/banlist" element={<BanList />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/ticket/:ticketId" element={<TicketDetails />} />
        <Route path="/steam-callback" element={<SteamCallback />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TelegramWidget />
      <PromotionModal />
      <HolidayEffects />
      <CookieConsent />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;