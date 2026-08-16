import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-600',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (status = filter) => {
    setLoading(true);
    api
      .get(`/admin/orders${status ? `?status=${status}` : ''}`)
      .then(({ data }) => setOrders(data.orders))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const updateStatus = async (order, status) => {
    try {
      await api.patch(`/admin/orders/${order.id}`, { status });
      toast.success(`Order ${order.order_number} → ${status}`);
      load(filter);
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <AdminLayout title="Manage orders">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setFilter(''); load(''); }}
          className={`chip ${!filter ? 'border-brand-500 text-brand-600' : ''}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); load(s); }}
            className={`chip ${filter === s ? 'border-brand-500 text-brand-600' : ''}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Change status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.order_number}`} className="font-mono font-bold text-brand-600 hover:underline">
                      {o.order_number}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{o.shipping_address?.fullName || 'Guest'}</p>
                    <p className="text-xs text-slate-400">{o.shipping_address?.city || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">${Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${o.payment_method === 'stripe' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                      {o.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[o.status] || STATUS_STYLES.pending}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className="input w-auto py-1.5 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
