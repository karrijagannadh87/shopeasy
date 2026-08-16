import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';

export default function RegisterPage() {
  const router = useRouter();
  const register_ = useAuthStore((s) => s.register);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (values) => {
    if (values.password !== values.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register_(values.name, values.email, values.password);
      window.dispatchEvent(new Event('shopeasy:login'));
      useCartStore.getState().mergeGuestCart();
      toast.success('Account created! 🎉');
      router.push('/');
    } catch (err) {
      toast.error(errorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <UserPlus size={22} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-slate-900">Create your account</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          JWT + bcrypt protected — your cart follows you everywhere.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" {...register('name', { required: true, minLength: 2 })} placeholder="Jane Doe" />
            {errors.name && <p className="mt-1 text-xs text-rose-500">Name is required</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email', { required: true })} placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">Email is required</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" {...register('password', { required: true, minLength: 6 })} placeholder="At least 6 characters" />
            {errors.password && <p className="mt-1 text-xs text-rose-500">Minimum 6 characters</p>}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="password" className="input" {...register('confirm', { required: true })} placeholder="Repeat password" />
            {errors.confirm && <p className="mt-1 text-xs text-rose-500">Please confirm your password</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
