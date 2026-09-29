import { LogOut, Mail } from 'lucide-react';
import type { User } from '../types';

export function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <header className="bg-white border-b border-slate-200">
    <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center"><Mail size={18}/></div><div><div className="font-semibold">Outbox Email Scheduler</div><div className="text-xs text-slate-500">Email jobs</div></div></div>
      <div className="flex items-center gap-3"><img className="w-9 h-9 rounded-full" src={user.avatar_url ?? 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.name)} /><div className="hidden sm:block text-right"><div className="text-sm font-medium">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></div><button onClick={onLogout} className="text-slate-600 hover:text-slate-900" title="Logout"><LogOut size={18}/></button></div>
    </div>
  </header>;
}
