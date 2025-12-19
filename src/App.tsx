import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import TelegramWidget from "./components/TelegramWidget";
import PromotionModal from "./components/PromotionModal";
import NewYearMode from "./components/NewYearMode";
import MaintenancePage from "./components/MaintenancePage";
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
  const isAdminPath = location.pathname.startsWith('/admin');

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('https://functions.poehali.dev/1ad77753-040f-405c-8e61-7230f64e30e9/');
        if (res.ok) {
          const data = await res.json();
          setIsMaintenance(data.is_maintenance);
          setMaintenanceTitle(data.maintenance_title);
          setMaintenanceSubtitle(data.maintenance_subtitle);
        }
      } catch (error) {
        console.error('Failed to check maintenance:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

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
      <NewYearMode />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;