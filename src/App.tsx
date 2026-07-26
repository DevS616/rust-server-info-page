import { useState, useEffect, useCallback } from 'react';
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
import TopRich from "./pages/TopRich";
import Support from "./pages/Support";
import TicketDetails from "./pages/TicketDetails";
import Complaints from "./pages/Complaints";
import Admin from "./pages/Admin";
import ImgHosting from "./pages/ImgHosting";
import SteamCallback from "./pages/SteamCallback";
import Privacy from "./pages/Privacy";
import UserAgreement from "./pages/UserAgreement";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/Calendar";
import News from "./pages/News";
import Vote from "./pages/Vote";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const CACHE_KEY = 'maintenance_cache';
const CACHE_DURATION = 60 * 1000;
const MIN_CHECK_INTERVAL = 60 * 1000;
const POLL_INTERVAL = 20 * 60 * 1000;
const VISIBILITY_THRESHOLD = 60 * 1000;

const AppContent = () => {
  const location = useLocation();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceSubtitle, setMaintenanceSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    refreshTokenIfNeeded();
  }, []);

  const checkMaintenance = useCallback(async (skipCache = false) => {
    if (document.hidden) return;

    const now = Date.now();

    if (!skipCache) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (now - timestamp < CACHE_DURATION) {
            setIsMaintenance(data.is_maintenance);
            setMaintenanceTitle(data.maintenance_title ?? '');
            setMaintenanceSubtitle(data.maintenance_subtitle ?? '');
            setLoading(false);
            return;
          }
        } catch { /* ignore */ }
      }
    }

    try {
      const res = await fetch('https://functions.poehali.dev/1ad77753-040f-405c-8e61-7230f64e30e9/');
      if (res.ok) {
        const data = await res.json();
        setIsMaintenance(data.is_maintenance);
        setMaintenanceTitle(data.maintenance_title ?? '');
        setMaintenanceSubtitle(data.maintenance_subtitle ?? '');
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: now }));
        window.dispatchEvent(new CustomEvent('holidayChanged', { detail: data.active_holiday || null }));
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let lastCheckTime = 0;

    const run = async (skipCache = false) => {
      const now = Date.now();
      if (!skipCache && now - lastCheckTime < MIN_CHECK_INTERVAL) return;
      lastCheckTime = now;
      await checkMaintenance(skipCache);
    };

    run();
    const interval = setInterval(() => run(true), POLL_INTERVAL);

    const handleVisibility = () => {
      if (!document.hidden && Date.now() - lastCheckTime >= VISIBILITY_THRESHOLD) run();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkMaintenance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
      <TelegramWidget />
      <PromotionModal />
      <HolidayEffects />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/banlist" element={<BanList />} />
        <Route path="/top" element={<TopRich />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/ticket/:ticketId" element={<TicketDetails />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/steam-callback" element={<SteamCallback />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/img" element={<ImgHosting />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/news" element={<News />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/agreement" element={<UserAgreement />} />
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
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;