import { motion } from 'framer-motion';
import { RefreshCw, Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PromoSection = () => {
  return (
    <section className="py-24 px-6 relative">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      <div className="max-w-5xl mx-auto">
        {/* Section heading */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-3">What We Offer</p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">
            More Than Just <span className="nox-gradient-text">Products</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Automated Replacements */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl border border-border nox-surface p-10 nox-hover-glow nox-card-shine"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-primary/4 blur-[100px] group-hover:bg-primary/8 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-accent/3 blur-[80px] group-hover:bg-accent/6 transition-all duration-700" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl nox-gradient flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                <RefreshCw className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Product Not Working?</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm">
                Get an <span className="text-primary font-semibold">automated replacement</span> instantly.
                No waiting, no hassle — submit a request and we'll handle it within 24 hours.
              </p>
              <Link to="/myclaims">
                <Button variant="noxOutline" className="group/btn rounded-xl px-6">
                  Request a Replacement
                  <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Free Points / Free Products */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl border border-border nox-surface p-10 nox-hover-glow nox-card-shine"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 left-0 w-60 h-60 rounded-full bg-accent/4 blur-[100px] group-hover:bg-accent/8 transition-all duration-700" />
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-primary/3 blur-[80px] group-hover:bg-primary/6 transition-all duration-700" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] flex items-center justify-center mb-6 shadow-lg shadow-accent/20">
                <Gift className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Can't Afford Anything?</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-sm">
                <span className="text-accent font-semibold">We got you!</span> Earn free points by inviting friends,
                leaving vouches, and redeeming keys. Exchange points for free products.
              </p>
              <Link to="/mypoints">
                <Button variant="noxOutline" className="group/btn border-accent/50 text-accent hover:bg-accent/10 hover:border-accent rounded-xl px-6">
                  Earn Free Products
                  <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
