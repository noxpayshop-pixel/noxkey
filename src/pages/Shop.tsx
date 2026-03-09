import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ExternalLink, Loader2, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/logo.gif';

interface SellAuthVariant {
  id: number;
  name: string;
  price: string;
  price_slash?: string;
  stock: number;
}

interface SellAuthProduct {
  id: number;
  name: string;
  path: string;
  currency: string;
  stock_count: number;
  products_sold: number;
  type: string;
  visibility: string;
  images: Array<{ url: string }>;
  variants: SellAuthVariant[];
}

const Shop = () => {
  const [products, setProducts] = useState<SellAuthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=products`,
        {
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');

      const items: SellAuthProduct[] = data.data ?? data.products ?? (Array.isArray(data) ? data : []);
      // Only show public/unlisted products
      setProducts(items.filter(p => p.visibility !== 'private'));
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (product: SellAuthProduct) => {
    if (product.variants?.length > 0) {
      return parseFloat(product.variants[0].price);
    }
    return 0;
  };

  const getSlashPrice = (product: SellAuthProduct) => {
    if (product.variants?.length > 0 && product.variants[0].price_slash) {
      return parseFloat(product.variants[0].price_slash);
    }
    return null;
  };

  const getImageUrl = (product: SellAuthProduct) => {
    return product.images?.[0]?.url ?? null;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background nox-noise">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="The Nox" className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black nox-gradient-text tracking-tight">THE NOX</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              Home
            </Link>
            <Link to="/shop" className="text-xs font-bold text-primary hover:text-accent transition-colors uppercase tracking-wider">
              Shop
            </Link>
            <Link to="/casino" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              Casino
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-4">
            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Shop</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black nox-gradient-text mb-3">The Nox Shop</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Browse and purchase premium products directly from our store.
          </p>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="noxOutline" size="sm" onClick={fetchProducts}>Retry</Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No products available right now.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const price = getPrice(product);
              const slashPrice = getSlashPrice(product);
              const imageUrl = getImageUrl(product);

              return (
                <Card key={product.id} className="group bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--nox-shadow-sm)] overflow-hidden flex flex-col">
                  {imageUrl && (
                    <div className="aspect-video w-full overflow-hidden bg-muted/30">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground line-clamp-2">
                        {product.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 text-primary font-bold text-xs">
                        {formatPrice(price, product.currency)}
                      </Badge>
                      {slashPrice && slashPrice > price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(slashPrice, product.currency)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                      <span>{product.stock_count} in stock</span>
                      <span>·</span>
                      <span>{product.products_sold} sold</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="nox"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        window.open(`https://thenox.sellauth.com/product/${product.path}`, '_blank');
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Purchase
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
