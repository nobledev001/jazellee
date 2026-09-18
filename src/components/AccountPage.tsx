import { useEffect, useState } from 'react';
import { Package, MapPin, Heart, User as UserIcon, LogOut, Plus, Trash2, Check, Edit2, X, Truck, Clock, CheckCircle2, Home, ArrowRight } from 'lucide-react';
import { useAuth, supabase, getDisplayName } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';
import { getProduct } from '@/lib/catalog';
import { formatNaira } from '@/lib/format';
import { useRouter } from '@/router';

type Tab = 'orders' | 'addresses' | 'wishlist' | 'profile';
type OrderStatus = 'placed' | 'processing' | 'shipped' | 'delivered';

interface OrderRow {
  id: string;
  order_number: string;
  items: Array<{ slug: string; name: string; price: number; quantity: number; image: string }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  created_at: string;
}

interface AddressRow {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  state: string;
  lga: string;
  landmark: string;
  is_default: boolean;
}

const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

const STATUS_STEPS: { key: OrderStatus; label: string; icon: typeof Package }[] = [
  { key: 'placed', label: 'Placed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('orders');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <main className="container-jazelle py-20 text-center"><p className="text-berry-400">Loading your account...</p></main>;
  }

  const displayName = getDisplayName(user);

  return (
    <main className="bg-cream-50 min-h-[60vh]">
      {/* Header */}
      <div className="bg-gradient-blush">
        <div className="container-jazelle py-10 sm:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush-500 text-white"><UserIcon className="h-7 w-7" /></span>
              <div>
                <h1 className="font-display text-2xl font-medium text-berry-800 sm:text-3xl">Hi, {displayName}</h1>
                <p className="text-sm text-berry-400">{user.email}</p>
              </div>
            </div>
            <button onClick={() => signOut().then(() => navigate('/'))} className="btn-secondary text-sm">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="container-jazelle py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {([
              { key: 'orders', label: 'Order History', icon: Package },
              { key: 'addresses', label: 'Addresses', icon: MapPin },
              { key: 'wishlist', label: 'Wishlist', icon: Heart },
              { key: 'profile', label: 'Profile', icon: UserIcon },
            ] as const).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${tab === item.key ? 'bg-blush-500 text-white' : 'bg-white text-berry-600 hover:bg-blush-50'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div>
            {tab === 'orders' && <OrdersTab />}
            {tab === 'addresses' && <AddressesTab />}
            {tab === 'wishlist' && <WishlistTab />}
            {tab === 'profile' && <ProfileTab />}
          </div>
        </div>
      </div>
    </main>
  );
}

function OrdersTab() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setOrders((data as OrderRow[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <Card>Loading your orders...</Card>;
  if (orders.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Package className="mx-auto h-10 w-10 text-blush-300" />
          <p className="mt-3 text-sm text-berry-400">You have not placed any orders yet.</p>
          <a href="/shop" className="btn-primary mt-4">Start Shopping <ArrowRight className="h-4 w-4" /></a>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const stepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
        return (
          <div key={order.id} className="rounded-4xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-berry-400">Order</p>
                <p className="font-bold text-berry-800">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-berry-400">{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-sm font-bold text-berry-800">{formatNaira(order.total)}</p>
              </div>
            </div>

            {/* Status bar */}
            <div className="mt-4 flex items-center gap-1">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = index <= stepIndex;
                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-blush-500 text-white' : 'bg-blush-50 text-blush-300'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`text-[0.65rem] font-medium ${active ? 'text-berry-600' : 'text-blush-200'}`}>{step.label}</span>
                    {index < STATUS_STEPS.length - 1 && <span className={`absolute`} />}
                  </div>
                );
              })}
            </div>

            {/* Items preview */}
            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
              {order.items.map((item) => (
                <img key={item.slug} src={item.image} alt={item.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
              ))}
            </div>
            <a href={`/track-order?id=${order.order_number}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blush-500 hover:text-blush-600">
              Track order <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        );
      })}
    </div>
  );
}

function AddressesTab() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AddressRow | null>(null);
  const [adding, setAdding] = useState(false);

  const load = () => {
    if (!user) return;
    supabase.from('addresses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setAddresses((data as AddressRow[]) ?? []);
      setLoading(false);
    });
  };

  useEffect(load, [user]);

  if (loading) return <Card>Loading your addresses...</Card>;

  if (adding) return <AddressForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />;
  if (editing) return <AddressForm address={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;

  return (
    <div className="space-y-4">
      <button onClick={() => setAdding(true)} className="btn-primary text-sm">
        <Plus className="h-4 w-4" /> Add new address
      </button>
      {addresses.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <MapPin className="mx-auto h-10 w-10 text-blush-300" />
            <p className="mt-3 text-sm text-berry-400">No saved addresses yet.</p>
          </div>
        </Card>
      ) : (
        addresses.map((addr) => (
          <div key={addr.id} className="rounded-4xl bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-jazelle">{addr.label}</span>
                  {addr.is_default && <span className="badge-jazelle bg-sage-100 text-sage-700">Default</span>}
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-berry-500">
                  <p className="font-medium text-berry-700">{addr.full_name}</p>
                  <p>{addr.phone}</p>
                  <p>{addr.address}</p>
                  <p>{addr.lga}, {addr.state}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(addr)} className="rounded-full p-2 text-berry-400 hover:bg-blush-50 hover:text-blush-500" aria-label="Edit"><Edit2 className="h-4 w-4" /></button>
                <button onClick={async () => { await supabase.from('addresses').delete().eq('id', addr.id); load(); }} className="rounded-full p-2 text-berry-300 hover:bg-blush-50 hover:text-blush-500" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AddressForm({ address, onCancel, onSaved }: { address?: AddressRow; onCancel: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    label: address?.label ?? 'Home',
    full_name: address?.full_name ?? '',
    phone: address?.phone ?? '',
    address: address?.address ?? '',
    state: address?.state ?? '',
    lga: address?.lga ?? '',
    landmark: address?.landmark ?? '',
    is_default: address?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    if (form.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    }
    if (address) {
      await supabase.from('addresses').update(form).eq('id', address.id);
    } else {
      await supabase.from('addresses').insert({ ...form, user_id: user.id });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSave} className="rounded-4xl bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-medium text-berry-800">{address ? 'Edit address' : 'New address'}</h3>
        <button type="button" onClick={onCancel} className="rounded-full p-2 text-berry-400 hover:bg-blush-50"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Label (e.g. Home, Office)" value={form.label} onChange={(v) => setForm({ ...form, label: v })} />
        <Input label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
        <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
        <Input label="Street address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
        <label className="block">
          <span className="text-sm font-medium text-berry-700">State</span>
          <select className="input-jazelle mt-2" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required>
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <Input label="LGA / City area" value={form.lga} onChange={(v) => setForm({ ...form, lga: v })} required />
        <Input label="Landmark (optional)" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
        <label className="flex items-center gap-2 pt-7">
          <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="h-4 w-4 rounded border-blush-300 text-blush-500" />
          <span className="text-sm text-berry-600">Set as default address</span>
        </label>
      </div>
      <div className="mt-6 flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save address'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function WishlistTab() {
  const { wishlist, toggleWishlist } = useStore();
  const products = wishlist.map(getProduct).filter(Boolean);

  if (products.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Heart className="mx-auto h-10 w-10 text-blush-300" />
          <p className="mt-3 text-sm text-berry-400">Your wishlist is empty.</p>
          <a href="/shop" className="btn-primary mt-4">Browse the shop <ArrowRight className="h-4 w-4" /></a>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {products.map((product) => product && (
        <div key={product.slug} className="flex gap-3 rounded-4xl bg-white p-4 shadow-soft">
          <a href={`/product/${product.slug}`}><img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" /></a>
          <div className="flex-1">
            <a href={`/product/${product.slug}`}><p className="text-sm font-medium text-berry-700 hover:text-blush-500">{product.name}</p></a>
            <p className="text-xs text-berry-400">{formatNaira(product.price)}</p>
            <div className="mt-2 flex gap-2">
              <a href={`/product/${product.slug}`} className="text-xs font-semibold text-blush-500">View</a>
              <button onClick={() => toggleWishlist(product.slug)} className="text-xs font-semibold text-blush-300 hover:text-blush-500">Remove</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(getDisplayName(user));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ fullName: name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8">
      <h3 className="font-display text-lg font-medium text-berry-800">Profile details</h3>
      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <Input label="Full name" value={name} onChange={setName} />
        <label className="block">
          <span className="text-sm font-medium text-berry-700">Email</span>
          <input type="email" value={user?.email ?? ''} disabled className="input-jazelle mt-2 opacity-60" />
        </label>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && (
          <p className="flex items-center gap-2 text-sm text-sage-600">
            <Check className="h-4 w-4" /> Profile updated successfully.
          </p>
        )}
      </form>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-4xl bg-white p-6 shadow-soft">{children}</div>;
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-berry-700">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-jazelle mt-2"
      />
    </label>
  );
}
