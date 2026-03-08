import { motion } from 'framer-motion';
import { RefreshCw, Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PromoSection = () => {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Automated Replacements */}
        <motion.div
          className="group relative overflow-hidden rounded-2xl border border-border nox-surface p-8 nox-hover-glow transition-all"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/5 blur-[80px] group-hover:bg-primary/10 transition-colors" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl nox-gradient flex items-center justify-center mb-5">
              <RefreshCw className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Product Not Working?</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Get an <span className="text-primary font-semibold">automated replacement</span> instantly. 
              No waiting, no hassle — submit a request and we'll handle it within 24 hours.
            </p>
            <Link to="/myclaims">
              <Button variant="noxOutline" className="group/btn">
                Request a Replacement
                <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Free Points / Free Products */}
        <motion.div
          className="group relative overflow-hidden rounded-2xl border border-border nox-surface p-8 nox-hover-glow transition-all"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-accent/5 blur-[80px] group-hover:bg-accent/10 transition-colors" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] flex items-center justify-center mb-5">
              <Gift className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Can't Afford Anything?</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              <span className="text-accent font-semibold">We got you!</span> Earn free points by inviting friends, 
              leaving vouches, and redeeming keys. Exchange points for free products.
            </p>
            <Link to="/mypoints">
              <Button variant="noxOutline" className="group/btn border-accent/50 text-accent hover:bg-accent/10 hover:border-accent">
                Earn Free Products
                <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PromoSection;
