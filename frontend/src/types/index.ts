export type User = { id: string; name: string; email: string; avatar_url?: string | null };
export type EmailJob = { id: string; recipient: string; subject: string; body: string; scheduled_at: string; sent_at?: string | null; status: string; error_message?: string | null };
