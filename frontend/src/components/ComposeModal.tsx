import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { api } from '../services/api';

function parseEmailsFromText(text: string): string[] {
  return [...new Set((text.match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi) ?? []).map(e => e.toLowerCase()))];
}

export function ComposeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientText, setRecipientText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleRecipientTextChange(text: string) {
    setRecipientText(text);
    setRecipients(parseEmailsFromText(text));
  }

  async function parseFile(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/emails/parse-leads', form);
    setRecipients(data.emails);
    setRecipientText(data.emails.join('\n'));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/emails/schedule', {
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayMs: Number(delayMs),
        hourlyLimit: Number(hourlyLimit),
        recipients,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ? JSON.stringify(err.response.data.error) : 'Could not schedule emails');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold">Compose New Email</h2>
          <button type="button" onClick={onClose}>✕</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <label className="block text-sm font-medium mb-1">Subject</label>
        <input required value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded-lg p-2.5 mb-4" placeholder="Email subject line" />

        <label className="block text-sm font-medium mb-1">Body</label>
        <textarea required value={body} onChange={e => setBody(e.target.value)} rows={5} className="w-full border rounded-lg p-2.5 mb-4" placeholder="Email body content" />

        <label className="block text-sm font-medium mb-1">Recipients</label>
        <textarea
          value={recipientText}
          onChange={e => handleRecipientTextChange(e.target.value)}
          rows={3}
          className="w-full border rounded-lg p-2.5 mb-2"
          placeholder="Type or paste email addresses (comma, space, or newline separated)&#10;e.g. alice@example.com, bob@example.com"
        />
        <div className="text-sm text-slate-500 mb-2">{recipients.length} email address(es) detected</div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-slate-400">— or —</span>
          <label className="text-sm text-indigo-600 cursor-pointer hover:underline">
            Upload CSV / TXT file
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e => parseFile(e.target.files?.[0])} className="hidden" />
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Start time</label>
            <input required type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Delay between sends (ms)</label>
            <input type="number" min="0" value={delayMs} onChange={e => setDelayMs(Number(e.target.value))} className="w-full border rounded-lg p-2 mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Hourly limit</label>
            <input type="number" min="1" value={hourlyLimit} onChange={e => setHourlyLimit(Number(e.target.value))} className="w-full border rounded-lg p-2 mt-1" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button disabled={busy || !recipients.length} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
            {busy ? 'Scheduling...' : `Schedule ${recipients.length} email(s)`}
          </button>
        </div>
      </form>
    </div>
  );
}
