import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { ArrowRight, Sparkles, Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';
import api, { errorMessage } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useAuthStore } from '@/store/authStore';

const HERO_SLIDES = [
  {
    kicker: 'Summer Sale',
    title: 'Up to 40% off electronics',
    subtitle: 'Headphones, smartwatches, cameras — gear up for less.',
    cta: 'Shop Electronics',
    href: '/products?category=Electronics',
    emoji: '🎧',
    bg: 'from-brand-700 via-brand-600 to-indigo-500',
  },
  {
    kicker: 'AI Picks',
    title: 'Let AI find your perfect match',
    subtitle: 'Ask the ShopEasy assistant anything — “yoga mats under $60”.',
    cta: 'Try the assistant',
    href: '#ai',
    emoji: '🤖',
    bg: 'from-slate-800 via-slate-700 to-brand-900',
  },
  {
    kicker: 'New Season',
    title: 'Fresh fashion drops',
    subtitle: 'Sneakers, bags & accessories everyone is talking about.',
    cta: 'Shop Fashion',
    href: '/products?category=Fashion',
    emoji: '👟',
    bg: 'from-rose-600 via-rose-500 to-orange-400',
  },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      try {
        const [feat, cats] = await Promise.all([
          api.get('/products/featured'),
          api.get('/products/categories'),
        ]);
        setFeatured(feat.data.products);
        setCategories(cats.data.categories);
      } catch (err) {
        console.error(errorMessage(err));
      }
      try {
        const rec = await api.get('/ai/recommendations?limit=8');
        if (rec.data.products?.length) setRecommended(rec.data.products);
      } catch {
        /* AI row is optional */
      }
      setLoading(false);
    })();
  }, []);

  const aiRow = recommended.length ? recommended : featured;

  return (
    <div>
      {/* ── Hero carousel ── */}
      <section className="bg-slate-900">
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          className="h-[420px]"
        >
          {HERO_SLIDES.map((s, i) => (
            <SwiperSlide key={i}>
              <div className={`flex h-full items-center bg-gradient-to-r ${s.bg}`}>
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-10">
                  <div className="max-w-xl">
                    <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
                      {s.kicker}
                    </p>
                    <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                      {s.title}
                    </h1>
                    <p className="mt-4 text-lg text-white/80">{s.subtitle}</p>
                    <Link
                      href={s.href}
                      className="btn mt-6 bg-white text-slate-900 hover:bg-slate-100"
                    >
                      {s.cta} <ArrowRight size={16} />
                    </Link>
                  </div>
                  <span className="hidden text-[9rem] leading-none drop-shadow-2xl md:block">
                    {s.emoji}
                  </span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* ── Perks ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 md:grid-cols-4">
          {[
            { icon: Truck, title: 'Free shipping', sub: 'On orders over $100' },
            { icon: ShieldCheck, title: 'Secure checkout', sub: 'Stripe powered' },
            { icon: RotateCcw, title: '30-day returns', sub: 'No questions asked' },
            { icon: Headphones, title: 'AI support', sub: '24/7 assistant' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon size={19} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{f.title}</p>
                <p className="text-xs text-slate-500">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Shop by category</h2>
          <Link href="/products" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <Link key={c.category} href={`/products?category=${encodeURIComponent(c.category)}`} className="chip">
              {c.category} <span className="ml-1 text-xs text-slate-400">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <h2 className="text-xl font-extrabold text-slate-900">Featured products</h2>
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ── AI recommendations ── */}
      <section id="ai" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow">
            <Sparkles size={17} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Picked for you by AI
            </h2>
            <p className="text-sm text-slate-500">
              {user
                ? `Based on your order history${recommended.length ? '' : ' (and top-rated picks)'} — via MCP + Claude`
                : 'Top-rated picks, personalized once you sign in — via MCP'}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {aiRow.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-violet-600 px-8 py-12 text-center text-white shadow-xl">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Not sure what to buy? Ask the AI assistant 🤖
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            “Recommend a gift under $80” · “Show me sneakers over $100” ·
            “Track order SHOP-…”
          </p>
          <button
            onClick={() => window.dispatchEvent(new Event('shopeasy:open-ai'))}
            className="btn mt-6 bg-white text-brand-700 hover:bg-slate-100"
          >
            <Sparkles size={16} /> Chat with ShopEasy AI
          </button>
        </div>
      </section>
    </div>
  );
}
