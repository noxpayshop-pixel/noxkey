import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import logo from '@/assets/logo.gif';

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 nox-grid-pattern opacity-40" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/4 blur-[100px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/3 blur-[80px] animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Orbiting decorative dots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none">
        <div className="animate-orbit absolute top-1/2 left-1/2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        </div>
        <div className="animate-orbit absolute top-1/2 left-1/2" style={{ animationDelay: '-7s', animationDuration: '25s' }}>
          <div className="w-1 h-1 rounded-full bg-accent/20" />
        </div>
        <div className="animate-orbit absolute top-1/2 left-1/2" style={{ animationDelay: '-14s', animationDuration: '30s' }}>
          <div className="w-2 h-2 rounded-full bg-primary/10" />
        </div>
      </div>

      {/* Top gradient line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo with animated ring */}
        <motion.div
          className="relative mb-12"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'backOut' }}
        >
          <div className="absolute inset-0 -m-6 rounded-full border border-primary/10 animate-pulse-glow" />
          <div className="absolute inset-0 -m-12 rounded-full border border-primary/5" />
          <img
            src={logo}
            alt="The Nox Logo"
            className="w-32 h-32 md:w-40 md:h-40 animate-float relative z-10 drop-shadow-2xl"
          />
        </motion.div>

        {/* Badge */}
        <motion.div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary animate-badge-glow" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Premium Digital Delivery</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-7xl md:text-[8rem] lg:text-[10rem] font-black mb-4 tracking-[-0.04em] leading-[0.85]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span className="nox-gradient-text drop-shadow-lg">The Nox</span>
        </motion.h1>

        {/* Slogan */}
        <motion.p
          className="text-xl md:text-3xl text-muted-foreground mb-4 font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          We Care About{' '}
          <span className="nox-gradient-text font-black uppercase tracking-[0.15em]">YOU</span>
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className="text-sm text-muted-foreground/50 max-w-md text-center leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Enter your key below to claim your deliverables instantly.
        </motion.p>

        {/* Decorative separator with glow */}
        <motion.div
          className="mt-12 relative"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-primary/10 blur-lg -mt-2" />
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
