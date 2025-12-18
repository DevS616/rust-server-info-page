
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TelegramWidget from "./components/TelegramWidget";
import PromotionModal from "./components/PromotionModal";
import NewYearMode from "./components/NewYearMode";
import SupportNotifications from "./components/SupportNotifications";
import Index from "./pages/Index";
import BanList from "./pages/BanList";
import Support from "./pages/Support";
import TicketDetails from "./pages/TicketDetails";
import Admin from "./pages/Admin";
import SteamCallback from "./pages/SteamCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TelegramWidget />
      <PromotionModal />
      <NewYearMode />
      <SupportNotifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/banlist" element={<BanList />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/:ticketId" element={<TicketDetails />} />
          <Route path="/steam-callback" element={<SteamCallback />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;