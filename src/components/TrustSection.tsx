import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Globe, Users, Star, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const TrustSection = () => {
  const stats = [
    { icon: Globe, label: 'Countries', value: 50, suffix: '+', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { icon: Users, label: 'Satisfied Clients', value: 10000, suffix: '+', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { icon: Shield, label: 'Secure Deliveries', value: 99, suffix: '.9%', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { icon: Star, label: 'Average Rating', value: 4, suffix: '.9/5', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  ];

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/3 blur-[200px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Why Trust Us</span>
            </motion.div>
            <motion.h2
              className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Trusted <span className="nox-gradient-text">All Over<br className="hidden md:block" /> The World</span>
            </motion.h2>
          </div>
          <motion.p
            className="text-muted-foreground max-w-sm text-sm leading-relaxed md:text-right"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Thousands of customers trust The Nox for fast, reliable, and secure digital delivery.
          </motion.p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="nox-surface rounded-2xl border border-border p-6 md:p-8 nox-hover-glow nox-card-shine text-center group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Vouch CTA */}
        <motion.div
          className="nox-surface rounded-2xl border border-border p-8 nox-hover-glow nox-card-shine nox-card-shine-hover relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px]" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <p className="text-sm font-black text-foreground mb-1">No Vouch = No Warranty</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Check our verified vouches across different platforms for proof of legitimacy.
              </p>
            </div>
            <Link
              to="/vouches"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-accent transition-colors whitespace-nowrap px-6 py-3 rounded-xl"
            >
              View Our Vouches
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
