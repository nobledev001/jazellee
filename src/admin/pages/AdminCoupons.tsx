import { useEffect, useState } from 'react';
import { Ticket, Plus } from 'lucide-react';
import { supabase, type DbCoupon } from '../supabase';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<DbCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVal, setNewVal] = useState(10);
  const [newType, setNewType] = useState('percentage');

  const loadCoupons = () => {
    supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCoupons(data as DbCoupon[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    await supabase.from('coupons').insert({
      code: newCode.toUpperCase().trim(),
      description: newDesc,
      discount_type: newType,
      discount_value: newVal,
      usage_limit: 100,
      used_count: 0,
      is_active: true,
    });
    setNewCode('');
    setNewDesc('');
    setShowAdd(false);
    loadCoupons();
  };

  const toggleActive = async (coupon: DbCoupon) => {
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    loadCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Coupons & Discounts</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Create promotional codes for store discounts and beauty campaigns.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pink-500 shadow-sm w-full sm:w-auto min-h-[42px] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-pink-100 bg-pink-50/50 p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Create New Coupon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input
                type="text"
                placeholder="e.g. SELFCARE15"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase bg-white min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white min-h-[42px]"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₦)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
              <input
                type="number"
                value={newVal}
                onChange={(e) => setNewVal(Number(e.target.value))}
                required
                min={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. 15% off first order"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white min-h-[42px]"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 bg-white sm:bg-transparent border sm:border-0 border-gray-200 rounded-lg min-h-[38px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-pink-600 px-4 py-2 text-xs font-medium text-white hover:bg-pink-500 min-h-[38px] cursor-pointer"
            >
              Save Coupon
            </button>
          </div>
        </form>
      )}

      {/* Coupons List / Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading coupons…</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No coupons active yet.</div>
        ) : (
          <>
            {/* Mobile Coupon Cards (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="p-4 space-y-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-sm text-gray-900">
                      <Ticket className="h-4 w-4 text-pink-500 shrink-0" />
                      <span>{coupon.code}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      coupon.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {coupon.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-pink-600">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₦${coupon.discount_value.toLocaleString()} OFF`}
                    </span>
                    <span className="text-gray-500">
                      Redemptions: <strong>{coupon.used_count || 0}</strong> / {coupon.usage_limit || '∞'}
                    </span>
                  </div>

                  {coupon.description && (
                    <p className="text-xs text-gray-500">{coupon.description}</p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => toggleActive(coupon)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition-colors cursor-pointer min-h-[36px] ${
                        coupon.is_active
                          ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {coupon.is_active ? 'Disable Coupon' : 'Enable Coupon'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Code</th>
                    <th className="px-6 py-3 whitespace-nowrap">Discount</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 whitespace-nowrap">Redemptions</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 text-right whitespace-nowrap">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-pink-500 shrink-0" />
                          <span>{coupon.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₦${coupon.discount_value.toLocaleString()} OFF`}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{coupon.description || '—'}</td>
                      <td className="px-6 py-4 text-xs whitespace-nowrap">
                        {coupon.used_count || 0} / {coupon.usage_limit || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          coupon.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {coupon.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(coupon)}
                          className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                            coupon.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {coupon.is_active ? 'Disable' : 'Enable'}
                        </button>
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
