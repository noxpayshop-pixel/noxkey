import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Shield, Globe, Users, Star, ExternalLink, X, Award } from 'lucide-react';
import { getSettings } from '@/lib/store';

interface SellAuthFeedback {
  id: number;
  rating: number;
  message: string | null;
  status: string;
  is_automatic: boolean;
  created_at: string;
  invoice: {
    email: string;
    items: Array<{ product: { name: string } }>;
  };
}

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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const SellAuthVouchCard = ({ review }: { review: SellAuthFeedback }) => {
  const productName = review.invoice?.items?.[0]?.product?.name ?? 'Product';

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex flex-col gap-2.5 hover:border-primary/20 transition-colors">
      {/* Header: Stars + Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < review.rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
            />
          ))}
        </div>
        <span className="text-xs text-primary/60">{formatDate(review.created_at)}</span>
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground italic line-clamp-2">
        {review.message || 'Automatic feedback after 7 days.'}
      </p>

      {/* Product */}
      <span className="text-[10px] text-primary/50 uppercase tracking-wider truncate">
        {productName}
      </span>
    </div>
  );
};

const TrustSection = () => {
  const settings = getSettings();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sellAuthReviews, setSellAuthReviews] = useState<SellAuthFeedback[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=feedbacks`,
          { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }
        );
        const data = await res.json();
        if (res.ok) {
          const items: SellAuthFeedback[] = data.data ?? [];
          setSellAuthReviews(items.filter(r => r.status === 'published' && r.rating === 5).slice(0, 12));
        }
      } catch { /* silent */ }
      setLoadingReviews(false);
    };
    fetchReviews();
  }, []);

  const stats = [
    { icon: Globe, label: 'Countries', value: 50, suffix: '+', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { icon: Users, label: 'Satisfied Clients', value: 10000, suffix: '+', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { icon: Shield, label: 'Secure Deliveries', value: 99, suffix: '.9%', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { icon: Star, label: 'Average Rating', value: 4, suffix: '.9/5', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  ];

  const discordImages = settings.discordVouchImages?.filter(Boolean) || [];
  const sellAuthUrl = settings.sellAuthFeedbackUrl || 'https://thenox.mysellauth.com/feedback';
  const discordVouchChannelUrl = settings.discordVouchChannelUrl || '';

  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 nox-divider" />

      {/* Background */}
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
              View Our <span className="nox-gradient-text">Vouches</span>
            </motion.h2>
            <motion.p
              className="text-muted-foreground text-sm mt-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Across different platforms — real feedback from real customers.
            </motion.p>
          </div>
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

        {/* SellAuth Vouches */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">SellAuth Vouches</p>
            <a
              href={sellAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View all on SellAuth
            </a>
          </div>

          {loadingReviews ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sellAuthReviews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sellAuthReviews.map((review) => (
                <SellAuthVouchCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50 text-center py-8">No SellAuth vouches available.</p>
          )}

          {sellAuthReviews.length > 0 && (
            <p className="text-[10px] text-muted-foreground/40 mt-3 text-center">
              vouched on{' '}
              <a href={sellAuthUrl} target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary transition-colors underline underline-offset-2">
                SellAuth
              </a>
            </p>
          )}
        </motion.div>

        {/* Discord Vouches */}
        {discordImages.length > 0 && (
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Discord Vouches</p>
              {discordVouchChannelUrl && (
                <a
                  href={discordVouchChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> View vouch channel
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {discordImages.map((img, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden cursor-pointer nox-hover-glow group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img}
                    alt={`Discord vouch ${i + 1}`}
                    className="w-auto h-auto max-w-full rounded-lg group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No vouch = No warranty */}
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
                Check our verified vouches for proof of legitimacy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {(settings.vouchPlatforms?.filter(p => p.name && p.url) || []).map((platform, i) => (
                <a
                  key={i}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-accent transition-colors whitespace-nowrap px-4 py-2 rounded-lg border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {platform.name}
                </a>
              ))}
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
                className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-card"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedImage}
                alt="Vouch"
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
