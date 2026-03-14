import { lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Heart } from 'lucide-react';
import logo from '@/assets/logo-new.jpg';
import { useIsMobile } from '@/hooks/use-reduced-motion';
import HeroSection from '@/components/HeroSection';
import KeyRedeemPanel from '@/components/KeyRedeemPanel';

// Lazy load below-fold sections
const ShopFullGrid = lazy(() => import('@/components/ShopFullGrid'));
const PromoSection = lazy(() => import('@/components/PromoSection'));
const TrustSection = lazy(() => import('@/components/TrustSection'));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (spotlightRef.current) {
      spotlightRef.current.style.left = `${e.clientX}px`;
      spotlightRef.current.style.top = `${e.clientY}px`;
    }
  }, []);

  useEffect(() => {
    if (isMobile) return; // No spotlight on mobile
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile, handleMouseMove]);

  return (
    <div className="min-h-screen bg-background relative nox-noise">
      {/* Mouse spotlight — desktop only */}
      {!isMobile && (
        <div
          ref={spotlightRef}
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
            willChange: 'left, top',
          }}
        />
      )}

      {/* Navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="The Nox" className="w-7 h-7 group-hover:scale-110 transition-transform rounded-full" />
            <span className="text-sm font-black nox-gradient-text tracking-tight">THE NOX</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/myclaims" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              My Items
            </Link>
            <Link to="/mypoints" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider hidden sm:block">
              Points
            </Link>
            <Link to="/shop" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              Shop
            </Link>
            <Link to="/casino" className="text-xs font-bold text-primary hover:text-accent transition-colors uppercase tracking-wider">
              Casino
            </Link>
            <a
              href="https://discord.gg/thenox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider hidden sm:block"
            >
              Discord
            </a>
          </div>
        </div>
      </nav>

      <HeroSection />

      <Suspense fallback={<SectionFallback />}>
        <ShopFullGrid />
      </Suspense>

      <section className="px-6 pb-28 -mt-8 relative z-10">
        <KeyRedeemPanel />
      </section>

      <Suspense fallback={<SectionFallback />}>
        <PromoSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <TrustSection />
      </Suspense>

      {/* Footer */}
      <footer className="relative border-t border-border py-16 px-6">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-3">
                <img src={logo} alt="The Nox" className="w-8 h-8 rounded-full" />
                <span className="text-lg font-black nox-gradient-text">The Nox</span>
              </div>
              <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                Made with <Heart className="w-3 h-3 text-destructive/50" /> for our community
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link to="/myclaims" className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium">
                My Items
              </Link>
              <Link to="/mypoints" className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium">
                Points
              </Link>
              <a
                href="https://discord.gg/thenox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium"
              >
                Discord
              </a>
              <Link
                to="/dev"
                className="text-xs text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors flex items-center gap-1"
              >
                <Lock className="w-3 h-3" /> Dev
              </Link>
            </div>
          </div>
          <div className="nox-divider mt-8 mb-6" />
          <p className="text-[10px] text-muted-foreground/30 text-center uppercase tracking-widest">
            © 2026 The Nox. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
