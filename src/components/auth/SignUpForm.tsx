'use client';

/**
 * SignUpForm — email/password signup using the auth data layer.
 *
 * On success, navigates to /main and refreshes so server components see
 * the new session. On failure, shows the Korean error in an aria-live region.
 */
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { signUpWithPassword } from '@/lib/data/auth';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signUpWithPassword({ email, password });
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
        <label htmlFor="signup-email">이메일</label>
        <div className="field field--lg">
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="login__group">
        <label htmlFor="signup-password">비밀번호 (6자 이상)</label>
        <div className="field field--lg">
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
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
        {submitting ? '가입 중…' : '가입하기'}
      </button>
    </form>
  );
}
