import { useState, useEffect } from 'react';
import { ShoppingBag, Loader2, AlertCircle, Package, Minus, Plus, Mail, CreditCard, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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

const ShopFullGrid = () => {
  const [products, setProducts] = useState<SellAuthProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=products&all=true`,
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
          headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.details?.message || data?.details?.error || data?.error || 'Checkout failed';
        throw new Error(errMsg);
      }
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

  const getPrice = (product: SellAuthProduct) => product.variants?.[0] ? parseFloat(product.variants[0].price) : 0;
  const getSlashPrice = (product: SellAuthProduct) => product.variants?.[0]?.price_slash ? parseFloat(product.variants[0].price_slash) : null;
  const getImageUrl = (product: SellAuthProduct) => product.images?.[0]?.url ?? null;
  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency || 'EUR' }).format(price);
  const totalPrice = selectedVariant ? parseFloat(selectedVariant.price) * quantity : 0;

  return (
    <section className="py-20 px-6 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Shop</h2>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-7 h-7 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="noxOutline" size="sm" onClick={fetchProducts}>Retry</Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No products available right now.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => {
              const price = getPrice(product);
              const slashPrice = getSlashPrice(product);
              const imageUrl = getImageUrl(product);
              return (
                <Card key={product.id} className="group bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[var(--nox-shadow-sm)] overflow-hidden flex flex-col">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted/30">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Stock overlay badge */}
                    <div className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md ${product.stock_count > 0 ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-destructive/20 text-destructive border border-destructive/30'}`}>
                      {product.stock_count > 0 ? `${product.stock_count} in Stock` : 'Out of Stock'}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-foreground line-clamp-2">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-0 flex-1" />
                  <CardFooter className="flex items-center justify-between pt-2 pb-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Starting at</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-foreground">{formatPrice(price, product.currency)}</span>
                        {slashPrice && slashPrice > price && (
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(slashPrice, product.currency)}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="nox" size="sm" className="gap-1.5 px-4" onClick={() => openCheckout(product)} disabled={product.stock_count === 0}>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {product.stock_count === 0 ? 'Out of Stock' : 'Buy'}
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
            <DialogDescription className="text-sm text-muted-foreground">{checkoutProduct?.name}</DialogDescription>
          </DialogHeader>
          {checkoutProduct && selectedVariant && (
            <div className="space-y-5 mt-2">
              {checkoutProduct.variants.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Variant</Label>
                  <div className="flex flex-wrap gap-2">
                    {checkoutProduct.variants.map((v) => (
                      <button key={v.id} onClick={() => { setSelectedVariant(v); setQuantity(v.quantity_min || 1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedVariant.id === v.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                        {v.name} — {formatPrice(parseFloat(v.price), checkoutProduct.currency)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(Math.max(selectedVariant.quantity_min || 1, quantity - 1))} disabled={quantity <= (selectedVariant.quantity_min || 1)}><Minus className="w-3 h-3" /></Button>
                  <span className="text-sm font-bold text-foreground w-8 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(Math.min(selectedVariant.quantity_max || 100, quantity + 1))} disabled={quantity >= (selectedVariant.quantity_max || 100)}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grid-checkout-email" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</Label>
                <Input id="grid-checkout-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background border-border" />
              </div>
              {paymentMethods.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Payment Method</Label>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method) => (
                      <button key={method.id} onClick={() => setSelectedPayment(selectedPayment === method.id ? null : method.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${selectedPayment === method.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                        {method.name}{method.percentage_fee > 0 && <span className="ml-1 opacity-60">(+{method.percentage_fee}%)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="grid-checkout-coupon" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" /> Coupon (optional)</Label>
                <Input id="grid-checkout-coupon" type="text" placeholder="Enter coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="bg-background border-border" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-black nox-gradient-text">{formatPrice(totalPrice, checkoutProduct.currency)}</span>
              </div>
              <Button variant="nox" className="w-full gap-2" onClick={handleCheckout} disabled={checkoutLoading || !email}>
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {checkoutLoading ? 'Processing...' : `Pay ${formatPrice(totalPrice, checkoutProduct.currency)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ShopFullGrid;
