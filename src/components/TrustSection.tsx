import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import { Shield, Globe, Users, Star, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnimatedCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const steps = 30;
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
    { icon: Globe, label: 'Countries', value: 50, suffix: '+', gradient: 'from-blue-500 to-cyan-400' },
    { icon: Users, label: 'Satisfied Clients', value: 10000, suffix: '+', gradient: 'from-[hsl(var(--primary))] to-[hsl(var(--accent))]' },
    { icon: Shield, label: 'Secure Deliveries', value: 99, suffix: '.9%', gradient: 'from-emerald-500 to-green-400' },
    { icon: Star, label: 'Average Rating', value: 4, suffix: '.9/5', gradient: 'from-amber-500 to-yellow-400' },
  ];

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 nox-divider" />
      <div className="absolute inset-0 nox-mesh opacity-30" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-6">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Why Trust Us</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1] font-display">
              Trusted <span className="nox-gradient-text">All Over<br className="hidden md:block" /> The World</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed md:text-right">
            Thousands of customers trust The Nox for fast, reliable, and secure digital delivery.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative nox-surface rounded-2xl border border-border/50 p-6 md:p-8 nox-hover-glow nox-card-shine text-center overflow-hidden"
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Vouch CTA */}
        <div className="relative rounded-2xl overflow-hidden nox-hover-glow">
          {/* Animated border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-px">
            <div className="w-full h-full rounded-2xl nox-surface" />
          </div>
          <div className="relative p-8 nox-card-shine">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div>
                <p className="text-sm font-black text-foreground mb-1">No Vouch = No Warranty</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Check our verified vouches across different platforms for proof of legitimacy.
                </p>
              </div>
              <Link
                to="/vouches"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary-foreground nox-gradient hover:opacity-90 transition-opacity whitespace-nowrap px-6 py-3 rounded-xl nox-glow-sm"
              >
                View Our Vouches
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
