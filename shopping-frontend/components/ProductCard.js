import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag, BadgePercent } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import StarRating from './StarRating';

const FALLBACK_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#eef2ff"/><text x="50%" y="50%" fill="#818cf8" font-family="sans-serif" font-size="20" text-anchor="middle">ShopEasy</text></svg>`
  );

export default function ProductCard({ product }) {
  const add = useCartStore((s) => s.add);
  const [imgError, setImgError] = useState(false);

  const discount = product.compare_at_price
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await add(product, 1);
      toast.success(`Added “${product.name}” to cart`);
    } catch {
      toast.error('Could not add to cart');
    }
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={imgError ? FALLBACK_IMG : product.image_url}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            <BadgePercent size={12} /> {discount}% OFF
          </span>
        )}
        {product.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {product.category} · {product.brand}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-600">
          {product.name}
        </h3>
        <div className="mt-1.5">
          <StarRating rating={product.rating} count={product.review_count} />
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <span className="text-lg font-extrabold text-slate-900">
              ${Number(product.price).toFixed(2)}
            </span>
            {product.compare_at_price && (
              <span className="ml-1.5 text-sm text-slate-400 line-through">
                ${Number(product.compare_at_price).toFixed(2)}
              </span>
            )}
            <p className="text-[11px] text-slate-400">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="rounded-lg bg-brand-50 p-2.5 text-brand-600 transition hover:bg-brand-600 hover:text-white disabled:opacity-40"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag size={17} />
          </button>
        </div>
      </div>
    </Link>
  );
}
