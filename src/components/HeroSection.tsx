import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import logo from '@/assets/logo-new.jpg';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const HeroSection = () => {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background — simplified on mobile */}
      <div className="absolute inset-0 nox-grid-pattern opacity-40" />
      {!reduced && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/4 blur-[80px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/4 blur-[60px]" />
        </div>
      )}

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={reduced ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <motion.div
          className="relative mb-12"
          initial={reduced ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative">
            {!reduced && <div className="absolute inset-0 -m-6 rounded-full border border-primary/10" />}
            <img
              src={logo}
              alt="The Nox Logo"
              className="w-32 h-32 md:w-40 md:h-40 relative z-10 drop-shadow-2xl rounded-full object-cover"
            />
          </div>
        </motion.div>

        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Premium Digital Delivery</span>
        </div>

        {/* Title */}
        <h1 className="text-7xl md:text-[8rem] lg:text-[10rem] font-black mb-4 tracking-[-0.04em] leading-[0.85]">
          <span className="nox-gradient-text drop-shadow-lg">The Nox</span>
        </h1>

        {/* Slogan */}
        <p className="text-xl md:text-3xl text-muted-foreground mb-4 font-light tracking-wide">
          We Care About{' '}
          <span className="nox-gradient-text font-black uppercase tracking-[0.15em]">YOU</span>
        </p>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground/50 max-w-md text-center leading-relaxed">
          Enter your key below to claim your deliverables instantly.
        </p>

        {/* Decorative separator */}
        <div className="mt-12 relative">
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
