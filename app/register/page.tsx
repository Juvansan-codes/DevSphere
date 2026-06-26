'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      if (res.ok) {
        router.push('/login');
      } else {
        const data = await res.json();
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12 sm:px-6 lg:px-12 xl:px-20 font-sans">
      <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-8 bg-white border border-surface-container p-8 xl:p-10 2xl:p-12 rounded-2xl shadow-sm">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.svg" 
              alt="Vyora Logo" 
              className="w-8 h-8 group-hover:scale-105 transition-transform"
            />
            <span className="font-display text-headline-md font-bold text-on-surface tracking-tight">
              Vyora
            </span>
          </Link>
          <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-on-surface">
            Create your account
          </h2>
          <p className="text-sm xl:text-base text-secondary">
            Or{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
              sign in to existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6 xl:space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-6 xl:space-y-8">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="block w-full border-b border-surface-container py-3 px-1 text-on-surface placeholder-secondary/50 bg-transparent focus:border-b-2 focus:border-primary focus:outline-none transition-all text-body-md"
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full border-b border-surface-container py-3 px-1 text-on-surface placeholder-secondary/50 bg-transparent focus:border-b-2 focus:border-primary focus:outline-none transition-all text-body-md"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="block w-full border-b border-surface-container py-3 px-1 text-on-surface placeholder-secondary/50 bg-transparent focus:border-b-2 focus:border-primary focus:outline-none transition-all text-body-md"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-error font-semibold bg-error-container/30 border border-error-container px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex justify-center bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-headline-md font-semibold hover:shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center pt-4">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
