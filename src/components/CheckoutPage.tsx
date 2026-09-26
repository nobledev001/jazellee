import { useEffect, useState, useRef } from 'react';
import { ArrowRight, CreditCard, Building2, Smartphone, Check, Lock, ChevronDown, AlertCircle, Sparkles, Ticket, X, CheckCircle2 } from 'lucide-react';
import { useStore, getCartProducts } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';
import { useAuth, supabase, recordCustomerProfile } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { getPaystackPublicKey, verifyPaystackTransactionOnServer, ensurePaystackScriptLoaded } from '@/lib/paystack';

type PaymentMethod = 'card' | 'bank' | 'ussd';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        channels?: string[];
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string; status: string; trxref: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export default function CheckoutPage() {
  const {
    cart,
    cartSubtotal,
    deliveryFee,
    appliedCoupon,
    discountAmount,
    cartTotal,
    applyCoupon,
    removeCoupon,
    incrementCouponUsage,
    clearCart,
  } = useStore();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const items = getCartProducts(cart);

  const [promoInput, setPromoInput] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    setPromoFeedback(null);
    const res = await applyCoupon(promoInput);
    setApplyingPromo(false);
    if (res.success) {
      setPromoInput('');
      setPromoFeedback({ type: 'success', text: res.message });
    } else {
      setPromoFeedback({ type: 'error', text: res.message });
    }
  };

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    lga: '',
    landmark: '',
    paymentMethod: 'card' as PaymentMethod,
  });

  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [resumedOrderNumber, setResumedOrderNumber] = useState<string | null>(null);
  // Generate ONE transaction reference per checkout attempt, stored in state, reused if user retries
  const [checkoutReference, setCheckoutReference] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const resumeCode = params.get('resume')?.trim();
      if (resumeCode) return resumeCode;
    }
    return `JAZ-${Date.now().toString().slice(-8)}`;
  });
  const isSubmittingRef = useRef(false);
  const [restoringCart, setRestoringCart] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Check for ?resume=... in URL to restore pending order via SECURITY DEFINER track_order RPC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeCode = params.get('resume')?.trim();
    const resumeContact = (params.get('contact') || params.get('email') || '').trim();
    if (resumeCode) {
      setRestoringCart(true);
      (async () => {
        try {
          let rpcRes = await supabase.rpc('track_order', {
            p_order_number: resumeCode,
            ...(resumeContact ? { p_contact: resumeContact } : {}),
          });

          if (rpcRes.error && !resumeContact) {
            rpcRes = await supabase.rpc('track_order', {
              p_order_number: resumeCode,
              p_contact: '',
            });
          }

          const rawData = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
          if (!rpcRes.error && rawData && typeof rawData === 'object') {
            const ord = rawData as Record<string, unknown>;
            if (ord.status === 'pending' || (ord.status !== 'placed' && ord.payment_status !== 'paid')) {
              const code = String(ord.order_number || resumeCode);
              setResumedOrderNumber(code);
              setCheckoutReference(code);
              setForm((prev) => ({
                ...prev,
                fullName: String(ord.customer_name || prev.fullName),
                email: String(ord.customer_email || prev.email),
                phone: String(ord.customer_phone || prev.phone),
                address: String(ord.delivery_address || prev.address),
                state: String(ord.delivery_state || prev.state),
                lga: String(ord.delivery_lga || prev.lga),
                landmark: String(ord.delivery_landmark || prev.landmark),
                paymentMethod: (ord.payment_method as PaymentMethod) || prev.paymentMethod,
              }));

              // If local cart is empty, restore items from this order into cart
              const currentCartRaw = localStorage.getItem('jazelle-cart');
              const currentCart = currentCartRaw ? JSON.parse(currentCartRaw) : {};
              if (Object.keys(currentCart).length === 0 && Array.isArray(ord.items) && ord.items.length > 0) {
                const restoredCart: Record<string, number> = {};
                for (const it of ord.items as Array<{ slug?: string; quantity?: number }>) {
                  if (it.slug) restoredCart[it.slug] = it.quantity || 1;
                }
                localStorage.setItem('jazelle-cart', JSON.stringify(restoredCart));
                window.location.reload();
                return;
              }
            }
          }
        } catch (err) {
          console.warn('[Checkout] Order restore notice:', err);
        } finally {
          setRestoringCart(false);
        }
      })();
    }
  }, []);

  // Pre-fill user data if authenticated, but allow guest checkout
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || (user.user_metadata?.full_name as string) || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  if (restoringCart) {
    return (
      <main className="container-jazelle py-16 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blush-400 border-t-transparent rounded-full animate-spin" />
          <h1 className="font-display text-lg font-medium text-berry-800">Restoring your cart...</h1>
          <p className="text-xs text-berry-400">Retrieving your reserved self-care items from pending order.</p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-jazelle py-16 text-center">
        <h1 className="section-title">Your cart is empty</h1>
        <p className="mt-2 text-sm text-berry-400">Discover little daily luxuries to add to your routine.</p>
        <a href="/shop" className="btn-primary mt-6">Browse the shop</a>
      </main>
    );
  }

  const total = cartTotal;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const fullNameTrim = form.fullName.trim();
    if (!fullNameTrim) next.fullName = 'Please enter your full name';
    else if (fullNameTrim.length < 2 || fullNameTrim.length > 100) next.fullName = 'Full name must be between 2 and 100 characters';

    const emailTrim = form.email.trim();
    if (!emailTrim) next.email = 'Please enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) || emailTrim.length > 120) next.email = 'Please enter a valid email address';

    const phoneClean = form.phone.replace(/[\s-]/g, '');
    if (!phoneClean) next.phone = 'Please enter your phone number';
    else if (!/^\+?[\d]{10,15}$/.test(phoneClean)) next.phone = 'Please enter a valid phone number (10 to 15 digits)';

    const addressTrim = form.address.trim();
    if (!addressTrim) next.address = 'Please enter your delivery address';
    else if (addressTrim.length > 300) next.address = 'Address is too long (max 300 characters)';

    if (!form.state) next.state = 'Please select your state';

    const lgaTrim = form.lga.trim();
    if (!lgaTrim) next.lga = 'Please enter your LGA or city area';
    else if (lgaTrim.length > 100) next.lga = 'LGA/city must be under 100 characters';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /**
   * Finalizes post-payment client actions after verify-paystack has verified the payment
   * and finalized the order server-side (status -> placed, payment_status -> paid,
   * stock decremented, coupon used_count incremented).
   */
  const handlePaymentSuccess = async (paymentRef: string, orderNumber: string) => {
    try {
      console.group('💳 [CHECKOUT] Step 2: Post-Payment Completion (Server-Finalized)');
      console.log('1. Payment verified & finalized server-side for reference:', paymentRef, 'order:', orderNumber);

      const { data: authData } = await supabase.auth.getSession();
      const currentUserId = authData?.session?.user?.id;

      // Record shopper profile in customer directory if authenticated
      void recordCustomerProfile({
        id: currentUserId || undefined,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });

      // Notify admin & other windows that order is now paid
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jazelle_orders_updated'));
      }

      // Trigger transactional order confirmation email via Resend
      await sendOrderConfirmationEmail({
        order_number: orderNumber,
        customer_name: form.fullName.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        delivery_address: form.address.trim(),
        delivery_state: form.state,
        delivery_lga: form.lga.trim(),
        items: items.map(({ product, quantity }) => ({
          name: product.name,
          quantity,
          price: product.price,
          image: product.image,
        })),
        subtotal: cartSubtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: form.paymentMethod,
      });

      console.groupEnd();

      // Clear local coupon & cart state and navigate to confirmation screen
      await incrementCouponUsage();
      clearCart();
      isSubmittingRef.current = false;
      setProcessing(false);
      navigate(
        `/order-confirmation?id=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(form.email.trim())}`
      );
    } catch (err: unknown) {
      console.error('[Checkout] Post-payment processing error:', err);
      console.groupEnd();
      isSubmittingRef.current = false;
      setProcessing(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setPaymentNotice(`Order finalization failed: ${errMsg}`);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Immediate synchronous guard to prevent double-click or multiple modal spawns
    if (processing || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setProcessing(true);

    if (!validate()) {
      isSubmittingRef.current = false;
      setProcessing(false);
      return;
    }
    setPaymentNotice(null);

    let orderNumber = checkoutReference;
    const paystackKey = getPaystackPublicKey();

    // Check if localStorage['jazelle-applied-coupon'] was modified directly in DevTools
    let activeCoupon = appliedCoupon;
    try {
      const rawStoredCoupon = localStorage.getItem('jazelle-applied-coupon');
      if (rawStoredCoupon) {
        const parsedCoupon = JSON.parse(rawStoredCoupon);
        if (parsedCoupon && typeof parsedCoupon === 'object' && parsedCoupon.code) {
          activeCoupon = {
            code: String(parsedCoupon.code).trim().toUpperCase(),
            discount_type: String(parsedCoupon.discount_type || 'percentage'),
            discount_value: Number(parsedCoupon.discount_value) || 0,
          };
        }
      }
    } catch {
      // ignore malformed JSON
    }

    let effectiveDiscount = discountAmount;
    if (activeCoupon && cartSubtotal > 0) {
      if (activeCoupon.discount_type === 'percentage') {
        effectiveDiscount = Math.min(
          cartSubtotal,
          Math.round((cartSubtotal * Number(activeCoupon.discount_value)) / 100)
        );
      } else {
        effectiveDiscount = Math.min(cartSubtotal, Math.max(0, Number(activeCoupon.discount_value)));
      }
    }
    const effectiveTotal = Math.max(0, cartSubtotal - effectiveDiscount) + (cartSubtotal > 0 ? deliveryFee : 0);

    // 1. AUTO-SUBSCRIBE TO NEWSLETTER ON CHECKOUT (if customer checked box)
    if (subscribeNewsletter && form.email.trim()) {
      try {
        const cleanEmail = form.email.trim().toLowerCase();
        const { error: newsErr } = await supabase.from('newsletter_subscribers').insert({
          email: cleanEmail,
          source: 'checkout',
          created_at: new Date().toISOString(),
        });
        if (newsErr && newsErr.code !== '23505') {
          console.error('[Checkout] Newsletter subscription database error:', newsErr.message);
        }
      } catch (newsErr) {
        console.warn('[Checkout] Auto-subscribe newsletter notice:', newsErr);
      }
    }

    // 2. CREATE PENDING ORDER RECORD IMMEDIATELY (BEFORE PAYMENT COMPLETES)
    try {
      console.group('🛒 [CHECKOUT] Step 1: Pre-Payment Pending Order Insertion');
      const { data: authData } = await supabase.auth.getSession();
      const currentUserId = authData?.session?.user?.id;

      const buildPendingPayload = (ordNum: string): Record<string, unknown> => {
        const payload: Record<string, unknown> = {
          order_number: ordNum,
          items: items.map(({ product, quantity }) => ({
            slug: product.slug,
            name: product.name,
            price: product.price,
            quantity,
            image: product.image,
          })),
          subtotal: cartSubtotal,
          delivery_fee: deliveryFee,
          discount_amount: effectiveDiscount,
          coupon_code: activeCoupon ? activeCoupon.code : null,
          total: effectiveTotal,
          status: 'pending',
          customer_name: form.fullName.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim(),
          delivery_address: form.address.trim(),
          delivery_state: form.state,
          delivery_lga: form.lga.trim(),
          delivery_landmark: form.landmark.trim(),
          payment_method: form.paymentMethod,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (
          currentUserId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(currentUserId)
        ) {
          payload.user_id = currentUserId;
        }
        return payload;
      };

      let pendingPayload = buildPendingPayload(orderNumber);
      let insertResult = await supabase.from('orders').insert(pendingPayload);

      if (insertResult.error) {
        // Guests do not have UPDATE permission on public.orders under RLS.
        // If retrying checkout with an already-inserted order_number (23505), generate a fresh order reference.
        if (insertResult.error.code === '23505') {
          orderNumber = `JAZ-${Date.now().toString().slice(-8)}`;
          setCheckoutReference(orderNumber);
          pendingPayload = buildPendingPayload(orderNumber);
          insertResult = await supabase.from('orders').insert(pendingPayload);
        }

        if (insertResult.error) {
          console.error('❌ [CHECKOUT] Supabase pre-payment insert FAILED:', insertResult.error);
          console.groupEnd();
          isSubmittingRef.current = false;
          setProcessing(false);
          setPaymentNotice(
            `Database Error creating order (${insertResult.error.code || 'Error'}): ${insertResult.error.message}`
          );
          return;
        }
      }
      console.groupEnd();

      // Save customer profile directory entry if authenticated
      void recordCustomerProfile({
        id: currentUserId || undefined,
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });

      // Broadcast order creation for real-time live admin sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jazelle_orders_updated'));
        window.dispatchEvent(new CustomEvent('jazelle_order_created', { detail: pendingPayload }));
      }
    } catch (pendingErr: unknown) {
      console.error('❌ [CHECKOUT] Pre-payment pending order exception caught:', pendingErr);
      console.groupEnd();
      isSubmittingRef.current = false;
      setProcessing(false);
      const errMsg = pendingErr instanceof Error ? pendingErr.message : String(pendingErr);
      setPaymentNotice(`Database Error creating order: ${errMsg}`);
      return;
    }

    const channels: string[] =
      form.paymentMethod === 'bank'
        ? ['bank_transfer', 'bank']
        : form.paymentMethod === 'ussd'
        ? ['ussd']
        : ['card', 'bank', 'ussd', 'bank_transfer', 'qr'];

    // Ensure PaystackPop inline script is loaded
    await ensurePaystackScriptLoaded();

    if (typeof window.PaystackPop?.setup !== 'function') {
      isSubmittingRef.current = false;
      setProcessing(false);
      setPaymentNotice(
        'Unable to load Paystack checkout script. If you are using an ad blocker or privacy extension, please disable it for this site and try again, or open this store in a new browser tab.'
      );
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: form.email,
        amount: Math.round(effectiveTotal * 100), // in kobo
        currency: 'NGN',
        ref: orderNumber,
        channels,
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: form.fullName },
            { display_name: 'Phone Number', variable_name: 'phone', value: form.phone },
            {
              display_name: 'Delivery Address',
              variable_name: 'delivery_address',
              value: `${form.address}, ${form.lga}, ${form.state}`,
            },
          ],
        },
        callback: function (response: { reference?: string; trxref?: string; status?: string; message?: string }) {
          const paymentRef = response.reference || response.trxref || orderNumber;

          setProcessing(true);
          setPaymentNotice('Payment received by Paystack. Verifying transaction securely with backend...');

          void (async () => {
            const verification = await verifyPaystackTransactionOnServer(
              paymentRef,
              effectiveTotal,
              form.email.trim()
            );

            if (!verification.verified) {
              isSubmittingRef.current = false;
              setProcessing(false);

              const isIntegrationMismatch =
                verification.status === 'transaction_not_found' ||
                (typeof verification.message === 'string' && verification.message.includes('not found'));

              if (isIntegrationMismatch) {
                setPaymentNotice(
                  `Paystack Verification Failed (Transaction Not Found): Paystack could not locate reference "${paymentRef}" on the configured integration. Please ensure your frontend VITE_PAYSTACK_PUBLIC_KEY and backend PAYSTACK_SECRET_KEY belong to the SAME Paystack account (and both are in Test mode).`
                );
              } else {
                setPaymentNotice(
                  `Paystack Verification Failed: ${verification.message || 'Transaction could not be verified'}`
                );
              }
              return;
            }

            await handlePaymentSuccess(verification.reference || paymentRef, orderNumber);
          })();
        },
        onClose: function () {
          // Re-enable button on cancellation/close so user can retry with the same saved order reference
          isSubmittingRef.current = false;
          setProcessing(false);
          setPaymentNotice(
            'Payment window was closed. Your cart items are saved — please click below to retry whenever you are ready.'
          );
        },
      });

      if (!handler || typeof handler.openIframe !== 'function') {
        throw new Error('PaystackPop setup did not return a valid handler object with openIframe');
      }

      handler.openIframe();
    } catch (paystackErr: unknown) {
      console.error('[Paystack Checkout] Error opening Paystack iframe popup:', paystackErr);
      isSubmittingRef.current = false;
      setProcessing(false);
      const errMsg = paystackErr instanceof Error ? paystackErr.message : String(paystackErr);
      setPaymentNotice(
        `Could not open Paystack payment modal (${errMsg}). Please make sure popups and third-party frames are allowed in your browser, or open this application in a new browser tab.`
      );
    }
  };

  const paymentMethods: { id: PaymentMethod; label: string; description: string; icon: typeof CreditCard }[] = [
    { id: 'card', label: 'Card Payment', description: 'Visa, Mastercard, Verve', icon: CreditCard },
    { id: 'bank', label: 'Bank Transfer', description: 'Direct transfer from your Nigerian bank app', icon: Building2 },
    { id: 'ussd', label: 'USSD Code', description: 'Dial your bank USSD code on your mobile', icon: Smartphone },
  ];

  return (
    <main className="container-jazelle py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="section-title">Checkout</h1>
          <p className="mt-2 text-sm text-berry-400">
            Almost there &mdash; just a few details and your self-care picks will be on their way.
          </p>
        </div>
        {!user && (
          <div className="rounded-2xl bg-blush-50 px-4 py-2 text-xs text-blush-700 sm:text-right">
            <span>Shopping as a guest. </span>
            <a href="/login" className="font-semibold underline hover:text-blush-800">
              Sign in
            </a>{' '}
            to save to your account.
          </div>
        )}
      </div>

      {resumedOrderNumber && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-pink-50 p-4 text-xs text-pink-900 border border-pink-200 shadow-xs animate-fade-in-down">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-pink-600 flex-shrink-0" />
            <span>
              Welcome back! We restored your reserved items from pending Order <strong>#{resumedOrderNumber}</strong>. You can review your details and complete payment below.
            </span>
          </div>
        </div>
      )}

      {paymentNotice && (
        <div className="mt-6 flex items-center gap-2 rounded-3xl bg-blush-50 p-4 text-sm text-blush-700 animate-fade-in-down border border-blush-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blush-500" />
          <span>{paymentNotice}</span>
        </div>
      )}

      {errors.submit && (
        <div className="mt-6 flex items-center gap-2 rounded-3xl bg-blush-50 p-4 text-sm text-blush-700 animate-fade-in-down">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blush-500" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left: form fields */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">1. Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <input
                  className="input-jazelle"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="What should we call you?"
                />
              </Field>
              <Field label="Email address (for receipt & tracking)" error={errors.email}>
                <input
                  type="email"
                  className="input-jazelle"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Phone number (for delivery courier)" error={errors.phone}>
                <input
                  type="tel"
                  className="input-jazelle"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+234 801 234 5678"
                />
              </Field>

              {/* Newsletter auto-subscribe checkbox */}
              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-berry-700 hover:text-berry-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={subscribeNewsletter}
                    onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                    className="h-4 w-4 rounded border-blush-300 text-blush-600 focus:ring-blush-500 cursor-pointer accent-blush-500"
                  />
                  <span>Keep me updated on new drops and offers</span>
                </label>
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">2. Delivery address</h2>
            <div className="mt-4 space-y-4">
              <Field label="Street address" error={errors.address}>
                <input
                  className="input-jazelle"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House/flat number, street name, estate or area"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="State" error={errors.state}>
                  <div className="relative">
                    <select
                      className="input-jazelle appearance-none pr-10"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    >
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blush-300" />
                  </div>
                </Field>
                <Field label="LGA / City area" error={errors.lga}>
                  <input
                    className="input-jazelle"
                    value={form.lga}
                    onChange={(e) => setForm({ ...form, lga: e.target.value })}
                    placeholder="e.g. Ikeja, Wuse II, Lekki Phase 1"
                  />
                </Field>
              </div>
              <Field label="Nearest landmark (optional)">
                <input
                  className="input-jazelle"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  placeholder="e.g. Opposite the total filling station, near the yellow gate"
                />
              </Field>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-4xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-medium text-berry-800">3. Payment method</h2>
                <p className="mt-1 text-xs text-berry-400">
                  Powered by Paystack. Real-time encryption for Nigerian debit cards, bank transfers & USSD.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2.5 py-1 text-[0.7rem] font-semibold text-sage-700">
                <Lock className="h-3 w-3" /> Secure Paystack
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const active = form.paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: method.id })}
                    className={`flex w-full items-center gap-3 rounded-3xl border-2 p-4 text-left transition-all ${
                      active ? 'border-blush-500 bg-blush-50/70 shadow-sm' : 'border-blush-100 bg-white hover:border-blush-200'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        active ? 'bg-blush-500 text-white' : 'bg-blush-50 text-blush-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-berry-700">{method.label}</p>
                      <p className="text-xs text-berry-400">{method.description}</p>
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        active ? 'border-blush-500 bg-blush-500' : 'border-blush-200'
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-berry-400">
              <Lock className="h-3.5 w-3.5 text-blush-400" />
              <span>We never store your card numbers or banking PINs. All payments are verified securely via Paystack.</span>
            </div>
          </section>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Order Summary</h2>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map(({ product, quantity }) => (
                <div key={product.slug} className="flex items-center gap-3 py-1">
                  <div className="relative flex-shrink-0">
                    <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-500 text-[0.65rem] font-bold text-white">
                      {quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-berry-700">{product.name}</p>
                    <p className="text-xs text-berry-400">{formatNaira(product.price * quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="mt-4 pt-4 border-t border-blush-100">
              <label className="block text-xs font-semibold text-berry-700 mb-2">
                Promo Code
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-sage-50 border border-sage-200 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Ticket className="h-4 w-4 text-sage-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sage-800 font-mono">{appliedCoupon.code}</p>
                      <p className="text-[11px] text-sage-600 truncate">
                        {appliedCoupon.discount_type === 'percentage'
                          ? `${appliedCoupon.discount_value}% off applied`
                          : `${formatNaira(appliedCoupon.discount_value)} off applied`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeCoupon();
                      setPromoFeedback(null);
                    }}
                    className="p-1 rounded-full text-sage-600 hover:bg-sage-100 transition-colors cursor-pointer"
                    aria-label="Remove promo code"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleApplyPromo();
                      }
                    }}
                    placeholder="Enter code (e.g. GLOW10)"
                    className="input-jazelle !py-2 !px-3.5 text-xs uppercase flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => void handleApplyPromo()}
                    disabled={applyingPromo || !promoInput.trim()}
                    className="rounded-full bg-berry-800 px-4 py-2 text-xs font-semibold text-white hover:bg-berry-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {applyingPromo ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}

              {promoFeedback && (
                <div
                  className={`mt-2 flex items-center gap-1.5 text-xs ${
                    promoFeedback.type === 'success' ? 'text-sage-700' : 'text-blush-600'
                  }`}
                >
                  {promoFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{promoFeedback.text}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-blush-100 pt-4 text-sm">
              <div className="flex justify-between text-berry-500">
                <span>Subtotal</span>
                <span className="font-medium text-berry-700">{formatNaira(cartSubtotal)}</span>
              </div>
              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between text-sage-700 font-medium">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatNaira(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-berry-500">
                <span>Delivery across Nigeria</span>
                <span className="font-medium text-berry-700">
                  {deliveryFee === 0 ? (
                    <span className="text-sage-600 font-semibold">Free Delivery</span>
                  ) : (
                    formatNaira(deliveryFee)
                  )}
                </span>
              </div>
              <div className="border-t border-blush-100 pt-2 flex justify-between text-base font-bold text-berry-800">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing || isSubmittingRef.current}
              className="btn-primary mt-6 w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {processing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Pay {formatNaira(total)}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-4 space-y-2 text-center text-xs text-berry-400">
              <p className="flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-blush-400" /> Stock automatically reserved on payment
              </p>
              <p>By placing this order, you agree to our terms and privacy policy.</p>
            </div>
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
      {error && <p className="mt-1 text-xs text-blush-600">{error}</p>}
    </label>
  );
}
