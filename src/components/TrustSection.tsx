import { motion } from 'framer-motion';
import { Shield, Globe, Users, Star } from 'lucide-react';
import { getSettings } from '@/lib/store';

const TrustSection = () => {
  const settings = getSettings();

  const stats = [
    { icon: Globe, label: 'Countries', value: '50+' },
    { icon: Users, label: 'Satisfied Clients', value: '10,000+' },
    { icon: Shield, label: 'Secure Deliveries', value: '99.9%' },
    { icon: Star, label: 'Average Rating', value: '4.9/5' },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-3 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Trusted <span className="nox-gradient-text">All Over The World</span>
        </motion.h2>
        <motion.p
          className="text-muted-foreground mb-12 max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Thousands of customers trust The Nox for fast, reliable, and secure digital delivery.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="nox-surface rounded-2xl border border-border p-6 nox-hover-glow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="nox-surface rounded-2xl border border-border p-6 inline-block nox-hover-glow"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">No Vouch = No Warranty</p>
          <p className="text-sm text-muted-foreground mb-3">Check our verified vouches for proof of legitimacy.</p>
          {settings.vouchUrl ? (
            <a
              href={settings.vouchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent transition-colors text-sm font-medium"
            >
              View our Vouches on MyVouch.es →
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
