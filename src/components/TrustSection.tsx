import { motion } from 'framer-motion';
import { Shield, Globe, Users, Star } from 'lucide-react';
import { getSettings } from '@/lib/store';

const TrustSection = () => {
  const settings = getSettings();

  const stats = [
    { icon: Globe, label: 'Countries', value: '50+', color: 'text-blue-400' },
    { icon: Users, label: 'Satisfied Clients', value: '10,000+', color: 'text-primary' },
    { icon: Shield, label: 'Secure Deliveries', value: '99.9%', color: 'text-green-400' },
    { icon: Star, label: 'Average Rating', value: '4.9/5', color: 'text-yellow-400' },
  ];

  return (
    <section className="py-24 px-6 relative">
      {/* Section divider */}
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      <div className="max-w-5xl mx-auto">
        {/* Heading with asymmetric layout */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-4">
          <div>
            <motion.p
              className="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Why Trust Us
            </motion.p>
            <motion.h2
              className="text-3xl md:text-5xl font-bold text-foreground tracking-tight"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="nox-surface rounded-2xl border border-border p-6 md:p-8 nox-hover-glow nox-card-shine text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <stat.icon className={`w-7 h-7 ${stat.color} mx-auto mb-4`} />
              <p className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Vouch CTA */}
        <motion.div
          className="nox-surface rounded-2xl border border-border p-8 nox-hover-glow nox-card-shine flex flex-col md:flex-row items-center justify-between gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">No Vouch = No Warranty</p>
            <p className="text-sm text-muted-foreground">Check our verified vouches for proof of legitimacy.</p>
          </div>
          {settings.vouchUrl ? (
            <a
              href={settings.vouchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent transition-colors text-sm font-semibold whitespace-nowrap flex items-center gap-1.5"
            >
              View Vouches →
            </a>
          ) : (
            <span className="text-muted-foreground/50 text-sm">Vouch link not configured</span>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
