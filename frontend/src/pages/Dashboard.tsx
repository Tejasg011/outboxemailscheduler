import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '../services/api';
import type { EmailJob, User } from '../types';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<'scheduled'|'sent'>('scheduled'); const [emails, setEmails] = useState<EmailJob[]>([]); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [q, setQ] = useState(''); const [slack, setSlack] = useState(false);
  async function load() { setLoading(true); try { const { data } = await api.get('/emails', { params: { status: tab === 'scheduled' ? 'scheduled' : 'sent' } }); setEmails(data.emails); } finally { setLoading(false); } }
  async function checkSlack() { const { data } = await api.get('/slack/status'); setSlack(data.connected); }
  useEffect(() => { load(); checkSlack(); }, [tab]);
  async function search() { if (!q.trim()) return load(); const { data } = await api.get('/emails/search', { params: { q } }); setEmails(data.emails); }
  async function cancel(id: string) { await api.post(`/emails/${id}/cancel`); await load(); }
  async function connectSlack() { const { data } = await api.get('/slack/connect'); window.location.href = data.url; }
  async function disconnectSlack() { await api.post('/slack/disconnect'); setSlack(false); }
  return <div className="min-h-screen"><Header user={user} onLogout={onLogout}/><main className="max-w-6xl mx-auto p-5 sm:p-8"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold">Email dashboard</h1><p className="text-slate-500">Schedule, monitor and search your email jobs.</p></div><button onClick={()=>setOpen(true)} className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg"><Plus size={18}/>Compose New Email</button></div><div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-col md:flex-row gap-3"><div className="flex-1 flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search recipient, subject or body" className="flex-1 border rounded-lg px-3 py-2"/><button onClick={search} className="border rounded-lg px-3"><Search size={18}/></button></div><div className="flex gap-2"><button onClick={connectSlack} disabled={slack} className="border rounded-lg px-3 py-2 disabled:opacity-50">{slack ? 'Slack connected' : 'Connect Slack'}</button>{slack && <button onClick={disconnectSlack} className="border rounded-lg px-3 py-2">Disconnect</button>}</div></div><div className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="flex items-center justify-between border-b p-3"><div className="flex gap-1"><button onClick={()=>setTab('scheduled')} className={`px-4 py-2 rounded-lg ${tab==='scheduled'?'bg-indigo-50 text-indigo-700':''}`}>Scheduled Emails</button><button onClick={()=>setTab('sent')} className={`px-4 py-2 rounded-lg ${tab==='sent'?'bg-indigo-50 text-indigo-700':''}`}>Sent Emails</button></div><button onClick={load} className="p-2 text-slate-500"><RefreshCw size={17}/></button></div>{loading ? <div className="p-10 text-center text-slate-500">Loading...</div> : <EmailTable emails={emails} scheduled={tab==='scheduled'} onCancel={cancel}/>}</div></main>{open && <ComposeModal onClose={()=>setOpen(false)} onCreated={load}/>}</div>;
}
