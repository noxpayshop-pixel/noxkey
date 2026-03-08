import { motion } from 'framer-motion';
import logo from '@/assets/logo.gif';

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden nox-grid-pattern">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/4 blur-[160px]" />
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-accent/4 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      {/* Top decorative line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo with ring */}
        <motion.div
          className="relative mb-10"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'backOut' }}
        >
          <div className="absolute inset-0 -m-3 rounded-full border border-primary/10 animate-pulse-glow" />
          <img
            src={logo}
            alt="The Nox Logo"
            className="w-28 h-28 md:w-36 md:h-36 animate-float relative z-10"
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-6xl md:text-8xl lg:text-9xl font-black mb-4 tracking-tighter leading-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span className="nox-gradient-text">The Nox</span>
        </motion.h1>

        {/* Slogan */}
        <motion.p
          className="text-lg md:text-2xl text-muted-foreground mb-3 font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          We Care About{' '}
          <span className="nox-gradient-text font-extrabold uppercase tracking-widest">YOU</span>
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

        {/* Decorative separator */}
        <motion.div
          className="mt-10 w-24 nox-divider"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
