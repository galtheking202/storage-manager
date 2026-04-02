import { useEffect, useState } from 'react';
import { useStore } from './store';
import ManagerPage from './components/ManagerPage';
import UserPage from './components/UserPage';
import LoginPage from './components/LoginPage';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

export default function App() {
  const { auth, logout, initAuth } = useStore();
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyMsg, setVerifyMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verifyToken');
    if (token) {
      setVerifyState('verifying');
      fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setVerifyState('error');
            setVerifyMsg(data.error);
          } else {
            setVerifyState('success');
            window.history.replaceState({}, '', '/');
          }
        })
        .catch(() => {
          setVerifyState('error');
          setVerifyMsg('שגיאה באימות האימייל');
        });
    } else {
      initAuth();
    }
  }, []);

  if (verifyState === 'verifying') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>🪖</span>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>מאמת כתובת אימייל...</p>
        </div>
      </div>
    );
  }

  if (verifyState === 'success') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>✓</div>
          <h2 style={{ marginTop: '0.75rem', color: '#15803d' }}>האימייל אומת בהצלחה</h2>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            כעת תוכל להתחבר לאחר אישור המנהל.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1.25rem', width: '100%', padding: '.65rem' }}
            onClick={() => setVerifyState('idle')}
          >
            עבור לכניסה
          </button>
        </div>
      </div>
    );
  }

  if (verifyState === 'error') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>✗</div>
          <h2 style={{ marginTop: '0.75rem', color: '#dc2626' }}>אימות נכשל</h2>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.9rem' }}>{verifyMsg}</p>
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: '1.25rem' }}
            onClick={() => { setVerifyState('idle'); initAuth(); }}
          >
            חזור לכניסה
          </button>
        </div>
      </div>
    );
  }

  if (!auth) return <LoginPage />;

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">🪖</span>
          <span>מחסן ציוד</span>
        </div>
        <div className="nav-right">
          <span className="nav-user">{auth.user.name}</span>
          <button className="btn btn-outline btn-sm nav-logout" onClick={logout}>
            יציאה
          </button>
        </div>
      </nav>
      <main className="main-content">
        {auth.user.role === 'manager' ? <ManagerPage /> : <UserPage />}
      </main>
    </div>
  );
}
