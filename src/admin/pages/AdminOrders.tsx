import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Bus,
  Send,
} from 'lucide-react';
import { supabase, type DbOrder } from '../supabase';
import { sendShippingUpdateEmail, sendOrderTrackingEmail } from '@/lib/email';
import {
  extractOrderDeliveryInfo,
  formatAdminDeliverySummary,
  getDeliveryMethodLabel,
  encodeDeliveryMetadataInLandmark,
  type DeliveryMethodId,
} from '@/lib/delivery';

export default function AdminOrders() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [lastSynced, setLastSynced] = useState<string>('Just now');
  const [newOrderNotice, setNewOrderNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Tracking number & delivery method management inside Order Detail modal
  const [trackingInput, setTrackingInput] = useState('');
  const [modalDeliveryMethod, setModalDeliveryMethod] = useState<DeliveryMethodId>('standard');
  const [modalParkName, setModalParkName] = useState('');
  const [modalParkLocation, setModalParkLocation] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingFeedback, setTrackingFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedOrder) {
      const info = extractOrderDeliveryInfo(selectedOrder as unknown as Record<string, unknown>);
      setTrackingInput(info.trackingNumber || '');
      setModalDeliveryMethod(info.deliveryMethod);
      setModalParkName(info.deliveryMethodDetails?.park_name || '');
      setModalParkLocation(info.deliveryMethodDetails?.park_location || '');
      setTrackingFeedback(null);
    }
  }, [selectedOrder]);

  const loadOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const fetched = data as DbOrder[];
        if (prevCountRef.current !== null && fetched.length > prevCountRef.current) {
          const newest = fetched[0];
          setNewOrderNotice(`New order received: ${newest.order_number} by ${newest.customer_name}`);
          setTimeout(() => setNewOrderNotice(null), 5000);
        }
        prevCountRef.current = fetched.length;
        setOrders(fetched);
      }
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Orders sync notice:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    // 1. Supabase Real-time channel for orders table
    const channelId = `admin-orders-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let ordersChannel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        ordersChannel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadOrders(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('[AdminOrders] Realtime subscribe notice:', err);
      }
    }

    // 2. Fallback automated real-time polling every 5 seconds
    const interval = setInterval(() => {
      loadOrders(true);
    }, 5000);

    // 3. Window events for cross-tab or local checkout events
    const onLocalOrderUpdate = () => loadOrders(true);
    window.addEventListener('jazelle_orders_updated', onLocalOrderUpdate);
    window.addEventListener('jazelle_db_change', onLocalOrderUpdate);
    window.addEventListener('storage', onLocalOrderUpdate);

    return () => {
      if (ordersChannel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(ordersChannel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      clearInterval(interval);
      window.removeEventListener('jazelle_orders_updated', onLocalOrderUpdate);
      window.removeEventListener('jazelle_db_change', onLocalOrderUpdate);
      window.removeEventListener('storage', onLocalOrderUpdate);
    };
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    await supabase.from('orders').update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    // Send transactional shipping update email if customer email exists
    // Do NOT send any tracking/delivery email from this site for Fez orders
    if (targetOrder && targetOrder.customer_email && nextStatus !== 'pending') {
      const deliveryInfo = extractOrderDeliveryInfo(
        targetOrder as unknown as Record<string, unknown>
      );
      if (deliveryInfo.deliveryMethod !== 'fez') {
        try {
          await sendShippingUpdateEmail({
            order_number: targetOrder.order_number,
            customer_name: targetOrder.customer_name,
            customer_email: targetOrder.customer_email,
            status: nextStatus,
            delivery_state: targetOrder.delivery_state,
          });
        } catch (emailErr) {
          console.warn('[AdminOrders] Shipping update email failed to dispatch:', emailErr);
        }
      }
    }

    loadOrders(true);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus, payment_status: nextStatus !== 'pending' ? 'paid' : 'pending' });
    }
  };

  const handleSaveTrackingNumber = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOrder) return;

    const trimmedTracking = trackingInput.trim();
    if (!trimmedTracking) {
      setTrackingFeedback({
        type: 'error',
        message: 'Please enter a Tracking Number / Waybill before saving.',
      });
      return;
    }

    setSavingTracking(true);
    setTrackingFeedback(null);

    try {
      const existingInfo = extractOrderDeliveryInfo(
        selectedOrder as unknown as Record<string, unknown>
      );
      const effectiveMethod = modalDeliveryMethod || existingInfo.deliveryMethod;
      const effectiveDetails =
        effectiveMethod === 'motor_park'
          ? {
              park_name: modalParkName.trim() || existingInfo.deliveryMethodDetails?.park_name || '',
              park_location:
                modalParkLocation.trim() || existingInfo.deliveryMethodDetails?.park_location || '',
            }
          : existingInfo.deliveryMethodDetails || null;

      // Embed delivery metadata in items[0] and landmark as a resilient fallback if columns are missing
      const updatedItems = (selectedOrder.items || []).map((item, idx) =>
        idx === 0
          ? {
              ...item,
              delivery_method: effectiveMethod,
              ...(effectiveDetails ? { delivery_method_details: effectiveDetails } : {}),
              tracking_number: trimmedTracking,
            }
          : item
      );

      const updatedLandmark = encodeDeliveryMetadataInLandmark(
        existingInfo.cleanLandmark,
        effectiveMethod,
        effectiveDetails,
        trimmedTracking
      );

      const nextStatus =
        selectedOrder.status === 'placed' || selectedOrder.status === 'processing'
          ? 'shipped'
          : selectedOrder.status;

      const fullUpdatePayload: Record<string, unknown> = {
        tracking_number: trimmedTracking,
        delivery_method: effectiveMethod,
        delivery_method_details: effectiveDetails,
        items: updatedItems,
        delivery_landmark: updatedLandmark,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from('orders')
        .update(fullUpdatePayload)
        .eq('id', selectedOrder.id);

      if (updateErr) {
        // Fallback if tracking_number / delivery_method columns are not yet migrated on remote DB
        const fallbackPayload: Record<string, unknown> = {
          items: updatedItems,
          delivery_landmark: updatedLandmark,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };
        const { error: fallbackErr } = await supabase
          .from('orders')
          .update(fallbackPayload)
          .eq('id', selectedOrder.id);
        if (fallbackErr) throw fallbackErr;
      }

      // Automatically trigger tracking email to customer via Resend (only for Motor Park orders)
      let emailDispatched = false;
      if (selectedOrder.customer_email && effectiveMethod === 'motor_park') {
        const emailRes = await sendOrderTrackingEmail({
          order_number: selectedOrder.order_number,
          customer_name: selectedOrder.customer_name,
          customer_email: selectedOrder.customer_email,
          delivery_method: effectiveMethod,
          delivery_method_details: effectiveDetails,
          tracking_number: trimmedTracking,
          delivery_address: selectedOrder.delivery_address,
          delivery_state: selectedOrder.delivery_state,
          delivery_lga: selectedOrder.delivery_lga,
          items: selectedOrder.items || [],
          total: selectedOrder.total,
        });
        emailDispatched = emailRes.ok;
      }

      const updatedOrder: DbOrder = {
        ...selectedOrder,
        tracking_number: trimmedTracking,
        delivery_method: effectiveMethod,
        delivery_method_details: effectiveDetails,
        items: updatedItems,
        delivery_landmark: updatedLandmark,
        status: nextStatus,
      };

      setSelectedOrder(updatedOrder);
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      loadOrders(true);

      const msg = emailDispatched
        ? `Tracking number (${trimmedTracking}) saved & tracking email sent to ${selectedOrder.customer_email}!`
        : `Tracking number (${trimmedTracking}) saved on order ${selectedOrder.order_number}.`;

      setTrackingFeedback({ type: 'success', message: msg });
      setActionNotice(msg);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error('[AdminOrders] Error saving tracking number:', err);
      setTrackingFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save tracking number.',
      });
    } finally {
      setSavingTracking(false);
    }
  };

  // Format time ago for pending orders
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsedMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Generate WhatsApp click-to-chat recovery link
  const getWhatsAppRecoveryUrl = (order: DbOrder) => {
    let phone = (order.customer_phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.slice(1);
    } else if (!phone.startsWith('234') && phone.length === 10) {
      phone = '234' + phone;
    }

    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://jazelleskinhaven.com';
    const resumeUrl = `${origin}/checkout?resume=${encodeURIComponent(order.order_number)}`;
    const firstName = order.customer_name ? order.customer_name.trim().split(' ')[0] : 'there';
    const itemsSummary = (order.items || []).map((i) => `${i.name} (x${i.quantity})`).join(', ');

    const message = `Hello ${firstName}! 💕 This is Jazelle Skin Haven following up on your order #${order.order_number} for ${itemsSummary}. We noticed you started checkout but didn't finish. Would you like assistance with payment, or should we keep your items reserved? You can complete your order directly here: ${resumeUrl}`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Trigger abandoned cart reminder email via API
  const handleSendReminderEmail = async (order: DbOrder) => {
    setSendingReminderId(order.id);
    try {
      const resp = await fetch('/api/admin/send-abandoned-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: order.order_number,
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          items: order.items,
          total: order.total,
        }),
      });

      if (resp.ok) {
        // Update local status
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, reminder_sent: true, reminder_sent_at: new Date().toISOString() } : o))
        );
        setActionNotice(`Reminder email sent to ${order.customer_email} for order ${order.order_number}`);
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        setActionNotice(`Notice: Email sent in simulated mode`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.warn('[AdminOrders] Send reminder notice:', err);
      setActionNotice('Email sent in test mode');
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setSendingReminderId(null);
    }
  };

  const isPendingOrder = (order: DbOrder) => {
    return order.status === 'pending' || order.payment_status === 'pending';
  };

  const pendingOrders = orders.filter(isPendingOrder);
  const completedOrders = orders.filter((o) => !isPendingOrder(o));

  const filtered = orders.filter((o) => {
    if (activeTab === 'pending' && !isPendingOrder(o)) return false;
    if (activeTab === 'completed' && isPendingOrder(o)) return false;

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {newOrderNotice && (
        <div className="rounded-xl border border-pink-400 bg-pink-50 p-3 text-xs font-semibold text-pink-900 shadow-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-pink-600 animate-pulse" />
          <span>{newOrderNotice}</span>
        </div>
      )}

      {actionNotice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 shadow-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders & Recovery</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Review orders, manage dispatches, and follow up on pending/abandoned carts.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-gray-400 font-mono">
            Synced: {lastSynced}
          </span>
          <button
            onClick={() => loadOrders(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px] ${
            activeTab === 'all'
              ? 'bg-berry-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          All Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`relative px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 min-h-[40px] ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Pending / Unpaid</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'pending' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'}`}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px] ${
            activeTab === 'completed'
              ? 'bg-berry-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Paid & Dispatched ({completedOrders.length})
        </button>
      </div>

      {/* DEDICATED PENDING / UNPAID ORDERS RECOVERY SECTION */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span>Pending & Abandoned Checkout Recovery</span>
                </h2>
                <p className="text-xs text-amber-800 mt-1">
                  Customers who started checkout and entered delivery information without completing payment. Use WhatsApp click-to-chat or direct calls to quickly assist and recover sales.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-amber-900 bg-amber-200/80 px-3 py-1.5 rounded-lg">
                  {pendingOrders.length} orders pending
                </span>
                <span className="text-xs font-bold text-amber-950 bg-amber-300/80 px-3 py-1.5 rounded-lg">
                  ₦{pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()} recoverable
                </span>
              </div>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 sm:p-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">No pending orders right now!</h3>
              <p className="text-xs text-gray-500 mt-1">All checkouts have been completed or marked paid.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingOrders.map((order) => {
                const waUrl = getWhatsAppRecoveryUrl(order);
                const timeAgo = formatTimeAgo(order.created_at);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-amber-200/90 bg-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 text-sm">{order.order_number}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          <Clock className="w-3 h-3" />
                          Placed {timeAgo}
                        </span>
                        {order.reminder_sent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Reminder Sent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className="text-xs text-gray-400">Cart Value:</span>
                        <span className="text-base font-bold text-gray-900">₦{order.total.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Customer Info */}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Customer Details</div>
                        <div className="text-sm font-bold text-gray-900 mt-1 truncate">{order.customer_name}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={`tel:${order.customer_phone}`} className="hover:text-pink-600 hover:underline font-mono">
                            {order.customer_phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={`mailto:${order.customer_email}`} className="hover:text-pink-600 hover:underline truncate">
                            {order.customer_email}
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.delivery_lga}, {order.delivery_state}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="md:col-span-1 min-w-0">
                        <div className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                          Items Left in Cart ({(order.items || []).length})
                        </div>
                        <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-gray-700 gap-2">
                              <span className="truncate font-medium">
                                {it.name} <span className="text-gray-400 font-normal">×{it.quantity}</span>
                              </span>
                              <span className="font-mono text-gray-900 font-semibold whitespace-nowrap shrink-0">
                                ₦{((it.price || 0) * (it.quantity || 1)).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Recovery Actions */}
                      <div className="flex flex-col justify-center gap-2 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                        <div className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider">
                          Follow-Up Actions
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-2 text-xs font-bold shadow-xs transition-colors min-h-[38px]"
                            title="Open pre-filled WhatsApp chat to customer"
                          >
                            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`tel:${order.customer_phone}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 text-xs font-bold shadow-xs transition-colors min-h-[38px]"
                            title="Call customer directly"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>Call</span>
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleSendReminderEmail(order)}
                            disabled={sendingReminderId === order.id}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 min-h-[38px]"
                          >
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span>{sendingReminderId === order.id ? 'Sending…' : 'Email Link'}</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(order.id, 'placed')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 text-xs font-semibold cursor-pointer transition-colors min-h-[38px]"
                            title="Mark this order as paid if customer completed offline transfer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Mark Paid</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters (Shown in all or completed view) */}
      {activeTab !== 'pending' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 bg-white p-4 rounded-xl border border-gray-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, customer name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 min-h-[42px]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-500 bg-white min-h-[42px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Payment</option>
              <option value="placed">Placed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      )}

      {/* Orders List / Table */}
      {activeTab !== 'pending' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading orders…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No orders found matching this filter.</div>
          ) : (
            <>
              {/* Mobile Order Cards (< 768px) */}
              <div className="divide-y divide-gray-100 md:hidden">
                {filtered.map((order) => {
                  const isPending = isPendingOrder(order);
                  const waUrl = getWhatsAppRecoveryUrl(order);

                  return (
                    <div
                      key={order.id}
                      className={`p-4 space-y-3 ${isPending ? 'bg-amber-50/20' : 'hover:bg-gray-50/60'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-sm text-gray-900">{order.order_number}</div>
                          <div className="text-[11px] text-gray-400">{formatTimeAgo(order.created_at)}</div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            isPending
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'processing'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}
                        >
                          {isPending ? 'Pending Payment' : order.status}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{order.customer_name}</div>
                          <div className="text-gray-500 font-mono mt-0.5">{order.customer_phone}</div>
                          <div className="text-gray-400 mt-0.5">
                            {order.delivery_lga ? `${order.delivery_lga}, ` : ''}{order.delivery_state}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-gray-900">₦{order.total.toLocaleString()}</div>
                          <div className="text-[11px] text-gray-400">{(order.items || []).length} items</div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-2 text-xs font-semibold shadow-2xs min-h-[36px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            onClick={() => handleSendReminderEmail(order)}
                            disabled={sendingReminderId === order.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 px-3 py-2 text-xs font-semibold cursor-pointer min-h-[36px]"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Remind</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] font-medium text-gray-400 uppercase">Status:</span>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-pink-500 min-h-[36px]"
                          >
                            <option value="pending">Pending</option>
                            <option value="placed">Placed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </div>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-pink-600 hover:border-pink-200 cursor-pointer min-h-[36px]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet & Desktop Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Order Number</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Destination</th>
                      <th className="px-6 py-3 whitespace-nowrap">Total</th>
                      <th className="px-6 py-3 whitespace-nowrap">Status</th>
                      <th className="px-6 py-3 whitespace-nowrap">Recovery / Actions</th>
                      <th className="px-6 py-3 whitespace-nowrap">Update</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((order) => {
                      const isPending = isPendingOrder(order);
                      const waUrl = getWhatsAppRecoveryUrl(order);

                      return (
                        <tr key={order.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-6 py-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                            <div>{order.order_number}</div>
                            <div className="text-[11px] text-gray-400 font-normal">{formatTimeAgo(order.created_at)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{order.customer_phone}</div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div>{order.delivery_state}</div>
                            <div className="text-gray-400">{order.delivery_lga}</div>
                            <div className="mt-1 inline-flex items-center gap-1 rounded bg-pink-50 px-1.5 py-0.5 text-[11px] font-medium text-pink-800 border border-pink-100">
                              <Truck className="w-3 h-3 shrink-0" />
                              <span>
                                {getDeliveryMethodLabel(
                                  extractOrderDeliveryInfo(order as unknown as Record<string, unknown>).deliveryMethod
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">₦{order.total.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'shipped'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'processing'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {isPending ? 'Pending Payment' : order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-[#25D366] hover:bg-[#20ba59] text-white px-2 py-1 text-xs font-semibold shadow-2xs"
                                  title="Open WhatsApp reminder chat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  onClick={() => handleSendReminderEmail(order)}
                                  disabled={sendingReminderId === order.id}
                                  className="inline-flex items-center gap-1 rounded bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 px-2 py-1 text-xs font-semibold cursor-pointer"
                                  title="Send reminder email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Paid ✓</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-pink-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="placed">Placed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="rounded p-1.5 text-gray-400 hover:text-pink-600 cursor-pointer"
                              title="View order details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Order {selectedOrder.order_number}</h3>
                  {isPendingOrder(selectedOrder) && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                      Pending Payment
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()} ({formatTimeAgo(selectedOrder.created_at)})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-xs sm:text-sm font-medium cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 shrink-0"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Follow-up Banner if Pending */}
            {isPendingOrder(selectedOrder) && (
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-amber-900">Abandoned / Unpaid Order</span>
                  <p className="text-amber-700">Follow up with customer to assist with payment.</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getWhatsAppRecoveryUrl(selectedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-[#25D366] text-white px-3 py-2 font-bold shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    WhatsApp
                  </a>
                  <button
                    onClick={() => handleSendReminderEmail(selectedOrder)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-pink-100 text-pink-800 px-3 py-2 font-bold cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                </div>
              </div>
            )}

            {(() => {
              const orderDeliveryInfo = extractOrderDeliveryInfo(
                selectedOrder as unknown as Record<string, unknown>
              );
              const activeMethod = modalDeliveryMethod || orderDeliveryInfo.deliveryMethod;
              const isExternalCourier = activeMethod === 'fez';
              const deliverViaSummary = formatAdminDeliverySummary(
                activeMethod,
                activeMethod === 'motor_park'
                  ? {
                      park_name:
                        modalParkName || orderDeliveryInfo.deliveryMethodDetails?.park_name,
                      park_location:
                        modalParkLocation ||
                        orderDeliveryInfo.deliveryMethodDetails?.park_location,
                    }
                  : orderDeliveryInfo.deliveryMethodDetails
              );

              return (
                <>
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                      Customer &amp; Delivery Fulfillment
                    </h4>

                    {/* Highlighted Delivery Method Banner */}
                    <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-3.5">
                      <div className="flex items-start gap-2.5">
                        {activeMethod === 'motor_park' ? (
                          <Bus className="h-4 w-4 text-pink-700 shrink-0 mt-0.5" />
                        ) : (
                          <Truck className="h-4 w-4 text-pink-700 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold uppercase tracking-wider text-pink-900">
                            {isExternalCourier
                              ? deliverViaSummary
                              : `Deliver via: ${deliverViaSummary}`}
                          </div>
                          {isExternalCourier && (
                            <p className="mt-1 text-xs text-pink-800">
                              Hand package off to{' '}
                              <span className="font-semibold">Fez Delivery</span>{' '}
                              using the customer&apos;s delivery address below. Delivery fee and customer tracking communication are handled directly by the courier.
                            </p>
                          )}
                          {activeMethod === 'motor_park' && (
                            <div className="mt-1.5 text-xs text-pink-800 space-y-0.5">
                              {modalParkName && (
                                <div>
                                  <span className="font-semibold">Park / Bus Company:</span>{' '}
                                  {modalParkName}
                                </div>
                              )}
                              {modalParkLocation && (
                                <div>
                                  <span className="font-semibold">Destination City / Park Location:</span>{' '}
                                  {modalParkLocation}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold">Motor Park Delivery Fee:</span>{' '}
                                ₦{(selectedOrder.delivery_fee || 0).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-xs space-y-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                      </p>
                      <p className="text-gray-500 break-all">{selectedOrder.customer_email}</p>
                      <p className="text-gray-700 pt-1">
                        <span className="font-semibold text-gray-500">Delivery Address:</span>{' '}
                        {selectedOrder.delivery_address}, {selectedOrder.delivery_lga},{' '}
                        {selectedOrder.delivery_state}
                      </p>
                      {orderDeliveryInfo.cleanLandmark && (
                        <p className="text-gray-500 italic">
                          Landmark: {orderDeliveryInfo.cleanLandmark}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tracking Number / Waybill Section — Shown ONLY for Motor Park orders (no price or tracking fields for Fez) */}
                  {activeMethod === 'motor_park' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-2xs">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                          <Bus className="h-3.5 w-3.5 text-pink-600" />
                          <span>Motor Park Dispatch &amp; Waybill Tracking</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Add or update the bus waybill/pickup details after booking. The customer will be automatically emailed with these pickup instructions.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Park / Bus Company Name
                          </label>
                          <input
                            type="text"
                            value={modalParkName}
                            onChange={(e) => setModalParkName(e.target.value)}
                            placeholder="e.g. GIGM, ABC Transport, GUO"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Destination City / Park Location
                          </label>
                          <input
                            type="text"
                            value={modalParkLocation}
                            onChange={(e) => setModalParkLocation(e.target.value)}
                            placeholder="e.g. Sabon Gari Park, Kano"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      <form onSubmit={handleSaveTrackingNumber} className="space-y-2.5 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Tracking Number / Waybill (Motor Park / Bus Pickup)
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={trackingInput}
                              onChange={(e) => setTrackingInput(e.target.value)}
                              placeholder="Enter bus waybill / driver phone / tag number…"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-pink-500"
                            />
                            <button
                              type="submit"
                              disabled={savingTracking}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>
                                {savingTracking
                                  ? 'Saving & Emailing…'
                                  : orderDeliveryInfo.trackingNumber
                                  ? 'Update & Resend Email'
                                  : 'Save & Email Tracking'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                          Customer will receive waybill number &amp; pickup instructions for{' '}
                          <span className="font-semibold text-gray-700">
                            {modalParkName || 'the selected bus company'}
                          </span>{' '}
                          at{' '}
                          <span className="font-semibold text-gray-700">
                            {modalParkLocation || 'the destination park'}
                          </span>
                          .
                        </div>

                        {trackingFeedback && (
                          <div
                            className={`rounded-lg px-3 py-2 text-xs font-medium ${
                              trackingFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {trackingFeedback.message}
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </>
              );
            })()}

            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Items Ordered</h4>
              <div className="mt-2 divide-y divide-gray-100">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={item.image} alt={item.name} className="h-9 w-9 rounded object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400">Qty: {item.quantity} × ₦{item.price.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 shrink-0">₦{(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5 text-sm">
              {(() => {
                const orderDeliveryInfo = extractOrderDeliveryInfo(
                  selectedOrder as unknown as Record<string, unknown>
                );
                const isExternalCourier =
                  orderDeliveryInfo.deliveryMethod === 'fez';

                return selectedOrder.discount_amount && selectedOrder.discount_amount > 0 ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span>₦{(selectedOrder.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                      <span>Promo Discount {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}</span>
                      <span>-₦{selectedOrder.discount_amount.toLocaleString()}</span>
                    </div>
                    {!isExternalCourier && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Delivery Fee</span>
                        <span>
                          {(selectedOrder.delivery_fee || 0) === 0
                            ? 'Free'
                            : `₦${(selectedOrder.delivery_fee || 0).toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </>
                ) : null;
              })()}
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-500">Total ({selectedOrder.payment_method})</span>
                <span className="text-lg font-bold text-gray-900">₦{selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
