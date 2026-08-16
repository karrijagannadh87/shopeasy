import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { CreditCard, Lock, ShoppingBag, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => (user ? s.items : s.guestItems));
  const sync = useCartStore((s) => s.sync);
  const [placing, setPlacing] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      fullName: user?.name || '',
      email: user?.email || '',
      address: '',
      city: '',
      zip: '',
      country: 'US',
    },
  });

  useEffect(() => {
    if (user) sync();
  }, [user, sync]);

  const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const shipping = subtotal >= 100 ? 0 : 4.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-4xl">🛒</p>
        <h1 className="mt-4 text-2xl font-extrabold">Nothing to check out</h1>
        <p className="mt-2 text-slate-500">Your cart is empty — add some products first.</p>
        <Link href="/products" className="btn-primary mt-6">Browse products</Link>
      </div>
    );
  }

  const onSubmit = async (address) => {
    setPlacing(true);
    try {
      // 1. Create the order (server resolves prices & stock).
      const payload = user
        ? { shipping_address: address }
        : {
            items: items.map((i) => ({
              product_id: i.product_id ?? i.productId,
              quantity: i.quantity,
            })),
            shipping_address: address,
          };
      const { data } = await api.post('/orders', payload);
      const orderNumber = data.order_number;
      // Order created — the cart is now "in flight"; clear it locally so it
      // doesn't show stale items when the user returns.
      useCartStore.getState().clear();

      // 2. Get the payment checkout (Stripe session or demo URL).
      const pay = await api.post('/payments/checkout', { order_number: orderNumber });
      const checkout = pay.data.checkout;

      // 3. Redirect — Stripe hosted checkout, or local demo page.
      window.location.href = checkout.url;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start checkout'));
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Back to cart
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Shipping */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">1</span>
              Shipping address
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Full name *</label>
                <input className="input" {...register('fullName', { required: true })} placeholder="Jane Doe" />
                {errors.fullName && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email *</label>
                <input className="input" type="email" {...register('email', { required: true })} placeholder="jane@example.com" />
                {errors.email && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address *</label>
                <input className="input" {...register('address', { required: true })} placeholder="123 Market Street" />
                {errors.address && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>
              <div>
                <label className="label">City *</label>
                <input className="input" {...register('city', { required: true })} placeholder="San Francisco" />
                {errors.city && <p className="mt-1 text-xs text-rose-500">Required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ZIP</label>
                  <input className="input" {...register('zip')} placeholder="94103" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <select className="input" {...register('country')}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="IN">India</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">2</span>
              Payment
            </h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <CreditCard size={22} className="shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-bold text-slate-800">Card (via Stripe)</p>
                <p className="text-xs text-slate-500">
                  You'll be redirected to a secure Stripe Checkout page.
                  {!user && ' Demo mode: payment is simulated — no real charge.'}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Lock size={12} /> Your payment details never touch this server.
            </p>
          </div>

          <button type="submit" disabled={placing} className="btn-primary w-full py-3.5 text-base">
            {placing ? 'Processing…' : `Pay $${total.toFixed(2)} securely`}
          </button>
        </form>

        {/* Summary */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <ShoppingBag size={18} className="text-brand-600" /> Your order
            </h2>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.product_id ?? item.productId} className="flex items-center gap-3">
                  <img src={item.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Subtotal</dt><dd className="font-semibold">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Shipping</dt><dd className="font-semibold">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Tax</dt><dd className="font-semibold">${tax.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold">
                <dt>Total</dt><dd>${total.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
