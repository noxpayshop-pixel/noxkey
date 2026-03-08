import HeroSection from '@/components/HeroSection';
import KeyRedeemPanel from '@/components/KeyRedeemPanel';
import TrustSection from '@/components/TrustSection';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <HeroSection />
      
      <section className="px-6 pb-20 -mt-8 relative z-10">
        <KeyRedeemPanel />
      </section>

      <TrustSection />

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 The Nox. All rights reserved.</p>
          <div className="flex items-center gap-6">
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
              className="text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1"
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
