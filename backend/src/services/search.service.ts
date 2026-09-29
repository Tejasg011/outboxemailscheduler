import { elastic, EMAIL_INDEX } from '../config/elasticsearch.js';

export async function ensureEmailIndex() {
  const exists = await elastic.indices.exists({ index: EMAIL_INDEX });
  if (!exists) {
    await elastic.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          userId: { type: 'keyword' },
          recipient: { type: 'text' },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
        },
      },
    });
  }
}

export async function indexEmail(job: any) {
  try {
    await elastic.index({
      index: EMAIL_INDEX,
      id: job.id,
      document: {
        id: job.id,
        userId: job.user_id,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
        status: job.status,
        scheduledAt: job.scheduled_at,
        sentAt: job.sent_at,
      },
      refresh: 'wait_for',
    });
  } catch (error) {
    console.error('Elasticsearch indexing failed:', error);
  }
}

export async function searchEmails(userId: string, q: string) {
  const result = await elastic.search({
    index: EMAIL_INDEX,
    query: {
      bool: {
        must: [{ multi_match: { query: q, fields: ['recipient', 'subject', 'body'] } }],
        filter: [{ term: { userId } }],
      },
    },
    sort: [{ scheduledAt: 'desc' }],
  });
  return result.hits.hits.map((hit: any) => hit._source);
}
