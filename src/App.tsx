import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { DiscordAuthProvider } from "@/contexts/DiscordAuthContext";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import DevPortal from "./pages/DevPortal";
import MyClaims from "./pages/MyClaims";
import MyPoints from "./pages/MyPoints";
import Casino from "./pages/Casino";
import Shop from "./pages/Shop";
import Vouches from "./pages/Vouches";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function TrackPageView() {
  const location = useLocation();
  useEffect(() => {
    supabase.functions.invoke('track-visit', { body: { page: location.pathname } }).catch(() => {});
  }, [location.pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DiscordAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dev" element={<DevPortal />} />
            <Route path="/myclaims" element={<MyClaims />} />
            <Route path="/mypoints" element={<MyPoints />} />
            <Route path="/casino" element={<Casino />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/vouches" element={<Vouches />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DiscordAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
