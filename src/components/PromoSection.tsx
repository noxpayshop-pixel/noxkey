import { RefreshCw, Gift, ArrowRight, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PromoSection = () => {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 nox-divider" />
      <div className="absolute inset-0 nox-mesh opacity-50" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section heading */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-6">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">What We Offer</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight font-display">
            More Than Just <span className="nox-gradient-text">Products</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Automated Replacements */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/50 nox-surface p-10 nox-card-shine nox-hover-glow">
            {/* Decorative gradient blob */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl nox-gradient flex items-center justify-center mb-8 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <RefreshCw className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Product Not Working?</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm">
                Get an <span className="text-primary font-semibold">automated replacement</span> instantly.
                No waiting, no hassle — submit a request and we'll handle it within 24 hours.
              </p>
              <Link to="/myclaims">
                <Button variant="noxOutline" className="group/btn rounded-xl px-6 h-12">
                  Request a Replacement
                  <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Free Points */}
          <div className="group relative overflow-hidden rounded-3xl border border-border/50 nox-surface p-10 nox-card-shine nox-hover-glow">
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors duration-700" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] flex items-center justify-center mb-8 shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform duration-300">
                <Gift className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">Can't Afford Anything?</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm">
                <span className="text-accent font-semibold">We got you!</span> Earn free points by inviting friends,
                leaving vouches, and redeeming keys. Exchange points for free products.
              </p>
              <Link to="/mypoints">
                <Button variant="noxOutline" className="group/btn border-accent/50 text-accent hover:bg-accent/10 hover:border-accent rounded-xl px-6 h-12">
                  Earn Free Products
                  <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
          {[
            { icon: <Shield className="w-3.5 h-3.5" />, label: '100% Secure' },
            { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant Delivery' },
            { icon: <RefreshCw className="w-3.5 h-3.5" />, label: '24h Replacements' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/30 backdrop-blur-sm text-muted-foreground text-xs font-medium hover:border-primary/20 hover:text-foreground transition-all duration-300">
              {badge.icon}
              {badge.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
