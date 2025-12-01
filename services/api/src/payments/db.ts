import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { resolve } from 'path';
import { schema } from './payment.model';

const client = createClient({
	url: process.env.TURSO_PAYMENTS_DATABASE_URL as string,
	authToken: process.env.TURSO_PAYMENTS_AUTH_TOKEN,
});
export const db = drizzle(client, { schema });
