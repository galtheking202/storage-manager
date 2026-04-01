import { useEffect } from 'react';
import { useStore } from './store';
import ManagerPage from './components/ManagerPage';
import UserPage from './components/UserPage';
import LoginPage from './components/LoginPage';
import './App.css';

export default function App() {
  const { auth, logout, initAuth } = useStore();

  useEffect(() => {
    initAuth();
  }, []);

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
