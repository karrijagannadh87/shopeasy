import Link from 'next/link';
import { ShoppingBag, Github, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShoppingBag size={15} />
            </span>
            <span className="font-extrabold">Shop<span className="text-brand-600">Easy</span></span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Full-stack e-commerce demo — Next.js, Express, PostgreSQL, Stripe &amp; MCP-powered AI.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Shop</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/products" className="hover:text-brand-600">All products</Link></li>
            <li><Link href="/products?category=Electronics" className="hover:text-brand-600">Electronics</Link></li>
            <li><Link href="/products?category=Fashion" className="hover:text-brand-600">Fashion</Link></li>
            <li><Link href="/products?category=Beauty" className="hover:text-brand-600">Beauty</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Account</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/auth/login" className="hover:text-brand-600">Sign in</Link></li>
            <li><Link href="/auth/register" className="hover:text-brand-600">Create account</Link></li>
            <li><Link href="/orders" className="hover:text-brand-600">Order history</Link></li>
            <li><Link href="/cart" className="hover:text-brand-600">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Stack</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-1.5"><Zap size={13} className="text-brand-500" /> Next.js + Tailwind</li>
            <li className="flex items-center gap-1.5"><Zap size={13} className="text-brand-500" /> Express + PostgreSQL</li>
            <li className="flex items-center gap-1.5"><Zap size={13} className="text-brand-500" /> Stripe payments</li>
            <li className="flex items-center gap-1.5"><Zap size={13} className="text-brand-500" /> MCP + Claude AI</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ShopEasy — demo store. No real payments are processed in demo mode.
      </div>
    </footer>
  );
}
