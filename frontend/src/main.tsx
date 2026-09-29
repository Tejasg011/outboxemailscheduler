import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { api } from './services/api';
import type { User } from './types';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/auth/me').then(({data})=>setUser(data.user)).catch(()=>setUser(null)).finally(()=>setLoading(false)); }, []);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!user) return <Login/>;
  async function logout() { await api.post('/auth/logout'); setUser(null); }
  return <Dashboard user={user} onLogout={logout}/>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
