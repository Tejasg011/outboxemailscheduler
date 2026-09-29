import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

export const elastic = new Client({ node: env.ELASTICSEARCH_URL });
export const EMAIL_INDEX = 'emails';
