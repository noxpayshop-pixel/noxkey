import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ExternalLink, Loader2, AlertCircle, Package, Minus, Plus, Mail, CreditCard, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.gif';

interface SellAuthVariant {
  id: number;
  name: string;
  price: string;
  price_slash?: string;
  stock: number;
  quantity_min: number;
  quantity_max: number;
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

interface PaymentMethod {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  percentage_fee: number;
  icon_image_url: string | null;
}

const Shop = () => {
  const [products, setProducts] = useState<SellAuthProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout state
  const [checkoutProduct, setCheckoutProduct] = useState<SellAuthProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SellAuthVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [coupon, setCoupon] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { toast } = useToast();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    fetchProducts();
    fetchPaymentMethods();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=products`,
        { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      const items: SellAuthProduct[] = data.data ?? data.products ?? (Array.isArray(data) ? data : []);
      setProducts(items.filter(p => p.visibility === 'public'));
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sellauth-checkout?action=payment-methods`,
        { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }
      );
      const data = await res.json();
      if (res.ok) {
        const methods: PaymentMethod[] = data.data ?? [];
        setPaymentMethods(methods.filter(m => m.is_active));
      }
    } catch { /* silent */ }
  };

  const openCheckout = (product: SellAuthProduct) => {
    const variant = product.variants?.[0] ?? null;
    setCheckoutProduct(product);
    setSelectedVariant(variant);
    setQuantity(variant?.quantity_min ?? 1);
    setEmail('');
    setCoupon('');
    setSelectedPayment(null);
    setCheckoutLoading(false);
  };

  const closeCheckout = () => {
    setCheckoutProduct(null);
    setSelectedVariant(null);
  };

  const handleCheckout = async () => {
    if (!checkoutProduct || !selectedVariant) return;
    if (!email || !email.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const body: Record<string, unknown> = {
        cart: [{ productId: checkoutProduct.id, variantId: selectedVariant.id, quantity }],
        email,
      };
      if (selectedPayment) body.payment_method_id = selectedPayment;
      if (coupon.trim()) body.coupon = coupon.trim();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sellauth-checkout?action=checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.details?.message || data?.details?.error || data?.error || 'Checkout failed';
        throw new Error(errMsg);
      }

      // Redirect to payment URL
      const redirectUrl = data.url || data.invoice_url;
      if (redirectUrl) {
        window.open(redirectUrl, '_blank');
        closeCheckout();
        toast({ title: 'Checkout created!', description: 'You have been redirected to complete payment.' });
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err: any) {
      toast({ title: 'Checkout failed', description: err.message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getPrice = (product: SellAuthProduct) => {
    if (product.variants?.length > 0) return parseFloat(product.variants[0].price);
    return 0;
  };

  const getSlashPrice = (product: SellAuthProduct) => {
    if (product.variants?.length > 0 && product.variants[0].price_slash) return parseFloat(product.variants[0].price_slash);
    return null;
  };

  const getImageUrl = (product: SellAuthProduct) => product.images?.[0]?.url ?? null;

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency || 'EUR' }).format(price);

  const totalPrice = selectedVariant ? parseFloat(selectedVariant.price) * quantity : 0;

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
            <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">Home</Link>
            <Link to="/shop" className="text-xs font-bold text-primary hover:text-accent transition-colors uppercase tracking-wider">Shop</Link>
            <Link to="/casino" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">Casino</Link>
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
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-foreground line-clamp-2">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 text-primary font-bold text-xs">
                        {formatPrice(price, product.currency)}
                      </Badge>
                      {slashPrice && slashPrice > price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(slashPrice, product.currency)}</span>
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
                      onClick={() => openCheckout(product)}
                      disabled={product.stock_count === 0}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {product.stock_count === 0 ? 'Out of Stock' : 'Purchase'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutProduct} onOpenChange={(open) => !open && closeCheckout()}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Checkout</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {checkoutProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {checkoutProduct && selectedVariant && (
            <div className="space-y-5 mt-2">
              {/* Variant selector (if multiple) */}
              {checkoutProduct.variants.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Variant</Label>
                  <div className="flex flex-wrap gap-2">
                    {checkoutProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVariant(v);
                          setQuantity(v.quantity_min || 1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selectedVariant.id === v.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {v.name} — {formatPrice(parseFloat(v.price), checkoutProduct.currency)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(selectedVariant.quantity_min || 1, quantity - 1))}
                    disabled={quantity <= (selectedVariant.quantity_min || 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-sm font-bold text-foreground w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(selectedVariant.quantity_max || 100, quantity + 1))}
                    disabled={quantity >= (selectedVariant.quantity_max || 100)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="checkout-email" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email
                </Label>
                <Input
                  id="checkout-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Payment Method */}
              {paymentMethods.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> Payment Method
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(selectedPayment === method.id ? null : method.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          selectedPayment === method.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {method.name}
                        {method.percentage_fee > 0 && (
                          <span className="ml-1 opacity-60">(+{method.percentage_fee}%)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="space-y-2">
                <Label htmlFor="checkout-coupon" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Coupon (optional)
                </Label>
                <Input
                  id="checkout-coupon"
                  type="text"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-black nox-gradient-text">
                  {formatPrice(totalPrice, checkoutProduct.currency)}
                </span>
              </div>

              {/* Pay Button */}
              <Button
                variant="nox"
                className="w-full gap-2"
                onClick={handleCheckout}
                disabled={checkoutLoading || !email}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Pay {formatPrice(totalPrice, checkoutProduct.currency)}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
