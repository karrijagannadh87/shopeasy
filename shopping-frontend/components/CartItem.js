import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export default function CartItem({ item }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="card flex gap-4 p-4">
      <Link href={`/products/${item.product_id ?? item.productId}`} className="shrink-0">
        <img
          src={item.image_url}
          alt={item.name}
          className="h-24 w-24 rounded-xl object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/products/${item.product_id ?? item.productId}`}
              className="text-sm font-semibold text-slate-900 hover:text-brand-600"
            >
              {item.name}
            </Link>
            <p className="text-xs text-slate-400">{item.category || 'ShopEasy'}</p>
          </div>
          <button
            onClick={() => remove(item.product_id ?? item.productId)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Remove"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200">
            <button
              onClick={() => updateQuantity(item.product_id ?? item.productId, Number(item.quantity) - 1)}
              className="p-2 text-slate-500 hover:text-brand-600"
              aria-label="Decrease"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.product_id ?? item.productId, Number(item.quantity) + 1)}
              className="p-2 text-slate-500 hover:text-brand-600"
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="text-base font-bold text-slate-900">
            ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
