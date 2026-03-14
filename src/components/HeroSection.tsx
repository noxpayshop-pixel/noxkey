import { motion } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';
import logo from '@/assets/logo-new.jpg';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const HeroSection = () => {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Mesh background */}
      <div className="absolute inset-0 nox-mesh" />
      <div className="absolute inset-0 nox-grid-pattern opacity-30" />

      {!reduced && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-accent/4 blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] rounded-full bg-[hsl(var(--nox-gold)/0.04)] blur-[60px]" />
        </div>
      )}

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={reduced ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo with animated ring */}
        <motion.div
          className="relative mb-14"
          initial={reduced ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative">
            {!reduced && (
              <>
                <div className="absolute inset-0 -m-8 rounded-full border border-primary/10 animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-0 -m-14 rounded-full border border-primary/5" />
                {/* Glow behind logo */}
                <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-2xl" />
              </>
            )}
            <img
              src={logo}
              alt="The Nox Logo"
              className="w-28 h-28 md:w-36 md:h-36 relative z-10 rounded-full object-cover ring-2 ring-primary/20 ring-offset-4 ring-offset-background"
            />
          </div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Premium Digital Delivery</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-6xl sm:text-7xl md:text-[8rem] lg:text-[10rem] font-black mb-5 tracking-[-0.05em] leading-[0.85] font-display"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          <span className="nox-gradient-text nox-text-glow">The Nox</span>
        </motion.h1>

        {/* Slogan */}
        <motion.p
          className="text-xl md:text-3xl text-muted-foreground mb-5 font-light tracking-wide"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          We Care About{' '}
          <span className="nox-gradient-text font-black uppercase tracking-[0.15em]">YOU</span>
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className="text-sm text-muted-foreground/50 max-w-md text-center leading-relaxed"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Enter your key below to claim your deliverables instantly.
        </motion.p>

        {/* Decorative separator */}
        <motion.div
          className="mt-14 relative flex flex-col items-center gap-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="w-40 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <ChevronDown className="w-4 h-4 text-muted-foreground/30 animate-bounce" />
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
