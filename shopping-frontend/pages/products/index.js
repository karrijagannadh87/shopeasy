import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Search, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

export default function ProductsPage() {
  const router = useRouter();
  const { search: urlSearch, category: urlCategory } = router.query;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sort: 'featured',
  });

  // Hydrate filters from the URL (navbar search, category chips).
  useEffect(() => {
    if (!router.isReady) return;
    setFilters((f) => ({
      ...f,
      search: typeof urlSearch === 'string' ? urlSearch : '',
      category: typeof urlCategory === 'string' ? urlCategory : '',
    }));
  }, [router.isReady, urlSearch, urlCategory]);

  useEffect(() => {
    api.get('/products/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      try {
        if (aiMode && filters.search) {
          // ✨ Smart search — natural language via the MCP AI server.
          const params = new URLSearchParams({ q: filters.search, limit: '24' });
          if (filters.category) params.set('category', filters.category);
          if (filters.minPrice) params.set('min_price', filters.minPrice);
          if (filters.maxPrice) params.set('max_price', filters.maxPrice);
          const { data } = await api.get(`/ai/search?${params}`);
          if (!cancelled) {
            setProducts(data.products || []);
            setTotal((data.products || []).length);
          }
        } else {
          const params = new URLSearchParams({ page: String(page), limit: '24', sort: filters.sort });
          if (filters.search) params.set('search', filters.search);
          if (filters.category) params.set('category', filters.category);
          if (filters.minPrice) params.set('min_price', filters.minPrice);
          if (filters.maxPrice) params.set('max_price', filters.maxPrice);
          const { data } = await api.get(`/products?${params}`);
          if (!cancelled) {
            setProducts(data.products);
            setTotal(data.total);
          }
        }
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err, 'Failed to load products'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category, filters.minPrice, filters.maxPrice, filters.sort, page, aiMode, router.isReady]);

  const pages = Math.max(1, Math.ceil(total / 24));
  const hasFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice;

  const clearFilters = () => {
    setFilters({ search: '', category: '', minPrice: '', maxPrice: '', sort: 'featured' });
    setPage(1);
    router.replace('/products');
  };

  const priceOptions = useMemo(
    () =>
      [
        { label: 'Under $50', min: '', max: '50' },
        { label: '$50 – $100', min: '50', max: '100' },
        { label: '$100 – $250', min: '100', max: '250' },
        { label: '$250+', min: '250', max: '' },
      ],
    []
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-slate-900">
        {aiMode ? '✨ AI Smart Search' : 'All products'}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {aiMode
          ? 'Describe what you want in plain English — the MCP AI server understands intent, prices & categories.'
          : `${total} products · filter by category, price & more`}
      </p>

      {/* Search + AI toggle */}
      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            placeholder={aiMode ? 'Try: “wireless headphones under $100” or “yoga gear”' : 'Search products…'}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => { setAiMode(!aiMode); setPage(1); }}
          className={`btn shrink-0 ${aiMode ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow' : 'btn-outline'}`}
        >
          <Sparkles size={15} /> AI Search
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <SlidersHorizontal size={13} /> Filters
        </span>
        <button
          onClick={() => setFilters({ ...filters, category: '' })}
          className={`chip ${!filters.category ? 'border-brand-500 text-brand-600' : ''}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.category}
            onClick={() => setFilters({ ...filters, category: filters.category === c.category ? '' : c.category })}
            className={`chip ${filters.category === c.category ? 'border-brand-500 text-brand-600' : ''}`}
          >
            {c.category}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {priceOptions.map((o) => (
          <button
            key={o.label}
            onClick={() =>
              setFilters({
                ...filters,
                minPrice: filters.minPrice === o.min && filters.maxPrice === o.max ? '' : o.min,
                maxPrice: filters.minPrice === o.min && filters.maxPrice === o.max ? '' : o.max,
              })
            }
            className={`chip ${filters.minPrice === o.min && filters.maxPrice === o.max ? 'border-brand-500 text-brand-600' : ''}`}
          >
            {o.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="input w-auto py-2"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600">
            <X size={13} /> Clear all
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center py-20 text-center">
          <p className="text-4xl">🔍</p>
          <h3 className="mt-3 text-lg font-bold text-slate-900">No products found</h3>
          <p className="mt-1 text-sm text-slate-500">Try different keywords or clear the filters.</p>
          <button onClick={clearFilters} className="btn-primary mt-5">Clear filters</button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {!aiMode && pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {[...Array(pages)].slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
                    page === i + 1
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
