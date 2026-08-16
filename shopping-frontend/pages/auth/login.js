import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      window.dispatchEvent(new Event('shopeasy:login'));
      useCartStore.getState().mergeGuestCart();
      toast.success('Welcome back! 👋');
      const dest = router.query.redirect || '/';
      router.push(String(dest));
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <LogIn size={22} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Sign in to sync your cart & orders.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input id="email" type="email" className="input" {...register('email', { required: true })} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">Email is required</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input id="password" type="password" className="input" {...register('password', { required: true })} placeholder="••••••••" />
            {errors.password && <p className="mt-1 text-xs text-rose-500">Password is required</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-bold text-slate-600">Demo accounts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => quickFill('demo@shopeasy.dev', 'demo123')} className="rounded-full bg-white px-3 py-1 border border-slate-200 hover:border-brand-400">
              👤 Customer — click to fill
            </button>
            <button onClick={() => quickFill('admin@shopeasy.dev', 'admin123')} className="rounded-full bg-white px-3 py-1 border border-slate-200 hover:border-brand-400">
              🛡️ Admin — click to fill
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          New here?{' '}
          <Link href="/auth/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
