import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Package, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-600',
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get('/orders')
      .then(({ data }) => setOrders(data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Sign in to see your orders</h1>
        <p className="mt-2 text-slate-500">Order history is tied to your account.</p>
        <Link href="/auth/login" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Order history</h1>
      <p className="mt-1 text-sm text-slate-500">All your orders in one place.</p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card mt-6 py-20 text-center">
          <Package size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">No orders yet</h3>
          <p className="mt-1 text-sm text-slate-500">When you place an order, it will show up here.</p>
          <Link href="/products" className="btn-primary mt-5">
            Start shopping <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.order_number}`}
              className="card block p-5 transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">{order.order_number}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}{' '}
                    · {order.items_count ?? ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[order.status] || STATUS_STYLES.pending}`}>
                    {order.status}
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
