'use client';

/**
 * SignInForm — email/password sign-in using the auth data layer.
 */
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { signInWithPassword } from '@/lib/data/auth';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signInWithPassword({ email, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.push('/main');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="login__form" noValidate>
      <div className="login__group">
        <label htmlFor="signin-email">이메일</label>
        <div className="field field--lg">
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="login__group">
        <label htmlFor="signin-password">비밀번호</label>
        <div className="field field--lg">
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div role="alert" aria-live="polite" style={{ minHeight: 20, color: 'var(--color-danger, #c00)' }}>
        {error}
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--lg btn--block"
        disabled={submitting}
      >
        {submitting ? '로그인 중…' : '로그인'}
      </button>
    </form>
  );
}
