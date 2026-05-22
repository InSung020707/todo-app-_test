'use client';

// Login screen — split layout: dark hero on the left, form on the right.
// The form area toggles between SignInForm and SignUpForm; both use the
// auth data layer for real Supabase authentication.

import { useState } from 'react';
import { Icon } from '@/components/shared/Icon';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

type Mode = 'signin' | 'signup';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');

  return (
    <div className="login">
      {/* Dark hero */}
      <div className="login__side">
        <div className="login__brand">
          <span className="login__brand-mark">
            <Icon name="check" size={16} strokeWidth={2.5} />
          </span>
          <span>
            demodev{' '}
            <span style={{ color: 'var(--color-gray-500)', fontWeight: 500 }}>
              · Tasks
            </span>
          </span>
        </div>

        <div className="login__hero">
          <span className="login__eyebrow">매일의 흐름</span>
          <h2 className="login__title">
            오늘 할 일에만
            <br />
            온전히 집중하세요.
          </h2>
          <p className="login__sub">
            팀과 개인의 모든 작업을 한 곳에서. 마감일, 우선순위, 서브태스크까지 —
            외주 프로젝트의 복잡한 일정을 단순하게 만들어 줍니다.
          </p>
        </div>

        <div className="login__foot">
          © 2026 demodev (대모산개발단). All rights reserved.
        </div>
      </div>

      {/* Form */}
      <div className="login__pane">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1>
              {mode === 'signin'
                ? '다시 오신 것을 환영합니다'
                : '계정을 만들어 시작하세요'}
            </h1>
            <p style={{ marginTop: 8 }}>
              {mode === 'signin'
                ? '계정에 로그인하고 오늘의 할 일을 확인하세요.'
                : '이메일과 비밀번호만으로 즉시 시작할 수 있어요.'}
            </p>
          </div>

          {mode === 'signin' ? <SignInForm /> : <SignUpForm />}

          <div className="login__signup">
            {mode === 'signin' ? (
              <>
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setMode('signup')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit',
                  }}
                >
                  무료로 시작하기
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setMode('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit',
                  }}
                >
                  로그인
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
