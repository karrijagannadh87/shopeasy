import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Star, Search } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import api, { errorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', description: '', price: '', compare_at_price: '', category: 'Electronics',
  brand: '', stock: '10', featured: false, image_url: '', tags: '',
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/products?limit=48')
      .then(({ data }) => setProducts(data.products))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, price: String(p.price),
      compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '',
      category: p.category, brand: p.brand || '', stock: String(p.stock),
      featured: p.featured, image_url: p.image_url, tags: (p.tags || []).join(', '),
    });
    setImageFile(null);
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, String(v)));
      if (imageFile) body.append('image', imageFile);
      if (editing) {
        await api.put(`/admin/products/${editing.id}`, body);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', body);
        toast.success('Product created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Delete failed'));
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleFeatured = () => setForm({ ...form, featured: !form.featured });

  return (
    <AdminLayout title="Manage products">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="input pl-9" />
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No products found</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.brand}{p.featured ? ' · ⭐ featured' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.category}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">${Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock <= 5 ? 'bg-rose-100 text-rose-600' : p.stock <= 20 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" /> {p.rating}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">{editing ? 'Edit product' : 'Add product'}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="mt-5 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-24" value={form.description} onChange={set('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price *</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
                </div>
                <div>
                  <label className="label">Compare-at price</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.compare_at_price} onChange={set('compare_at_price')} />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" value={form.category} onChange={set('category')}>
                    {['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Books'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Brand</label>
                  <input className="input" value={form.brand} onChange={set('brand')} />
                </div>
                <div>
                  <label className="label">Stock *</label>
                  <input className="input" type="number" min="0" value={form.stock} onChange={set('stock')} />
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input className="input" value={form.tags} onChange={set('tags')} placeholder="audio, wireless" />
                </div>
              </div>
              <div>
                <label className="label">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0] || null)}
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-600"
                />
                {!imageFile && form.image_url && (
                  <img src={form.image_url} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={form.featured} onChange={toggleFeatured} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Feature on home page
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
