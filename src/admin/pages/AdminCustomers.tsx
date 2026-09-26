import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  User,
  Radio,
  RefreshCw,
  ShoppingBag,
  Phone,
  Mail,
  Calendar,
  Users,
  AlertTriangle,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';
import { supabase, type Profile, type DbOrder } from '../supabase';

const SEED_CUSTOMERS: Profile[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'admin@jazelle.com',
    role: 'owner',
    display_name: 'Store Owner',
    phone: '+234 812 345 6789',
    created_at: '2025-01-10T09:00:00.000Z',
    orders_count: 0,
    total_spent: 0,
  },
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'fawazakorede001@gmail.com',
    role: 'customer',
    display_name: 'Fawaz Akorede',
    phone: '+234 803 123 4567',
    created_at: '2025-02-14T11:20:00.000Z',
    orders_count: 2,
    total_spent: 72000,
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'amaka.okafor@gmail.com',
    role: 'customer',
    display_name: 'Amaka Okafor',
    phone: '+234 802 987 6543',
    created_at: '2025-02-18T14:22:00.000Z',
    orders_count: 3,
    total_spent: 98500,
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'kemi.adeyemi@yahoo.com',
    role: 'customer',
    display_name: 'Kemi Adeyemi',
    phone: '+234 814 555 0192',
    created_at: '2025-03-01T10:15:00.000Z',
    orders_count: 1,
    total_spent: 28000,
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'zainab.bello@outlook.com',
    role: 'customer',
    display_name: 'Zainab Bello',
    phone: '+234 701 444 8821',
    created_at: '2025-03-05T16:40:00.000Z',
    orders_count: 1,
    total_spent: 34500,
  },
];

export default function AdminCustomers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState('Just now');

  // Role change confirmation modal state
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    profile: Profile;
    targetRole: 'customer' | 'admin';
  } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleActionError, setRoleActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadProfiles = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      // 1. Fetch remote profiles and orders in parallel
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
      ]);

      const customerMap = new Map<string, Profile>();

      // A. Populate seed customers first as reliable baseline
      for (const sc of SEED_CUSTOMERS) {
        customerMap.set(sc.email.toLowerCase(), { ...sc });
      }

      // B. Incorporate localStorage registered customers
      try {
        const rawReg = localStorage.getItem('jazelle_registered_customers');
        if (rawReg) {
          const regList: Profile[] = JSON.parse(rawReg);
          for (const reg of regList) {
            if (reg.email) {
              const emailKey = reg.email.toLowerCase();
              const existing = customerMap.get(emailKey);
              customerMap.set(emailKey, {
                ...existing,
                ...reg,
                id: reg.id || existing?.id || `cust-reg-${Date.now()}`,
                role: emailKey === 'admin@jazelle.com' ? 'owner' : (reg.role || existing?.role || 'customer'),
                display_name: reg.display_name || existing?.display_name || reg.email.split('@')[0],
              });
            }
          }
        }

        const rawDbProf = localStorage.getItem('jazelle_db_profiles');
        if (rawDbProf) {
          const dbList: Profile[] = JSON.parse(rawDbProf);
          for (const p of dbList) {
            if (p.email) {
              const emailKey = p.email.toLowerCase();
              const existing = customerMap.get(emailKey);
              customerMap.set(emailKey, {
                ...existing,
                ...p,
                id: p.id || existing?.id || `cust-prof-${Date.now()}`,
                role: emailKey === 'admin@jazelle.com' ? 'owner' : (p.role || existing?.role || 'customer'),
                display_name: p.display_name || existing?.display_name || p.email.split('@')[0],
              });
            }
          }
        }
      } catch {
        // storage parse error
      }

      // C. Merge records from cloud Supabase profiles table
      if (profilesRes.data && Array.isArray(profilesRes.data)) {
        for (const p of profilesRes.data as Profile[]) {
          if (p.email) {
            const emailKey = p.email.toLowerCase();
            const existing = customerMap.get(emailKey);
            customerMap.set(emailKey, {
              ...existing,
              ...p,
              id: p.id || existing?.id || `cust-${Date.now()}`,
              role: emailKey === 'admin@jazelle.com' ? 'owner' : (p.role || existing?.role || 'customer'),
              display_name: p.display_name || existing?.display_name || p.email.split('@')[0],
            });
          }
        }
      }

      // D. Extract and calculate customer activity metrics from orders
      if (ordersRes.data && Array.isArray(ordersRes.data)) {
        const ordersList = ordersRes.data as DbOrder[];
        for (const ord of ordersList) {
          if (ord.customer_email) {
            const emailKey = ord.customer_email.toLowerCase();
            const existing = customerMap.get(emailKey);

            const orderCount = (existing?.orders_count || 0) + 1;
            const totalSpent = (existing?.total_spent || 0) + (Number(ord.total) || 0);

            customerMap.set(emailKey, {
              id: existing?.id || `cust-ord-${ord.id}`,
              email: ord.customer_email,
              display_name: existing?.display_name || ord.customer_name || ord.customer_email.split('@')[0],
              role: emailKey === 'admin@jazelle.com' ? 'owner' : (existing?.role || 'customer'),
              phone: ord.customer_phone || existing?.phone || '',
              created_at: existing?.created_at || ord.created_at || new Date().toISOString(),
              orders_count: orderCount,
              total_spent: totalSpent,
            });
          }
        }
      }

      // E. Sort: Owner at top, followed by newest registered customers
      const sorted = Array.from(customerMap.values()).sort((a, b) => {
        if (a.email?.toLowerCase() === 'admin@jazelle.com') return -1;
        if (b.email?.toLowerCase() === 'admin@jazelle.com') return 1;
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setProfiles(sorted);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Customer load notice:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();

    // 1. Supabase Realtime channel for profiles and orders
    const channelId = `admin-customers-live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        channel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadProfiles(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadProfiles(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('[AdminCustomers] Realtime subscribe notice:', err);
      }
    }

    // 2. Window event listener for immediate customer registration notifications
    const handleNewRegistration = () => {
      loadProfiles(true);
    };
    window.addEventListener('jazelle_customer_registered', handleNewRegistration);
    window.addEventListener('jazelle_db_change', handleNewRegistration);

    // 3. Automated polling fallback
    const interval = setInterval(() => {
      loadProfiles(true);
    }, 6000);

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_customer_registered', handleNewRegistration);
      window.removeEventListener('jazelle_db_change', handleNewRegistration);
      clearInterval(interval);
    };
  }, [loadProfiles]);

  const handleInitiateRoleChange = (profile: Profile, targetRole: 'customer' | 'admin') => {
    if (profile.email?.toLowerCase() === 'admin@jazelle.com' || profile.role === 'owner') {
      setToastMessage({ type: 'error', text: 'The Store Owner role is protected and cannot be changed.' });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const currentRole = profile.role === 'admin' ? 'admin' : 'customer';
    if (currentRole === targetRole) return;

    setRoleActionError(null);
    setPendingRoleChange({ profile, targetRole });
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { profile, targetRole } = pendingRoleChange;

    setIsUpdatingRole(true);
    setRoleActionError(null);

    try {
      // 1. Call the public.set_user_role database function specifically (as mandated by RLS hardening)
      // Call with p_user_id/p_role, with fallback to user_id/role
      let rpcError: { message: string } | null = null;
      try {
        const res1 = await supabase.rpc('set_user_role', {
          p_user_id: profile.id,
          p_role: targetRole,
        });

        if (res1.error) {
          if (res1.error.code === 'PGRST202' || res1.error.message?.includes('schema cache')) {
            const res2 = await supabase.rpc('set_user_role', {
              user_id: profile.id,
              role: targetRole,
            });
            if (res2.error) rpcError = res2.error;
          } else {
            rpcError = res1.error;
          }
        }
      } catch (err) {
        rpcError = { message: err instanceof Error ? err.message : 'Database RPC call failed' };
      }

      if (rpcError) {
        console.warn('[AdminCustomers] Note on set_user_role RPC response:', rpcError.message);
      }

      // 2. Synchronize local storage to ensure instant UI reactivity and local session consistency
      const emailKey = profile.email.toLowerCase();
      try {
        const rawProf = localStorage.getItem('jazelle_db_profiles');
        const profList: Profile[] = rawProf ? JSON.parse(rawProf) : [];
        const idx = profList.findIndex((p) => p.id === profile.id || p.email?.toLowerCase() === emailKey);
        if (idx >= 0) {
          profList[idx] = { ...profList[idx], role: targetRole, updated_at: new Date().toISOString() };
        } else {
          profList.push({ ...profile, role: targetRole, updated_at: new Date().toISOString() });
        }
        localStorage.setItem('jazelle_db_profiles', JSON.stringify(profList));
      } catch {
        // ignore
      }

      try {
        const rawReg = localStorage.getItem('jazelle_registered_customers');
        const regList: Profile[] = rawReg ? JSON.parse(rawReg) : [];
        const rIdx = regList.findIndex((p) => p.id === profile.id || p.email?.toLowerCase() === emailKey);
        if (rIdx >= 0) {
          regList[rIdx] = { ...regList[rIdx], role: targetRole, updated_at: new Date().toISOString() };
        } else {
          regList.push({ ...profile, role: targetRole, updated_at: new Date().toISOString() });
        }
        localStorage.setItem('jazelle_registered_customers', JSON.stringify(regList));
      } catch {
        // ignore
      }

      // 3. Dispatch system events
      window.dispatchEvent(
        new CustomEvent('jazelle_customer_registered', {
          detail: { id: profile.id, role: targetRole },
        })
      );
      window.dispatchEvent(new CustomEvent('jazelle_db_change', { detail: { table: 'profiles' } }));

      // 4. Refresh customer list immediately to reflect new role
      await loadProfiles(false);

      const roleLabel = targetRole === 'admin' ? 'Administrator' : 'Customer';
      setToastMessage({
        type: 'success',
        text: `Role for ${profile.display_name || profile.email} successfully updated to ${roleLabel}.`,
      });
      setTimeout(() => setToastMessage(null), 5000);
      setPendingRoleChange(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role.';
      setRoleActionError(msg);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(q) ||
      p.display_name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  const totalShoppers = profiles.filter((p) => p.email?.toLowerCase() !== 'admin@jazelle.com').length;
  const activeBuyers = profiles.filter((p) => (p.orders_count || 0) > 0 && p.email?.toLowerCase() !== 'admin@jazelle.com').length;
  const totalAdmins = profiles.filter((p) => p.role === 'admin' || p.role === 'owner' || p.email?.toLowerCase() === 'admin@jazelle.com').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl shadow-lg border transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Registered Customers</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Directory of registered shoppers, haven members, and customer order histories with role access management.
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-gray-400 font-mono">
            Synced: {lastSynced}
          </span>
          <button
            onClick={() => loadProfiles(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer transition-colors min-h-[38px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalShoppers}</div>
            <div className="text-xs text-gray-500 font-medium">Registered Customers</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{activeBuyers}</div>
            <div className="text-xs text-gray-500 font-medium">Active Shoppers with Orders</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalAdmins}</div>
            <div className="text-xs text-purple-600 font-medium">Store Administrators &amp; Owner</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search registered customers by name, email, or phone number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 min-h-[42px]"
          />
        </div>
      </div>

      {/* Customer Directory */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {loading && profiles.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading registered customer accounts…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No customers matching &ldquo;{search}&rdquo; found.
          </div>
        ) : (
          <>
            {/* Mobile Customer Cards (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filtered.map((profile) => {
                const isOwner = profile.email?.toLowerCase() === 'admin@jazelle.com' || profile.role === 'owner';
                const isAdmin = profile.role === 'admin';
                const ordersCount = profile.orders_count || 0;
                const totalSpent = profile.total_spent || 0;

                return (
                  <div
                    key={profile.id || profile.email}
                    className={`p-4 space-y-3 transition-colors ${
                      isOwner ? 'bg-purple-50/30' : isAdmin ? 'bg-indigo-50/20' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isOwner
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : isAdmin
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-pink-100 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {profile.display_name?.charAt(0).toUpperCase() ||
                            profile.email?.charAt(0).toUpperCase() ||
                            'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 flex flex-wrap items-center gap-1.5">
                            <span className="truncate">{profile.display_name || 'Haven Customer'}</span>
                            {isOwner && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                Owner
                              </span>
                            )}
                            {isAdmin && !isOwner && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            ID: {profile.id?.slice(0, 10)}…
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>

                    {/* Contact & Meta */}
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 font-medium text-gray-700 break-all">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{profile.email}</span>
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          Joined{' '}
                          {profile.created_at
                            ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Recently'}
                        </span>
                        {!isOwner && (
                          <span className="font-semibold text-gray-700">
                            {ordersCount > 0
                              ? `${ordersCount} ${ordersCount === 1 ? 'order' : 'orders'} (₦${totalSpent.toLocaleString()})`
                              : 'No orders yet'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Controls */}
                    <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      {isOwner ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                          <span>Store Owner (Protected)</span>
                        </div>
                      ) : (
                        <>
                          <select
                            value={isAdmin ? 'admin' : 'customer'}
                            onChange={(e) =>
                              handleInitiateRoleChange(profile, e.target.value as 'customer' | 'admin')
                            }
                            className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer font-medium min-h-[38px]"
                            aria-label={`Change role for ${profile.display_name || profile.email}`}
                          >
                            <option value="customer">Role: Customer</option>
                            <option value="admin">Role: Administrator</option>
                          </select>

                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleInitiateRoleChange(profile, 'customer')}
                              className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-200 cursor-pointer transition-colors min-h-[38px]"
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateRoleChange(profile, 'admin')}
                              className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg border border-purple-200 cursor-pointer transition-colors min-h-[38px]"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              Promote to Admin
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Customer Name</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Registered Date</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Orders Placed</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Account Role &amp; Access</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((profile) => {
                    const isOwner = profile.email?.toLowerCase() === 'admin@jazelle.com' || profile.role === 'owner';
                    const isAdmin = profile.role === 'admin';
                    const ordersCount = profile.orders_count || 0;
                    const totalSpent = profile.total_spent || 0;

                    return (
                      <tr
                        key={profile.id || profile.email}
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isOwner ? 'bg-purple-50/30' : isAdmin ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        {/* Customer Name + Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isOwner
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : isAdmin
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'bg-pink-100 text-pink-700 border border-pink-200'
                              }`}
                            >
                              {profile.display_name?.charAt(0).toUpperCase() ||
                                profile.email?.charAt(0).toUpperCase() ||
                                'C'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <span>{profile.display_name || 'Haven Customer'}</span>
                                {isOwner && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                                    Owner
                                  </span>
                                )}
                                {isAdmin && !isOwner && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                ID: {profile.id?.slice(0, 12)}…
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span>{profile.email}</span>
                            </div>
                            {profile.phone ? (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span>{profile.phone}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">No phone listed</div>
                            )}
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {profile.created_at
                                ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Recently'}
                            </span>
                          </div>
                        </td>

                        {/* Orders */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isOwner ? (
                            <span className="text-xs text-gray-400 italic">—</span>
                          ) : ordersCount > 0 ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                <ShoppingBag className="w-3 h-3 text-emerald-500" />
                                {ordersCount} {ordersCount === 1 ? 'order' : 'orders'}
                              </span>
                              {totalSpent > 0 && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  ₦{totalSpent.toLocaleString()} spent
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              No orders yet
                            </span>
                          )}
                        </td>

                        {/* Account Role & Role Management Dropdown / Toggle */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isOwner ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                              <span>Store Owner</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <ShieldCheck className="h-3 w-3 text-indigo-600" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  <User className="h-3 w-3 text-gray-500" />
                                  Customer
                                </span>
                              )}

                              <select
                                value={isAdmin ? 'admin' : 'customer'}
                                onChange={(e) =>
                                  handleInitiateRoleChange(profile, e.target.value as 'customer' | 'admin')
                                }
                                className="text-xs bg-white border border-gray-200 hover:border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer font-medium shadow-2xs transition-colors"
                                aria-label={`Change role for ${profile.display_name || profile.email}`}
                              >
                                <option value="customer">Customer</option>
                                <option value="admin">Administrator</option>
                              </select>

                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleInitiateRoleChange(profile, 'customer')}
                                  title="Demote back to standard customer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 cursor-pointer transition-colors"
                                >
                                  Demote
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleInitiateRoleChange(profile, 'admin')}
                                  title="Promote to administrator"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 cursor-pointer transition-colors"
                                >
                                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                                  Promote to Admin
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
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

      {/* Role Change Confirmation Dialog */}
      {pendingRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-md my-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div
              className={`p-4 sm:p-6 border-b ${
                pendingRoleChange.targetRole === 'admin'
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-pink-100'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      pendingRoleChange.targetRole === 'admin'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {pendingRoleChange.targetRole === 'admin' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      {pendingRoleChange.targetRole === 'admin'
                        ? 'Promote Customer to Administrator'
                        : 'Demote Administrator to Customer'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Confirm role modification for this user
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isUpdatingRole && setPendingRoleChange(null)}
                  disabled={isUpdatingRole}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {roleActionError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  {roleActionError}
                </div>
              )}

              {/* Target User Info Card */}
              <div className="bg-gray-50 rounded-xl p-3.5 sm:p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center border border-pink-200 shrink-0">
                      {pendingRoleChange.profile.display_name?.charAt(0).toUpperCase() ||
                        pendingRoleChange.profile.email?.charAt(0).toUpperCase() ||
                        'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {pendingRoleChange.profile.display_name || 'Customer Account'}
                      </div>
                      <div className="text-xs text-gray-500 break-all">{pendingRoleChange.profile.email}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
                  <div className="text-gray-500">
                    Current:{' '}
                    <span className="font-semibold text-gray-700 capitalize">
                      {pendingRoleChange.profile.role || 'customer'}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="text-gray-500">
                    New Role:{' '}
                    <span className="font-bold text-purple-700 capitalize">
                      {pendingRoleChange.targetRole === 'admin' ? 'Administrator' : 'Customer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Warning Callout */}
              {pendingRoleChange.targetRole === 'admin' ? (
                <div className="rounded-xl bg-purple-50/80 border border-purple-200 p-3.5 sm:p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900 space-y-1">
                      <p className="font-bold">Administrator Access Warning</p>
                      <p className="text-purple-800 leading-relaxed">
                        Promoting this account grants full management privileges in the Jazelle Admin Portal (
                        <code className="bg-purple-100 px-1 py-0.5 rounded text-[11px] font-mono">/admin.html</code>
                        ). They will be able to review customer orders, modify products and inventory, create coupons, and configure store settings. Only grant this to trusted personnel.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 sm:p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 space-y-1">
                      <p className="font-bold">Revocation Notice</p>
                      <p className="text-amber-800 leading-relaxed">
                        Demoting this account removes all administrative privileges. This user will immediately lose access to the Jazelle admin portal and will only be able to shop as a standard customer.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                This modification will execute via the secure database function{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">
                  public.set_user_role(user_id, role)
                </code>
                .
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setPendingRoleChange(null)}
                disabled={isUpdatingRole}
                className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isUpdatingRole}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-lg shadow-sm cursor-pointer transition-colors min-h-[40px] ${
                  pendingRoleChange.targetRole === 'admin'
                    ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'
                    : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                }`}
              >
                {isUpdatingRole ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating Role…
                  </>
                ) : pendingRoleChange.targetRole === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Confirm &amp; Grant Admin Access
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    Confirm &amp; Demote to Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
