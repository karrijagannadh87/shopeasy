import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Package, ClipboardList, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const TABS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
];

export default function AdminLayout({ children, title }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-4xl">🔐</p>
        <h1 className="mt-4 text-xl font-extrabold">Admins only</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with the admin account (admin@shopeasy.dev / admin123) to manage the store.
        </p>
        <Link href="/auth/login?redirect=/admin" className="btn-primary mt-5">Sign in as admin</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Back to store
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{title || 'Admin dashboard'}</h1>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.exact ? router.pathname === t.href : router.pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand-600 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-400'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
