import { useEffect, useState } from 'react';
import { ArrowRight, CreditCard, Building2, Smartphone, Check, Lock, ChevronDown } from 'lucide-react';
import { useStore, getCartProducts } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';
import { useAuth, supabase } from '@/lib/auth';

type PaymentMethod = 'card' | 'bank' | 'ussd';

const DELIVERY_FEE = 3500;
const FREE_DELIVERY_THRESHOLD = 40000;

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function CheckoutPage() {
  const { cart, cartSubtotal, clearCart } = useStore();
  const { navigate } = useRouter();
  const { user, loading } = useAuth();
  const items = getCartProducts(cart);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    address: '', state: '', lga: '', landmark: '',
    paymentMethod: 'card' as PaymentMethod,
  });

  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <main className="container-jazelle py-16 text-center"><p className="text-berry-400">Loading...</p></main>;
  }

  if (items.length === 0) {
    return (
      <main className="container-jazelle py-16 text-center">
        <h1 className="section-title">Your cart is empty</h1>
        <a href="/shop" className="btn-primary mt-6">Browse the shop</a>
      </main>
    );
  }

  const deliveryFee = cartSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = cartSubtotal + deliveryFee;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = 'Please enter your full name';
    if (!form.email.trim()) next.email = 'Please enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Please enter a valid email';
    if (!form.phone.trim()) next.phone = 'Please enter your phone number';
    else if (!/^\+?[\d\s-]{10,}$/.test(form.phone)) next.phone = 'Please enter a valid phone number';
    if (!form.address.trim()) next.address = 'Please enter your delivery address';
    if (!form.state) next.state = 'Please select your state';
    if (!form.lga.trim()) next.lga = 'Please enter your LGA or city area';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 2200));

    const orderNumber = `JAZ-${Date.now().toString().slice(-8)}`;
    const { data, error: insertError } = await supabase.from('orders').insert({
      order_number: orderNumber,
      items: items.map(({ product, quantity }) => ({ slug: product.slug, name: product.name, price: product.price, quantity, image: product.image })),
      subtotal: cartSubtotal,
      delivery_fee: deliveryFee,
      total,
      customer_name: form.fullName,
      customer_email: form.email,
      customer_phone: form.phone,
      delivery_address: form.address,
      delivery_state: form.state,
      delivery_lga: form.lga,
      delivery_landmark: form.landmark,
      payment_method: form.paymentMethod,
      status: 'placed',
    }).select('order_number').single();

    if (insertError || !data) {
      setProcessing(false);
      setErrors({ submit: 'Could not place order. Please try again.' });
      return;
    }

    clearCart();
    setProcessing(false);
    navigate(`/order-confirmation?id=${data.order_number}`);
  };

  const paymentMethods: { id: PaymentMethod; label: string; description: string; icon: typeof CreditCard }[] = [
    { id: 'card', label: 'Card', description: 'Visa, Mastercard, Verve', icon: CreditCard },
    { id: 'bank', label: 'Bank Transfer', description: 'Transfer from your bank app', icon: Building2 },
    { id: 'ussd', label: 'USSD', description: 'Dial a code from your phone', icon: Smartphone },
  ];

  return (
    <main className="container-jazelle py-10 sm:py-14">
      <h1 className="section-title">Checkout</h1>
      <p className="mt-2 text-sm text-berry-400">Almost there — just a few details and your self-care picks are on the way.</p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left: form fields */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <input className="input-jazelle" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="What should we call you?" />
              </Field>
              <Field label="Email address" error={errors.email}>
                <input type="email" className="input-jazelle" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </Field>
              <Field label="Phone number" error={errors.phone}>
                <input type="tel" className="input-jazelle" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 801 234 5678" />
              </Field>
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Delivery address</h2>
            <div className="mt-4 space-y-4">
              <Field label="Street address" error={errors.address}>
                <input className="input-jazelle" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House number, street name, area" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="State" error={errors.state}>
                  <div className="relative">
                    <select className="input-jazelle appearance-none pr-10" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                  </div>
                </Field>
                <Field label="LGA / City area" error={errors.lga}>
                  <input className="input-jazelle" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} placeholder="e.g. Municipal Area Council" />
                </Field>
              </div>
              <Field label="Landmark (optional)">
                <input className="input-jazelle" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="e.g. near the big mosque, opposite the filling station" />
              </Field>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Payment method</h2>
            <p className="mt-1 text-xs text-berry-400">Powered by Paystack. Your payment is secure and encrypted.</p>
            <div className="mt-4 space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = form.paymentMethod === method.id;
                return (
                  <button key={method.id} type="button" onClick={() => setForm({ ...form, paymentMethod: method.id })} className={`flex w-full items-center gap-3 rounded-3xl border-2 p-4 text-left transition-all ${active ? 'border-blush-400 bg-blush-50' : 'border-blush-100 bg-white hover:border-blush-200'}`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-blush-500 text-white' : 'bg-blush-50 text-blush-400'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-berry-700">{method.label}</p>
                      <p className="text-xs text-berry-400">{method.description}</p>
                    </div>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-blush-500 bg-blush-500' : 'border-blush-200'}`}>
                      {active && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-berry-400">
              <Lock className="h-3.5 w-3.5" />
              Your payment details are processed securely by Paystack. We never store your card information.
            </div>
          </section>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Order Summary</h2>
            <div className="mt-4 space-y-3">
              {items.map(({ product, quantity }) => (
                <div key={product.slug} className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-500 text-[0.65rem] font-bold text-white">{quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-berry-700">{product.name}</p>
                    <p className="text-xs text-berry-400">{formatNaira(product.price * quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-blush-100 pt-4 text-sm">
              <div className="flex justify-between text-berry-500"><span>Subtotal</span><span className="font-medium text-berry-700">{formatNaira(cartSubtotal)}</span></div>
              <div className="flex justify-between text-berry-500"><span>Delivery</span><span className="font-medium text-berry-700">{deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}</span></div>
              <div className="border-t border-blush-100 pt-2 flex justify-between text-base font-bold text-berry-800"><span>Total</span><span>{formatNaira(total)}</span></div>
            </div>
            <button type="submit" disabled={processing} className="btn-primary mt-6 w-full disabled:opacity-60 disabled:cursor-not-allowed">
              {processing ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
              ) : (
                <>Pay {formatNaira(total)} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-berry-400">By placing this order, you agree to our terms and privacy policy.</p>
          </div>
        </div>
      </form>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-berry-700">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-blush-500">{error}</p>}
    </label>
  );
}
