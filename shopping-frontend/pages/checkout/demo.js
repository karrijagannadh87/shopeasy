/**
 * Demo payment page — simulates the Stripe Checkout experience when no
 * STRIPE_SECRET_KEY is configured. With real keys, users are redirected to
 * Stripe instead and never see this page.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CreditCard, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '@/lib/api';

export default function DemoCheckout() {
  const router = useRouter();
  const { order } = router.query;
  const [orderData, setOrderData] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!order) return;
    api
      .get(`/orders/${order}`)
      .then(({ data }) => setOrderData(data.order))
      .catch(() => toast.error('Order not found'));
  }, [order]);

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-4xl">🤔</p>
        <h1 className="mt-4 text-xl font-extrabold">Missing order</h1>
        <p className="mt-2 text-sm text-slate-500">No order number provided.</p>
      </div>
    );
  }

  const pay = async () => {
    setPaying(true);
    try {
      await api.post('/payments/demo-pay', { order_number: order });
      toast.success('Payment successful! 🎉');
      // Static demo (GitHub Pages) has no prerendered page for runtime order
      // numbers — the order list shows the freshly paid order instead.
      if (process.env.NEXT_PUBLIC_STATIC_DEMO === 'true') {
        router.push('/orders?paid=1');
      } else {
        router.push(`/orders/${order}?paid=1`);
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Payment failed'));
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck size={17} /> Stripe Checkout <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">DEMO</span>
            </p>
            <CreditCard size={20} />
          </div>
          <p className="mt-1 text-xs text-brand-100">
            shopeasy.dev · order {orderData?.order_number || order}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {orderData && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount due</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  ${Number(orderData.total).toFixed(2)}
                </span>
              </div>
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                {orderData.items?.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm text-slate-600">
                    <span className="truncate pr-2">{it.product_name} × {it.quantity}</span>
                    <span className="shrink-0 font-medium">${(Number(it.price) * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fake card preview */}
          <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white">
            <p className="text-xs text-slate-300">Demo card (not charged)</p>
            <p className="mt-2 font-mono text-lg tracking-widest">4242 4242 4242 4242</p>
            <div className="mt-2 flex justify-between text-xs text-slate-300">
              <span>J DOE</span><span>12/29</span>
            </div>
          </div>

          <button onClick={pay} disabled={paying} className="btn-primary w-full py-3.5">
            <Lock size={15} />
            {paying ? 'Processing…' : `Pay $${orderData ? Number(orderData.total).toFixed(2) : '…'} (demo)`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Demo mode — no real payment is processed. Add STRIPE_SECRET_KEY for live checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
