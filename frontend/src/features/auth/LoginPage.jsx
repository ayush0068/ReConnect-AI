import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema } from './auth.schemas.js';
import apiClient from '../../lib/apiClient.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const [serverError, setServerError] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      const res = await apiClient.post('/auth/login', data);
      localStorage.setItem('accessToken', res.data.data.accessToken);
      navigate('/'); // redirect to role-specific dashboard once those routes exist
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Sign in failed. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-trust mb-2">Sign in</p>
        <h1 className="font-display text-2xl mb-8">Welcome back.</h1>

        {justRegistered && !serverError && (
          <div className="mb-5 rounded-xl border border-verified/30 bg-verified/10 px-4 py-3 text-sm text-verified">
            Account created — sign in to continue.
          </div>
        )}
        {serverError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm text-ink-soft mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-ink-soft mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm focus:border-trust transition-colors duration-200"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-trust text-paper py-2.5 rounded-full shadow-soft hover:bg-trust-deep transition-colors duration-200 disabled:opacity-60"
          >
            Sign in
          </motion.button>
        </form>

        <p className="text-sm text-ink-faint mt-6">
          New here?{' '}
          <Link to="/register" className="text-trust hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}