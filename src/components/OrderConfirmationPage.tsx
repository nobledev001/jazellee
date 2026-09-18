import { useEffect, useState } from 'react';
import { CheckCircle, Package, Mail, ArrowRight, Truck, Clock } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';
import { supabase } from '@/lib/auth';

interface OrderItem { slug: string; name: string; price: number; quantity: number; image: string; }
interface Order {
  order_number: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  created_at: string;
}

export default function OrderConfirmationPage() {
  const { search } = useRouter();
  const orderNumber = search.get('id') ?? '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) { setLoading(false); return; }
    supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle().then(({ data }) => {
      setOrder(data as Order | null);
      setLoading(false);
    });
  }, [orderNumber]);

  if (loading) {
    return <main className="container-jazelle py-16 text-center"><p className="text-berry-400">Loading...</p></main>;
  }

  if (!order) {
    return (
      <main className="container-jazelle py-16 text-center">
        <h1 className="section-title">Order not found</h1>
        <p className="mt-2 text-berry-400">We could not find this order. Check your order ID or contact us.</p>
        <a href="/shop" className="btn-primary mt-6">Back to Shop</a>
      </main>
    );
  }

  return (
    <main className="container-jazelle py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 animate-scale-in">
            <CheckCircle className="h-9 w-9 text-sage-600" />
          </div>
          <h1 className="font-display text-3xl font-medium text-berry-800 sm:text-4xl">Thank you, {order.customer_name.split(' ')[0]}!</h1>
          <p className="mt-2 text-berry-500">Your order has been placed successfully. A confirmation email is on its way to {order.customer_email}.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blush-50 px-5 py-2.5">
            <span className="text-sm text-berry-400">Order ID:</span>
            <span className="text-sm font-bold text-berry-800">{order.order_number}</span>
          </div>
        </div>

        <div className="mt-8 rounded-4xl bg-white p-6 shadow-soft sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">Order details</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
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
            <div className="flex justify-between text-berry-500"><span>Subtotal</span><span className="font-medium text-berry-700">{formatNaira(order.subtotal)}</span></div>
            <div className="flex justify-between text-berry-500"><span>Delivery</span><span className="font-medium text-berry-700">{order.delivery_fee === 0 ? 'Free' : formatNaira(order.delivery_fee)}</span></div>
            <div className="border-t border-blush-100 pt-2 flex justify-between text-base font-bold text-berry-800"><span>Total</span><span>{formatNaira(order.total)}</span></div>
          </div>
        </div>

        <div className="mt-4 rounded-4xl bg-white p-6 shadow-soft sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">Delivery to</h2>
          <div className="mt-3 space-y-1 text-sm text-berry-500">
            <p className="font-medium text-berry-700">{order.customer_name}</p>
            <p>{order.delivery_address}</p>
            <p>{order.delivery_lga}, {order.delivery_state}</p>
            <p>Nigeria</p>
          </div>
        </div>

        <div className="mt-4 rounded-4xl bg-blush-50 p-6 sm:p-8">
          <h2 className="font-display text-lg font-medium text-berry-800">What happens next?</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft"><Mail className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-berry-700">Confirmation email sent</p><p className="text-xs text-berry-400">Check your inbox for your order summary and receipt.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft"><Clock className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-berry-700">Processing</p><p className="text-xs text-berry-400">We are getting your order ready. You will get an email when it ships.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-blush-500 shadow-soft"><Truck className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold text-berry-700">On the way</p><p className="text-xs text-berry-400">Once shipped, you will receive a tracking link to follow your delivery.</p></div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href={`/track-order?id=${order.order_number}`} className="btn-primary"><Package className="h-4 w-4" /> Track Your Order</a>
          <a href="/shop" className="btn-secondary">Continue Shopping <ArrowRight className="h-4 w-4" /></a>
        </div>
      </div>
    </main>
  );
}
