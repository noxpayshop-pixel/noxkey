import HeroSection from '@/components/HeroSection';
import KeyRedeemPanel from '@/components/KeyRedeemPanel';
import PromoSection from '@/components/PromoSection';
import TrustSection from '@/components/TrustSection';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import logo from '@/assets/logo.gif';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative nox-noise">
      <HeroSection />

      <section className="px-6 pb-24 -mt-6 relative z-10">
        <KeyRedeemPanel />
      </section>

      <PromoSection />
      <TrustSection />

      {/* Footer */}
      <footer className="relative border-t border-border py-12 px-6">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="The Nox" className="w-6 h-6 opacity-50" />
            <p className="text-sm text-muted-foreground/60">© 2026 The Nox. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-8">
            <a
              href="https://discord.gg/thenox"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Discord
            </a>
            <Link
              to="/dev"
              className="text-sm text-muted-foreground/30 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3" /> Dev
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
