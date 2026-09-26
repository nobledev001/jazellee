import { useEffect, useState, useCallback } from 'react';
import { Package, CheckCircle2, Truck, Home, Search, Clock } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';
import { supabase } from '@/lib/auth';

type Status = 'placed' | 'processing' | 'shipped' | 'delivered';

interface OrderItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  order_number: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount?: number;
  coupon_code?: string | null;
  total: number;
  status: Status;
  customer_name: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  created_at: string;
}

const STATUS_STEPS: { key: Status; label: string; icon: typeof Package; description: string }[] = [
  { key: 'placed', label: 'Order Placed', icon: CheckCircle2, description: 'We have received your order.' },
  { key: 'processing', label: 'Processing', icon: Clock, description: 'We are getting your items ready.' },
  { key: 'shipped', label: 'Shipped', icon: Truck, description: 'Your order is on the way to you.' },
  { key: 'delivered', label: 'Delivered', icon: Home, description: 'Your order has been delivered. Enjoy!' },
];

export default function TrackOrderPage() {
  const { search } = useRouter();
  const initialId = (search.get('id') ?? '').trim();
  const initialContact = (search.get('contact') ?? search.get('email') ?? '').trim();
  const [inputId, setInputId] = useState(initialId);
  const [inputContact, setInputContact] = useState(initialContact);
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const findOrder = useCallback(async (id: string, contact = '') => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Use the SECURITY DEFINER track_order RPC so guests can track orders under RLS
      let rpcResponse = await supabase.rpc('track_order', {
        p_order_number: cleanId,
        ...(contact.trim() ? { p_contact: contact.trim() } : {}),
      });

      if (rpcResponse.error && !contact.trim()) {
        rpcResponse = await supabase.rpc('track_order', {
          p_order_number: cleanId,
          p_contact: '',
        });
      }

      if (rpcResponse.error) {
        console.error('[TrackOrderPage] track_order RPC error:', rpcResponse.error);
        setErrorMsg(rpcResponse.error.message);
        setOrder(null);
      } else if (rpcResponse.data) {
        const raw = Array.isArray(rpcResponse.data) ? rpcResponse.data[0] : rpcResponse.data;
        if (raw && typeof raw === 'object' && 'order_number' in raw) {
          setOrder(raw as Order);
        } else {
          setOrder(null);
        }
      } else {
        setOrder(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not look up order.';
      setErrorMsg(msg);
      setOrder(null);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialId) {
      void findOrder(initialId, initialContact);
    }
  }, [initialId, initialContact, findOrder]);

  const currentStepIndex = order ? STATUS_STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <main className="container-jazelle py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="section-title">Track Your Order</h1>
        <p className="mt-2 text-sm text-berry-400">Enter your order ID to see where your self-care picks are.</p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blush-300" />
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && findOrder(inputId, inputContact)}
              placeholder="Order ID (e.g. JAZ-12345678)"
              className="input-jazelle pl-12"
            />
          </div>
          <input
            type="text"
            value={inputContact}
            onChange={(e) => setInputContact(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findOrder(inputId, inputContact)}
            placeholder="Email or phone (optional)"
            className="input-jazelle sm:w-56"
          />
          <button onClick={() => findOrder(inputId, inputContact)} className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </div>

        {searched && !order && (
          <div className="mt-6 rounded-4xl bg-white p-8 text-center shadow-soft">
            <p className="text-berry-500">
              {errorMsg ? `Database Error: ${errorMsg}` : 'No order found with that ID.'}
            </p>
            <p className="mt-1 text-xs text-berry-400">
              Double-check your order ID (and email/phone if prompted) from your confirmation email or page.
            </p>
          </div>
        )}

        {order && (
          <>
            <div className="mt-6 rounded-4xl bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-berry-400">Order ID</p>
                  <p className="text-lg font-bold text-berry-800">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-berry-400">Placed on</p>
                  <p className="text-sm font-medium text-berry-700">
                    {new Date(order.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-4xl bg-white p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-lg font-medium text-berry-800">Order status</h2>
              <div className="mt-6 space-y-1">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isComplete = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isLast = index === STATUS_STEPS.length - 1;
                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                            isComplete ? 'bg-blush-500 text-white' : 'bg-blush-50 text-blush-300'
                          } ${isCurrent ? 'ring-4 ring-blush-100' : ''}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        {!isLast && (
                          <span
                            className={`my-1 w-0.5 flex-1 ${
                              index < currentStepIndex ? 'bg-blush-400' : 'bg-blush-100'
                            }`}
                            style={{ minHeight: '2.5rem' }}
                          />
                        )}
                      </div>
                      <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                        <p className={`text-sm font-semibold ${isComplete ? 'text-berry-700' : 'text-berry-300'}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs ${isComplete ? 'text-berry-400' : 'text-blush-200'}`}>
                          {step.description}
                        </p>
                        {isCurrent && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blush-100 px-3 py-1 text-[0.65rem] font-bold text-blush-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blush-500 animate-pulse-soft" />
                            Current status
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-4xl bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-medium text-berry-800">Items in this order</h2>
              <div className="mt-4 space-y-3">
                {(order.items || []).map((item) => (
                  <div key={item.slug} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-berry-700">{item.name}</p>
                      <p className="text-xs text-berry-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-berry-800">{formatNaira(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-blush-100 pt-4 flex justify-between text-base font-bold text-berry-800">
                <span>Total</span>
                <span>{formatNaira(order.total)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-4xl bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-medium text-berry-800">Delivery address</h2>
              <div className="mt-3 space-y-1 text-sm text-berry-500">
                <p className="font-medium text-berry-700">{order.customer_name}</p>
                <p>{order.delivery_address}</p>
                <p>
                  {order.delivery_lga}, {order.delivery_state}
                </p>
                <p>Nigeria</p>
              </div>
            </div>
          </>
        )}

        {!searched && !loading && (
          <div className="mt-6 flex flex-col items-center rounded-4xl bg-white p-8 text-center shadow-soft">
            <Package className="h-10 w-10 text-blush-300" />
            <p className="mt-3 text-sm text-berry-400">Enter your order ID above to track your delivery.</p>
          </div>
        )}
      </div>
    </main>
  );
}
