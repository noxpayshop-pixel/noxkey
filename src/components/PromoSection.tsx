import { motion } from 'framer-motion';
import { RefreshCw, Gift, ArrowRight, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PromoSection = () => {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[150px] -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-accent/3 blur-[150px] -translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">What We Offer</span>
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
            More Than Just <span className="nox-gradient-text">Products</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Automated Replacements */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl border border-border nox-surface p-10 nox-card-shine nox-card-shine-hover nox-hover-glow"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-[80px] group-hover:bg-primary/8 transition-colors duration-500" />
            <div className="relative z-10">
              <motion.div
                whileHover={{ rotate: -10, scale: 1.1 }}
                className="w-16 h-16 rounded-2xl nox-gradient flex items-center justify-center mb-8 shadow-lg shadow-primary/20"
              >
                <RefreshCw className="w-8 h-8 text-primary-foreground" />
              </motion.div>
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
          </motion.div>

          {/* Free Points / Free Products */}
          <motion.div
            className="group relative overflow-hidden rounded-3xl border border-border nox-surface p-10 nox-card-shine nox-card-shine-hover nox-hover-glow"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-accent/5 blur-[80px] group-hover:bg-accent/8 transition-colors duration-500" />
            <div className="relative z-10">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] flex items-center justify-center mb-8 shadow-lg shadow-accent/20"
              >
                <Gift className="w-8 h-8 text-primary-foreground" />
              </motion.div>
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
          </motion.div>
        </div>

        {/* Feature badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          {[
            { icon: <Shield className="w-3.5 h-3.5" />, label: '100% Secure' },
            { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant Delivery' },
            { icon: <RefreshCw className="w-3.5 h-3.5" />, label: '24h Replacements' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 text-muted-foreground text-xs font-medium">
              {badge.icon}
              {badge.label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PromoSection;
