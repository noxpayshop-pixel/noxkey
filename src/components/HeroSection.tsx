import { motion } from 'framer-motion';
import logo from '@/assets/logo.gif';

const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.img
          src={logo}
          alt="The Nox Logo"
          className="w-32 h-32 md:w-40 md:h-40 mb-8 animate-float"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight">
          <span className="nox-gradient-text">The Nox</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-md text-center mb-2">
          Premium Digital Delivery — Fast, Secure, Reliable.
        </p>
        <p className="text-sm text-muted-foreground/60">
          Enter your key below to claim your deliverables instantly.
        </p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
