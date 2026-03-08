import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Globe, Users, Star, ExternalLink, X } from 'lucide-react';
import { getSettings } from '@/lib/store';

const TrustSection = () => {
  const settings = getSettings();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const stats = [
    { icon: Globe, label: 'Countries', value: '50+', color: 'text-blue-400' },
    { icon: Users, label: 'Satisfied Clients', value: '10,000+', color: 'text-primary' },
    { icon: Shield, label: 'Secure Deliveries', value: '99.9%', color: 'text-green-400' },
    { icon: Star, label: 'Average Rating', value: '4.9/5', color: 'text-yellow-400' },
  ];

  const platforms = settings.vouchPlatforms?.filter(p => p.name && p.url) || [];
  const images = settings.feedbackImages?.filter(Boolean) || [];

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
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

        {/* Feedback Gallery */}
        {images.length > 0 && (
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-6">Customer Feedback</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  className="nox-surface rounded-xl border border-border overflow-hidden cursor-pointer nox-hover-glow group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img}
                    alt={`Feedback ${i + 1}`}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Vouch CTA - always visible */}
        <motion.div
          className="nox-surface rounded-2xl border border-border p-8 nox-hover-glow nox-card-shine"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">No Vouch = No Warranty</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Check our verified vouches for proof of legitimacy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {platforms.map((platform, i) => (
                <a
                  key={i}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {platform.name} →
                </a>
              ))}
              {platforms.length === 0 && (
                <span className="text-muted-foreground/50 text-sm">No platforms configured</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              className="relative max-w-3xl w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedImage}
                alt="Feedback"
                className="w-full rounded-2xl border border-border shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default TrustSection;
