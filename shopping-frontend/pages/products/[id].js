import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ShoppingBag, Minus, Plus, Sparkles, ChevronRight, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        if (!cancelled) setProduct(data.product);
        const [rec, feat] = await Promise.all([
          api.get(`/ai/recommendations?productId=${id}&limit=4`).catch(() => null),
          api.get('/products/featured').catch(() => null),
        ]);
        if (!cancelled) {
          setRelated(rec?.data?.products?.length ? rec.data.products : (feat?.data?.products || []));
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(errorMessage(err, 'Product not found'));
          router.push('/products');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await add(product, qty);
      toast.success(`Added ${qty} × ${product.name}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add to cart'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="card aspect-square animate-pulse bg-slate-100" />
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const discount = product.compare_at_price
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price)) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-400">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <ChevronRight size={14} />
        <Link href="/products" className="hover:text-brand-600">Products</Link>
        <ChevronRight size={14} />
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-600">
          {product.category}
        </Link>
        <ChevronRight size={14} />
        <span className="truncate text-slate-600">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Image */}
        <div className="card overflow-hidden">
          <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" />
        </div>

        {/* Info */}
        <div className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            {product.brand} · {product.category}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900">{product.name}</h1>
          <div className="mt-3">
            <StarRating rating={product.rating} count={product.review_count} size={16} />
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-slate-900">${Number(product.price).toFixed(2)}</span>
            {product.compare_at_price && (
              <>
                <span className="text-lg text-slate-400 line-through">${Number(product.compare_at_price).toFixed(2)}</span>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          <p className="mt-4 leading-relaxed text-slate-600">{product.description}</p>

          {product.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-500">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Availability:{' '}
                <span className={product.stock > 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                  {product.stock > 0 ? `In stock (${product.stock} available)` : 'Out of stock'}
                </span>
              </p>
              <p className="text-xs text-slate-400">Ships in 1–3 days</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-slate-500 hover:text-brand-600" aria-label="Decrease quantity">
                  <Minus size={15} />
                </button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="p-3 text-slate-500 hover:text-brand-600"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button onClick={handleAdd} disabled={adding || product.stock <= 0} className="btn-primary flex-1 py-3">
                <ShoppingBag size={17} />
                {adding ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Truck, t: 'Free shipping', s: 'over $100' },
              { icon: ShieldCheck, t: 'Secure payment', s: 'Stripe' },
              { icon: RotateCcw, t: '30-day returns', s: 'easy' },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-slate-200 bg-white p-3">
                <f.icon size={18} className="mx-auto text-brand-600" />
                <p className="mt-1.5 text-xs font-bold text-slate-800">{f.t}</p>
                <p className="text-[11px] text-slate-400">{f.s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI recommendations */}
      {related.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-brand-600" />
            <h2 className="text-lg font-extrabold text-slate-900">You may also like — AI picks</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
