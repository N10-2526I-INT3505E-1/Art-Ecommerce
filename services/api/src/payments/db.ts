import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { schema } from './payments.model';

const client = createClient({
	url: process.env.TURSO_PAYMENTS_DATABASE_URL as string,
	authToken: process.env.TURSO_PAYMENTS_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
