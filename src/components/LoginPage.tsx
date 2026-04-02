import { useState } from 'react';
import { useStore } from '../store';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const { login, signup } = useStore();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      setSignupDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span style={{ fontSize: '3rem' }}>🪖</span>
          <h1>מחסן ציוד</h1>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            כניסה
          </button>
          <button
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            הרשמה
          </button>
        </div>

        {mode === 'login' && (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@gmail.com"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>
              <div className="form-group" style={{ marginTop: '.75rem' }}>
                <label>סיסמה</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', padding: '.65rem' }}
                disabled={loading}
              >
                {loading ? 'מתחבר...' : 'כניסה למערכת'}
              </button>
            </form>
          </>
        )}

        {mode === 'signup' && (
          <>
            {signupDone ? (
              <div className="signup-success">
                <div style={{ fontSize: '2rem' }}>✓</div>
                <p>הבקשה נשלחה בהצלחה</p>
                <p style={{ fontSize: '.85rem', color: '#6b7280', marginTop: '.35rem' }}>
                  נשלח אליך מייל לאימות הכתובת — אמת אותה ואז המתן לאישור מנהל.
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '1rem' }}
                  onClick={() => switchMode('login')}
                >
                  חזור לכניסה
                </button>
              </div>
            ) : (
              <>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSignup}>
                  <div className="form-group">
                    <label>שם מלא</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ישראל ישראלי"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '.75rem' }}>
                    <label>אימייל</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@gmail.com"
                      required
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group" style={{ marginTop: '.75rem' }}>
                    <label>סיסמה</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1.25rem', padding: '.65rem' }}
                    disabled={loading}
                  >
                    {loading ? 'שולח...' : 'שלח בקשת הרשמה'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
