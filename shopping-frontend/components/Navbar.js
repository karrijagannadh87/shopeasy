import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ShoppingBag, Search, User, LogOut, LayoutDashboard, Sparkles, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onLogout = () => toast('Signed out', { icon: '👋' });
    window.addEventListener('shopeasy:logout', onLogout);
    return () => window.removeEventListener('shopeasy:logout', onLogout);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    router.push(`/products?search=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  };

  const links = (
    <>
      <Link href="/products" className="text-sm font-medium text-slate-600 hover:text-brand-600">
        Shop All
      </Link>
      <Link href="/orders" className="text-sm font-medium text-slate-600 hover:text-brand-600">
        Orders
      </Link>
      {user?.role === 'admin' && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <LayoutDashboard size={15} /> Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShoppingBag size={18} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Shop<span className="text-brand-600">Easy</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden flex-1 md:flex md:max-w-xl">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, e.g. wireless headphones…"
              className="input pl-10"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-4 lg:flex">{links}</div>

          <Link href="/cart" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Cart">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1">
              <span className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <User size={14} />
                </span>
                {user.name.split(' ')[0]}
              </span>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/auth/login" className="btn-ghost">Sign in</Link>
              <Link href="/auth/register" className="btn-primary">Sign up</Link>
            </div>
          )}

          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <form onSubmit={submitSearch} className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className="input pl-10"
              />
            </div>
          </form>
          <div className="flex flex-col gap-3">{links}</div>
          {!user && (
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <Link href="/auth/login" className="btn-outline flex-1">Sign in</Link>
              <Link href="/auth/register" className="btn-primary flex-1">Sign up</Link>
            </div>
          )}
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="flex items-center justify-center gap-1.5 bg-brand-600 py-1 text-[11px] font-semibold text-white">
          <Sparkles size={11} /> Admin mode — you can manage products & orders
        </div>
      )}
    </header>
  );
}
