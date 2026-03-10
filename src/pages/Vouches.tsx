import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ExternalLink, X, Award, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSettings } from '@/lib/store';
import logo from '@/assets/logo.gif';

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

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const SellAuthVouchCard = ({ review }: { review: SellAuthFeedback }) => (
  <div className="rounded-xl border border-border/50 bg-card/40 p-4 flex flex-col gap-2.5 hover:border-primary/20 transition-colors">
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
    <p className="text-sm text-muted-foreground italic line-clamp-2">
      {review.message || 'Automatic feedback after 7 days.'}
    </p>
  </div>
);

const Vouches = () => {
  const settings = getSettings();
  const [sellAuthReviews, setSellAuthReviews] = useState<SellAuthFeedback[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
          setSellAuthReviews(items.filter(r => r.status === 'published' && r.rating === 5));
        }
      } catch { /* silent */ }
      setLoadingReviews(false);
    };
    fetchReviews();
  }, []);

  const discordImages = settings.discordVouchImages?.filter(Boolean) || [];
  const sellAuthUrl = settings.sellAuthFeedbackUrl || 'https://thenox.mysellauth.com/feedback';
  const discordVouchChannelUrl = settings.discordVouchChannelUrl || '';

  return (
    <div className="min-h-screen bg-background relative nox-noise">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="The Nox" className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black nox-gradient-text tracking-tight">THE NOX</span>
          </Link>
          <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Vouches</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-3">
              Our <span className="nox-gradient-text">Vouches</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">
              View our vouches across different platforms — real feedback from real customers.
            </p>
          </motion.div>

          {/* SellAuth Vouches */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">SellAuth</p>
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
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : sellAuthReviews.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sellAuthReviews.map((review) => (
                    <SellAuthVouchCard key={review.id} review={review} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/40 mt-3 text-center">
                  vouched on{' '}
                  <a href={sellAuthUrl} target="_blank" rel="noopener noreferrer" className="text-primary/50 hover:text-primary transition-colors underline underline-offset-2">
                    SellAuth
                  </a>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground/50 text-center py-8">No SellAuth vouches available.</p>
            )}
          </motion.div>

          {/* Discord Vouches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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

            {discordImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {discordImages.map((img, i) => (
                  <motion.div
                    key={i}
                    className="rounded-xl border border-border overflow-hidden cursor-pointer nox-hover-glow group"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
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
            ) : (
              <p className="text-sm text-muted-foreground/50 text-center py-8">No Discord vouches yet.</p>
            )}
          </motion.div>
        </div>
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
    </div>
  );
};

export default Vouches;
