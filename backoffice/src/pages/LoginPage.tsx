import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../editor/Field';

type LocationState = { from?: string } | null;

function loginErrorText(e: unknown): string {
  if (e instanceof ApiError && e.status === 401) return 'Wrong email or password.';
  if (e instanceof ApiError && e.status === 429) return 'Too many failed tries. Wait 15 minutes, then try again.';
  if (e instanceof ApiError) return e.message;
  return 'Login failed. Try again.';
}

export function LoginPage() {
  const { token, endReason, login } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as LocationState;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to={state?.from ?? '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      email: email.trim() ? undefined : 'Email is required.',
      password: password ? undefined : 'Password is required.',
    };
    setFieldErrors(found);
    if (found.email || found.password) return;

    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(loginErrorText(err));
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <h1>Backoffice login</h1>
      {endReason === 'expired' && (
        <p className="message message--info" role="status">
          Your session has ended. Please log in again.
        </p>
      )}
      {endReason === 'logged_out' && (
        <p className="message message--info" role="status">
          You have logged out.
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
        />
        {error && (
          <p className="message message--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </main>
  );
}

