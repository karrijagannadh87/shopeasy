import { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import CartItem from '@/components/CartItem';

export default function CartPage() {
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => (user ? s.items : s.guestItems));
  const sync = useCartStore((s) => s.sync);
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    if (user) sync();
  }, [user, sync]);

  const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 4.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <ShoppingBag size={34} />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-500">Browse the store and add something you love.</p>
        <Link href="/products" className="btn-primary mt-6">
          Start shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Shopping cart</h1>
        <button onClick={clear} className="flex items-center gap-1 text-sm text-slate-400 hover:text-rose-600">
          <Trash2 size={14} /> Clear cart
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {user ? 'Synced to your account' : 'Guest cart — sign in to sync it across devices'}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <CartItem key={item.product_id ?? item.productId} item={item} />
          ))}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card p-5">
            <h2 className="text-lg font-extrabold text-slate-900">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Subtotal</dt>
                <dd className="font-semibold">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Shipping</dt>
                <dd className="font-semibold">{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Tax (8%)</dt>
                <dd className="font-semibold">${tax.toFixed(2)}</dd>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between text-base font-extrabold text-slate-900">
                  <dt>Total</dt>
                  <dd>${total.toFixed(2)}</dd>
                </div>
              </div>
            </dl>
            <Link href="/checkout" className="btn-primary mt-5 w-full py-3">
              Proceed to checkout <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              🔒 Demo store — no real money is charged.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
