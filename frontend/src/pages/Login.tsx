import { api } from '../services/api';

const devBypass = import.meta.env.VITE_DEV_BYPASS === 'true';

export function Login() {
  async function login() {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  }
  async function devLogin() {
    try {
      await api.post('/auth/dev-login');
      window.location.reload();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Dev login failed');
    }
  }
  return <main className="min-h-screen flex items-center justify-center p-6"><div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md shadow-sm text-center"><div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-5">O</div><h1 className="text-2xl font-bold">Outbox Email Scheduler</h1><p className="text-slate-500 mt-2 mb-7">Sign in to schedule and monitor email jobs.</p><button onClick={login} className="w-full bg-slate-900 text-white rounded-lg py-3 hover:bg-slate-800">Continue with Google</button>{devBypass && <button onClick={devLogin} className="w-full mt-3 bg-indigo-600 text-white rounded-lg py-3 hover:bg-indigo-500">Dev Login (bypass)</button>}</div></main>;
}
