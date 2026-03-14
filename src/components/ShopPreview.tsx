import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SellAuthVariant {
  price: string;
  price_slash?: string;
}

interface SellAuthProduct {
  id: number;
  name: string;
  currency: string;
  images: Array<{ url: string }>;
  variants: SellAuthVariant[];
  visibility: string;
}

const ShopPreview = () => {
  const [products, setProducts] = useState<SellAuthProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=products`,
          { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }
        );
        const data = await res.json();
        if (res.ok) {
          const items: SellAuthProduct[] = data.data ?? data.products ?? (Array.isArray(data) ? data : []);
          setProducts(items.filter((p: any) => p.visibility === 'public').slice(0, 3));
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchProducts();
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

  if (products.length === 0) return null;

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency || 'EUR' }).format(price);

  return (
    <section className="py-20 px-6 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Shop</h2>
          </div>
          <Link to="/shop">
            <Button variant="noxOutline" size="sm" className="gap-1.5 text-xs">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {products.map((product) => {
            const price = product.variants?.[0] ? parseFloat(product.variants[0].price) : 0;
            const imageUrl = product.images?.[0]?.url ?? null;

            return (
              <Link
                key={product.id}
                to="/shop"
                className="group rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/50 transition-all duration-300 overflow-hidden"
              >
                {imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted/20">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
                  <Badge variant="outline" className="shrink-0 border-primary/30 text-primary text-xs font-bold">
                    {formatPrice(price, product.currency)}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopPreview;
