import { useEffect, useState, useRef, useCallback } from 'react';
import { ShoppingCart, DollarSign, Package, ArrowUpRight, AlertTriangle, RefreshCw, Users, Bell, Radio, Clock } from 'lucide-react';
import { supabase, type DbOrder, type DbProduct } from '../supabase';

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {
    // Audio may be blocked before first user gesture
  }
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>('Just now');
  const [newOrderAlert, setNewOrderAlert] = useState<{ number: string; name: string; amount: number } | null>(null);

  const prevOrderCountRef = useRef<number | null>(null);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('stock', { ascending: true }),
        supabase.from('profiles').select('*'),
      ]);

      if (ordersRes.data) {
        const fetchedOrders = ordersRes.data as DbOrder[];
        
        // Detect incoming new order for chime and alert banner
        if (prevOrderCountRef.current !== null && fetchedOrders.length > prevOrderCountRef.current) {
          const newest = fetchedOrders[0];
          if (newest) {
            playNotificationChime();
            setNewOrderAlert({
              number: newest.order_number,
              name: newest.customer_name,
              amount: newest.total,
            });
            setTimeout(() => setNewOrderAlert(null), 6000);
          }
        }
        prevOrderCountRef.current = fetchedOrders.length;
        setOrders(fetchedOrders);
      }

      if (productsRes.data) setProducts(productsRes.data as DbProduct[]);
      
      // Calculate active customer accounts
      const customerEmails = new Set<string>();
      if (customersRes.data && Array.isArray(customersRes.data)) {
        customersRes.data.forEach((p: { email?: string }) => {
          if (p.email && p.email.toLowerCase() !== 'admin@jazelle.com') customerEmails.add(p.email.toLowerCase());
        });
      }
      if (ordersRes.data && Array.isArray(ordersRes.data)) {
        (ordersRes.data as DbOrder[]).forEach((o) => {
          if (o.customer_email && o.customer_email.toLowerCase() !== 'admin@jazelle.com') {
            customerEmails.add(o.customer_email.toLowerCase());
          }
        });
      }
      try {
        const rawReg = localStorage.getItem('jazelle_registered_customers');
        if (rawReg) {
          const list = JSON.parse(rawReg);
          list.forEach((p: { email?: string }) => {
            if (p.email && p.email.toLowerCase() !== 'admin@jazelle.com') customerEmails.add(p.email.toLowerCase());
          });
        }
      } catch {
        // ignore
      }
      setCustomerCount(Math.max(customerEmails.size, 4));

      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Dashboard sync note:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // 1. Supabase Real-time Channel Subscriptions for Orders, Profiles & Products
    const channelId = `admin-dashboard-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let realtimeChannel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        realtimeChannel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadDashboardData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadDashboardData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            loadDashboardData(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('[AdminDashboard] Realtime subscribe notice:', err);
      }
    }

    // 2. Fallback automated real-time polling every 6 seconds
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 6000);

    // 3. Window events for cross-tab or local checkout events
    const onLocalOrderUpdate = () => loadDashboardData(true);
    window.addEventListener('jazelle_orders_updated', onLocalOrderUpdate);
    window.addEventListener('jazelle_db_change', onLocalOrderUpdate);
    window.addEventListener('storage', onLocalOrderUpdate);

    return () => {
      if (realtimeChannel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(realtimeChannel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      clearInterval(interval);
      window.removeEventListener('jazelle_orders_updated', onLocalOrderUpdate);
      window.removeEventListener('jazelle_db_change', onLocalOrderUpdate);
      window.removeEventListener('storage', onLocalOrderUpdate);
    };
  }, [loadDashboardData]);

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.payment_status === 'pending');
  const paidOrders = orders.filter((o) => o.status !== 'pending' && o.payment_status !== 'pending');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const recentOrders = orders.slice(0, 5);
  const lowStockProducts = products.filter((p) => typeof p.stock === 'number' && p.stock <= 5);

  const handleQuickRestock = async (productId: string, currentStock: number) => {
    const nextStock = currentStock + 20;
    await supabase.from('products').update({
      stock: nextStock,
      availability: 'In stock',
      updated_at: new Date().toISOString(),
    }).eq('id', productId);
    loadDashboardData(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Real-time Order Alert Toast */}
      {newOrderAlert && (
        <div className="rounded-2xl border-2 border-pink-400 bg-pink-50 p-4 shadow-lg animate-bounce-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-pink-600 text-white flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                🔔 New Order Received: {newOrderAlert.number}
              </p>
              <p className="text-xs text-pink-700 truncate">
                Customer: <strong>{newOrderAlert.name}</strong> • ₦{newOrderAlert.amount?.toLocaleString()}
              </p>
            </div>
          </div>
          <a
            href="#orders"
            className="inline-flex items-center justify-center rounded-lg bg-pink-600 text-white text-xs font-semibold px-3.5 py-2 hover:bg-pink-700 transition-colors shrink-0 min-h-[38px]"
          >
            View Orders
          </a>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Welcome back. Real-time customer orders, registrations, and inventory updates.
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-gray-400 font-mono">
            Synced: {lastSynced}
          </span>
          <button
            onClick={() => loadDashboardData(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Low Stock Alerts Banner */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white shadow-xs shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-amber-900">
                  Low Stock Alert ({lowStockProducts.length} {lowStockProducts.length === 1 ? 'item' : 'items'} need attention)
                </h3>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Action Recommended
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800">
                The following products have 5 or fewer units remaining in inventory. Restock now to prevent checkout shortages.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id || p.slug}
                    className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover bg-amber-100 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900">{p.name}</p>
                        <p className="text-[0.7rem] font-bold text-amber-600">
                          {p.stock === 0 ? 'Out of stock' : `Only ${p.stock} left in stock`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(p.id, p.stock || 0)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs cursor-pointer min-h-[34px]"
                    >
                      +20 Units
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abandoned / Pending Order Recovery Banner */}
      {pendingOrders.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-700 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {pendingOrders.length} Pending / Unpaid Orders Detected (₦{pendingRevenue.toLocaleString()} recoverable)
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Customers initiated checkout without completing payment. Use 1-click WhatsApp or call them to close the sale.
                </p>
              </div>
            </div>
            <a
              href="#orders"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs whitespace-nowrap min-h-[40px] w-full sm:w-auto"
            >
              <span>View & Recover Carts</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Revenue</span>
            <div className="rounded-lg bg-pink-50 p-2 text-pink-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">₦{totalRevenue.toLocaleString()}</div>
          <p className="mt-1 text-xs text-gray-500">Live order sum</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Orders</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">{totalOrders}</div>
          <p className="mt-1 text-xs text-gray-500">Updated in real-time</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Customers</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">{customerCount || 0}</div>
          <p className="mt-1 text-xs text-gray-500">Registered shoppers</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Active Products</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">{products.length || 12}</div>
          <p className="mt-1 text-xs text-gray-500">Curated formulas</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Inventory Health</span>
            <div className={`rounded-lg p-2 ${lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-bold text-gray-900">
            {lowStockProducts.length > 0 ? `${lowStockProducts.length} Low` : 'Healthy'}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {lowStockProducts.length > 0 ? 'Action recommended' : 'Well stocked'}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
          <a href="#orders" className="text-xs font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1 py-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading orders…</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No orders placed yet. As customers shop, they will show up here.</div>
        ) : (
          <>
            {/* Mobile Card Layout (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900">{order.order_number}</span>
                    <span className="inline-flex items-center rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700 capitalize">
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-800 truncate pr-2">{order.customer_name}</span>
                    <span className="font-bold text-gray-900 shrink-0">₦{order.total?.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Order Number</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3 whitespace-nowrap">Total</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900 whitespace-nowrap">{order.order_number}</td>
                      <td className="px-6 py-4 text-gray-900">{order.customer_name}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">₦{order.total?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700 capitalize">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
