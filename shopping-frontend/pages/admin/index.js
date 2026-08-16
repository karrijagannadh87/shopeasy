import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Users, Package, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import api from '@/lib/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const daily = data?.daily || [];
  const maxRevenue = Math.max(1, ...daily.map((d) => Number(d.revenue)));

  const cards = [
    { label: 'Total revenue', value: `$${Number(stats.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Orders', value: stats.orders ?? '—', icon: ShoppingCart, color: 'bg-brand-100 text-brand-600' },
    { label: 'Customers', value: stats.customers ?? '—', icon: Users, color: 'bg-violet-100 text-violet-600' },
    { label: 'Products', value: stats.products ?? '—', icon: Package, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="card flex items-center gap-4 p-5">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.color}`}>
                  <c.icon size={22} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Revenue chart */}
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <TrendingUp size={18} className="text-brand-600" /> Revenue — last 14 days
              </h2>
              {daily.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">No paid orders in this window yet.</p>
              ) : (
                <div className="mt-5 flex h-44 items-end gap-1.5">
                  {daily.map((d) => (
                    <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-brand-600 opacity-0 transition group-hover:opacity-100">
                        ${Number(d.revenue)}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition group-hover:from-brand-700"
                        style={{ height: `${Math.max(4, (Number(d.revenue) / maxRevenue) * 120)}px` }}
                        title={`${d.day}: $${Number(d.revenue)}`}
                      />
                      <span className="text-[9px] text-slate-400">
                        {new Date(d.day + 'T00:00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI insights */}
            <div className="card border-brand-100 bg-gradient-to-br from-brand-50 to-violet-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                  <Sparkles size={15} />
                </span>
                AI Analytics — written by the MCP server
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Generated via the Python MCP server{data?.aiInsights ? '' : ' (fallback)'} — Claude writes these when ANTHROPIC_API_KEY is set.
              </p>
              {data?.aiInsights?.length ? (
                <ul className="mt-4 space-y-3">
                  {data.aiInsights.map((insight, i) => (
                    <li key={i} className="flex gap-2.5 rounded-xl bg-white/80 p-3.5 text-sm text-slate-700 shadow-sm">
                      <Sparkles size={15} className="mt-0.5 shrink-0 text-brand-500" />
                      {insight}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">AI is warming up — refresh in a moment.</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Top products */}
            <div className="card p-6">
              <h2 className="text-lg font-extrabold text-slate-900">Top products by revenue</h2>
              <div className="mt-4 space-y-3">
                {data?.topProducts?.length ? (
                  data.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-700">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.units} units sold</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">${Number(p.revenue).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No sales yet.</p>
                )}
              </div>
            </div>

            {/* Low stock */}
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <AlertTriangle size={18} className="text-amber-500" /> Low stock alert
              </h2>
              <div className="mt-4 space-y-3">
                {data?.lowStock?.length ? (
                  data.lowStock.map((p) => (
                    <div key={p.name} className="flex items-center justify-between rounded-xl bg-amber-50 p-3">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${p.stock <= 5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                        {p.stock} left
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">All stock levels are healthy ✅</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
