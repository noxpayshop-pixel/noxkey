import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DiscordAuthProvider } from "@/contexts/DiscordAuthContext";
import Index from "./pages/Index";
import DevPortal from "./pages/DevPortal";
import MyClaims from "./pages/MyClaims";
import MyPoints from "./pages/MyPoints";
import Casino from "./pages/Casino";
import Shop from "./pages/Shop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DiscordAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
