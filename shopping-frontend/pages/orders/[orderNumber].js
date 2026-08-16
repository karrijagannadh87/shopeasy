import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Package, Clock, Truck, CheckCheck, XCircle } from 'lucide-react';
import api from '@/lib/api';

// Static export (GitHub Pages demo): prerender the seeded demo orders.
// In normal dev/prod builds this route stays fully dynamic.
export async function getStaticPaths() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO !== 'true') return { paths: [], fallback: true };
  const demoData = require('@/lib/demoData.json');
  return {
    paths: demoData.demoOrders.map((o) => ({ params: { orderNumber: o.order_number } })),
    fallback: false,
  };
}

export async function getStaticProps() {
  return { props: {} };
}

const STATUS_META = {
  pending: { label: 'Pending payment', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  paid: { label: 'Paid', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  shipped: { label: 'Shipped', icon: Truck, color: 'text-blue-600 bg-blue-50' },
  delivered: { label: 'Delivered', icon: CheckCheck, color: 'text-slate-700 bg-slate-100' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-rose-600 bg-rose-50' },
};

const STEPS = ['pending', 'paid', 'shipped', 'delivered'];

export default function OrderDetail() {
  const router = useRouter();
  const { orderNumber, paid } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) return;
    api
      .get(`/orders/${orderNumber}`)
      .then(({ data }) => setOrder(data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-400">Loading order…</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-4xl">📦</p>
        <h1 className="mt-4 text-2xl font-extrabold">Order not found</h1>
        <Link href="/orders" className="btn-primary mt-5">Back to orders</Link>
      </div>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const currentStep = STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {paid === '1' && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={26} className="shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-800">Payment successful 🎉</p>
            <p className="text-sm text-emerald-700">
              {order.payment_method === 'demo'
                ? 'This was a demo payment — no real money was charged.'
                : 'Your Stripe payment was confirmed.'}
            </p>
          </div>
        </div>
      )}

      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={15} /> All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-extrabold text-slate-900">{order.order_number}</h1>
          <p className="text-sm text-slate-500">
            Placed {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold ${meta.color}`}>
          <meta.icon size={15} /> {meta.label}
        </span>
      </div>

      {/* Progress */}
      <div className="card mt-6 p-6">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = i <= currentStep;
            const m = STATUS_META[s];
            return (
              <div key={s} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                      done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-300'
                    }`}
                  >
                    {done ? <CheckCircle2 size={16} /> : <m.icon size={15} />}
                  </span>
                  <span className={`mt-1.5 text-[11px] font-semibold ${done ? 'text-brand-600' : 'text-slate-400'}`}>
                    {m.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-2 mb-5 h-0.5 flex-1 rounded ${i < currentStep ? 'bg-brand-600' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="card mt-6 p-6">
        <h2 className="text-lg font-extrabold text-slate-900">Items</h2>
        <div className="mt-4 space-y-3">
          {order.items?.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <img src={it.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{it.product_name}</p>
                <p className="text-xs text-slate-400">Qty {it.quantity}</p>
              </div>
              <span className="text-sm font-bold">${(Number(it.price) * it.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <dt>Subtotal</dt><dd className="font-semibold">${Number(order.subtotal).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Shipping</dt><dd className="font-semibold">{Number(order.shipping) === 0 ? 'FREE' : `$${Number(order.shipping).toFixed(2)}`}</dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Tax</dt><dd className="font-semibold">${Number(order.tax).toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold">
            <dt>Total</dt><dd>${Number(order.total).toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      {/* Shipping address */}
      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <Package size={18} className="text-brand-600" /> Shipping address
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          {order.shipping_address?.fullName}<br />
          {order.shipping_address?.address}<br />
          {order.shipping_address?.city}, {order.shipping_address?.zip} {order.shipping_address?.country}
        </p>
      </div>
    </div>
  );
}
