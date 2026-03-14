import { useState, useEffect } from 'react';
import { Star, MessageSquare, Loader2, Quote } from 'lucide-react';

interface SellAuthFeedback {
  id: number;
  rating: number;
  message: string | null;
  status: string;
  is_automatic: boolean;
  created_at: string;
  invoice: {
    email: string;
    items: Array<{
      product: {
        name: string;
      };
    }>;
  };
}

const ReviewsSection = () => {
  const [reviews, setReviews] = useState<SellAuthFeedback[]>([]);
  const [loading, setLoading] = useState(true);

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
          setReviews(items.filter(r => r.status === 'published' && r.message && r.rating >= 4).slice(0, 6));
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchReviews();
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto flex justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <section className="py-20 px-6 relative">
      <div className="absolute inset-0 nox-mesh opacity-30" />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 backdrop-blur-sm mb-4">
            <MessageSquare className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-[0.2em]">Reviews</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-foreground mb-2 font-display">What Our Customers Say</h2>
          <p className="text-sm text-muted-foreground">Real feedback from verified purchases</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => {
            const productName = review.invoice?.items?.[0]?.product?.name ?? 'Product';

            return (
              <div
                key={review.id}
                className="group rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm p-6 hover:border-primary/20 hover:bg-card/40 transition-all duration-500 flex flex-col gap-3 hover:-translate-y-1"
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>

                {/* Message */}
                <div className="flex-1 relative">
                  <Quote className="w-5 h-5 text-primary/10 absolute -top-1 -left-1" />
                  <p className="text-sm text-foreground/80 pl-5 line-clamp-3 leading-relaxed">
                    {review.message}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {maskEmail(review.invoice?.email ?? '')}
                    </span>
                    <span className="text-[10px] text-primary/50 truncate max-w-[150px]">
                      {productName}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/40">
                    {timeAgo(review.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
