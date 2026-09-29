import { useEffect, useState } from 'react';
import { CheckCircle, Package, Mail, ArrowRight, Truck, Clock } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';
import { supabase } from '@/lib/auth';
import { verifyMonnifyTransactionOnServer } from '@/lib/monnify';
import { useStore } from '@/store/StoreContext';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { extractOrderDeliveryInfo } from '@/lib/delivery';

interface OrderItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  delivery_method?: string;
  delivery_method_details?: { park_name?: string; park_location?: string };
  tracking_number?: string;
}

interface Order {
  order_number: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount?: number;
  coupon_code?: string | null;
  total: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  delivery_method?: string;
  delivery_method_details?: { park_name?: string; park_location?: string } | null;
  tracking_number?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  created_at: string;
}

export default function OrderConfirmationPage() {
  const { search } = useRouter();
  const { clearCart, incrementCouponUsage } = useStore();
  const orderNumber = (
    search.get('id') ||
    search.get('paymentReference') ||
    search.get('reference') ||
    ''
  ).trim();
  const transactionReference = (search.get('transactionReference') || '').trim();
  const contactParam = (search.get('email') ?? search.get('contact') ?? '').trim();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchTrackedOrder(): Promise<Order | null> {
      let rpcResponse = await supabase.rpc('track_order', {
        p_order_number: orderNumber,
        ...(contactParam ? { p_contact: contactParam } : {}),
      });

      if (rpcResponse.error && !contactParam) {
        rpcResponse = await supabase.rpc('track_order', {
          p_order_number: orderNumber,
          p_contact: '',
        });
      }

      if (rpcResponse.error) {
        console.error('[OrderConfirmationPage] track_order RPC error:', rpcResponse.error);
        if (isMounted) setErrorMsg(rpcResponse.error.message);
        return null;
      }

      if (rpcResponse.data) {
        const raw = Array.isArray(rpcResponse.data) ? rpcResponse.data[0] : rpcResponse.data;
        if (raw && typeof raw === 'object' && 'order_number' in raw) {
          return raw as Order;
        }
      }
      return null;
    }

    async function loadAndVerifyOrder() {
      setLoading(true);
      setErrorMsg(null);
      try {
        let fetchedOrder = await fetchTrackedOrder();

        // When Monnify redirects back via redirectUrl after payment, verify & finalize on the server if still pending
        if (
          !fetchedOrder ||
          fetchedOrder.status === 'pending' ||
          (fetchedOrder.payment_status && fetchedOrder.payment_status !== 'paid') ||
          transactionReference ||
          search.get('paymentReference')
        ) {
          const verification = await verifyMonnifyTransactionOnServer(
            orderNumber,
            transactionReference || undefined,
            fetchedOrder?.total,
            contactParam || fetchedOrder?.customer_email || ''
          );

          if (verification.verified) {
            const refreshed = await fetchTrackedOrder();
            if (refreshed) {
              fetchedOrder = refreshed;
            }
          }
        }

        if (!isMounted) return;

        if (fetchedOrder) {
          setOrder(fetchedOrder);

          // If order is finalized (or returned from redirect), clear cart & send confirmation email once
          const confirmKey = `jazelle_confirmed_${fetchedOrder.order_number}`;
          if (typeof window !== 'undefined' && !sessionStorage.getItem(confirmKey)) {
            sessionStorage.setItem(confirmKey, '1');
            void incrementCouponUsage();
            clearCart();
            window.dispatchEvent(new CustomEvent('jazelle_orders_updated'));

            const deliveryInfo = extractOrderDeliveryInfo(
              fetchedOrder as unknown as Record<string, unknown>
            );

            void sendOrderConfirmationEmail({
              order_number: fetchedOrder.order_number,
              customer_name: fetchedOrder.customer_name,
              customer_email: fetchedOrder.customer_email,
              customer_phone: fetchedOrder.customer_phone || '',
              delivery_address: fetchedOrder.delivery_address,
              delivery_state: fetchedOrder.delivery_state,
              delivery_lga: fetchedOrder.delivery_lga,
              delivery_method: deliveryInfo.deliveryMethod,
              delivery_method_details: deliveryInfo.deliveryDetails,
              items: (fetchedOrder.items || []).map((it) => ({
                name: it.name,
                quantity: it.quantity,
                price: it.price,
                image: it.image,
              })),
              subtotal: fetchedOrder.subtotal,
              delivery_fee: fetchedOrder.delivery_fee,
              total: fetchedOrder.total,
              payment_method: fetchedOrder.payment_method || 'card',
            });
          }
        } else {
          setOrder(null);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load order confirmation.';
        setErrorMsg(msg);
        setOrder(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadAndVerifyOrder();

    return () => {
      isMounted = false;
    };
  }, [orderNumber, transactionReference, contactParam, clearCart, incrementCouponUsage, search]);

  if (loading) {
    return (
      <main className="container-jazelle py-16 text-center">
        <p className="text-berry-400">Loading your order details...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="container-jazelle py-16 text-center">
        <h1 className="section-title">Order not found</h1>
        <p className="mt-2 text-berry-400">
          {errorMsg
            ? `Database error loading order: ${errorMsg}`
            : 'We could not find this order. Check your order ID or contact us.'}
        </p>
        <a href="/shop" className="btn-primary mt-6">Back to Shop</a>
      </main>
    );
  }

  const deliveryInfo = extractOrderDeliveryInfo(order as unknown as Record<string, unknown>);

  return (
    <main className="container-jazelle py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 animate-scale-in">
            <CheckCircle className="h-9 w-9 text-sage-600" />
          </div>
          <h1 className="font-display text-3xl font-medium text-berry-800 sm:text-4xl">
            Thank you, {(order.customer_name || 'Guest').split(' ')[0]}!
          </h1>
          <p className="mt-2 text-berry-500">
            Your order has been placed successfully. A confirmation email is on its way
            {order.customer_email ? ` to ${order.customer_email}` : ''}.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blush-50 px-5 py-2.5">
            <span className="text-sm text-berry-400">Order ID:</span>
            <span className="text-sm font-bold text-berry-800">{order.order_number}</span>
          </div>
        </div>

        <div className="mt-8 rounded-4xl bg-white p-6 shadow-soft sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">Order details</h2>
          <div className="mt-4 space-y-3">
            {(order.items || []).map((item) => (
              <div key={item.slug} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-berry-700">{item.name}</p>
                  <p className="text-xs text-berry-400">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-berry-800">{formatNaira(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-blush-100 pt-4 text-sm">
            <div className="flex justify-between text-berry-500">
              <span>Subtotal</span>
              <span className="font-medium text-berry-700">{formatNaira(order.subtotal)}</span>
            </div>
            {order.discount_amount && order.discount_amount > 0 ? (
              <div className="flex justify-between text-sage-700 font-medium">
                <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                <span>-{formatNaira(order.discount_amount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-berry-500">
              <span>Delivery ({deliveryInfo.deliveryMethodLabel})</span>
              <span className="font-medium text-berry-700">
                {order.delivery_fee === 0 ? 'Free' : formatNaira(order.delivery_fee)}
              </span>
            </div>
            <div className="border-t border-blush-100 pt-2 flex justify-between text-base font-bold text-berry-800">
              <span>Total</span>
              <span>{formatNaira(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-4xl bg-white p-6 shadow-soft sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">Delivery method &amp; destination</h2>
          <div className="mt-3 space-y-1.5 text-sm text-berry-500">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-blush-50 px-3 py-1 text-xs font-semibold text-blush-700">
              <Truck className="h-3.5 w-3.5" />
              <span>{deliveryInfo.fulfillmentSummary}</span>
            </p>
            <p className="font-medium text-berry-700 pt-1">{order.customer_name}</p>
            {deliveryInfo.deliveryMethod === 'motor_park' &&
              (deliveryInfo.deliveryDetails.park_name || deliveryInfo.deliveryDetails.park_location) && (
                <div className="rounded-2xl bg-blush-50/70 p-3 text-xs text-berry-700 border border-blush-100 space-y-1">
                  <p>
                    <strong>Park / Bus Company:</strong> {deliveryInfo.deliveryDetails.park_name || 'N/A'}
                  </p>
                  <p>
                    <strong>Destination City / Park Location:</strong>{' '}
                    {deliveryInfo.deliveryDetails.park_location || 'N/A'}
                  </p>
                </div>
              )}
            <p>{order.delivery_address}</p>
            <p>{order.delivery_lga}, {order.delivery_state}</p>
            <p>Nigeria</p>
          </div>
        </div>

        <div className="mt-4 rounded-4xl bg-blush-50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">What happens next?</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-berry-700">Confirmation email sent</p>
                <p className="text-xs text-berry-400">Check your inbox for your order summary and receipt.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-berry-700">Processing</p>
                <p className="text-xs text-berry-400">We are getting your order ready. You will get an email when it ships.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft">
                <Truck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-berry-700">On the way</p>
                <p className="text-xs text-berry-400">Once shipped, you will receive a tracking link to follow your delivery.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`/track-order?id=${encodeURIComponent(order.order_number)}${order.customer_email ? `&contact=${encodeURIComponent(order.customer_email)}` : ''}`}
            className="btn-primary"
          >
            <Package className="h-4 w-4" /> Track Your Order
          </a>
          <a href="/shop" className="btn-secondary">
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </main>
  );
}
